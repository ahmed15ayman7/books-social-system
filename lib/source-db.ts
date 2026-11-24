import { Pool } from "pg";

/**
 * الملف الوحيد اللي يعرف شكل جداول المنصة (public.products وأصحابها).
 *
 * - القراءة: كل الاتصالات read-only.
 * - الكتابة الوحيدة: products.social_priority (setSocialPriority) بـUPDATE على العمود ده بس.
 * - الترتيب بيعمل JOIN مع social.book_stats و social.content_books، فلازم
 *   DATABASE_URL و SOURCE_DATABASE_URL يكونوا نفس القاعدة (السيستم في schema=social).
 */

const g = globalThis as unknown as { sourcePool?: Pool; writePool?: Pool; hasPriority?: boolean };

function pool(): Pool {
  if (!process.env.SOURCE_DATABASE_URL) throw new Error("SOURCE_DATABASE_URL مش متحدد");
  g.sourcePool ??= new Pool({
    connectionString: process.env.SOURCE_DATABASE_URL,
    max: Number(process.env.SOURCE_POOL_MAX ?? 4),
    idleTimeoutMillis: 30_000,
    options: "-c default_transaction_read_only=on",
  });
  return g.sourcePool;
}

function writePool(): Pool {
  g.writePool ??= new Pool({ connectionString: process.env.SOURCE_DATABASE_URL, max: 1, idleTimeoutMillis: 10_000 });
  return g.writePool;
}

/** اسم schema السيستم من DATABASE_URL */
export function socialSchema(): string {
  try {
    const s = new URL(process.env.DATABASE_URL ?? "").searchParams.get("schema") || "social";
    return /^[a-z_][a-z0-9_]*$/i.test(s) ? s : "social";
  } catch {
    return "social";
  }
}

/** عمود الأولوية موجود؟ (قبل ما الـmigration بتاعة المنصة تتعمل بيرجع false) */
export async function hasPriorityColumn(): Promise<boolean> {
  if (g.hasPriority) return true;
  const { rows } = await pool().query(
    `select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='social_priority'`,
  );
  g.hasPriority = rows.length > 0;
  return g.hasPriority;
}

export interface RankedBook {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string | null;
  author: string | null;
  publisher: string | null;
  imageUrl: string | null;
  year: number | null;
  language: string | null;
  category: string | null;
  priority: number;
  popularity: number; // 0..100
  recency: number; // 0..100
  score: number;
  readers: number; // إجمالي القرّاء من Open Library
  ratings: number;
  fetched: boolean;
  queuedStatus: string | null;
  queuedDate: string | null;
}

export type RankSort = "score" | "popular" | "newest" | "priority";

export interface RankQuery {
  q?: string;
  lang?: string;
  category?: string;
  sort?: RankSort;
  hideQueued?: boolean;
  page?: number;
  pageSize?: number;
  popularityWeight: number;
  minYear: number;
}

const AUTHOR_SQL = `(select string_agg(coalesce(nullif(a.name_ar,''), a.name), '، ')
                       from authors a join "_ProductAuthors" pa on pa."A" = a.id where pa."B" = p.id)`;

const AUTHOR_EN_SQL = `(select string_agg(coalesce(nullif(a.name,''), a.name_ar), ', ')
                          from authors a join "_ProductAuthors" pa on pa."A" = a.id where pa."B" = p.id)`;

export async function rankedBooks(opts: RankQuery): Promise<{ rows: RankedBook[]; total: number }> {
  const s = socialSchema();
  const prio = (await hasPriorityColumn()) ? "p.social_priority" : "0";
  const year = new Date().getFullYear();
  const w = Math.min(100, Math.max(0, opts.popularityWeight)) / 100;
  const params: unknown[] = [opts.minYear, w, year];
  const where: string[] = [
    "p.deleted_at is null",
    "p.published = true",
    "(p.publication_year is null or p.publication_year >= $1)",
  ];
  if (opts.q) {
    params.push(`%${opts.q}%`);
    const i = params.length;
    where.push(`(p.name_en ilike $${i} or p.name_ar ilike $${i} or p.isbn ilike $${i} or ${AUTHOR_SQL} ilike $${i})`);
  }
  if (opts.lang) {
    params.push(opts.lang);
    where.push(`p.language = $${params.length}`);
  }
  if (opts.category) {
    params.push(opts.category);
    where.push(`p.primary_category_id = $${params.length}`);
  }
  if (opts.hideQueued) where.push("cb.id is null");

  const order = {
    score: "score desc",
    popular: "popularity desc, score desc",
    newest: "p.publication_year desc nulls last, score desc",
    priority: "priority desc, score desc",
  }[opts.sort ?? "score"];

  const size = opts.pageSize ?? 50;
  const offset = ((opts.page ?? 1) - 1) * size;

  const sql = `
    with mx as (select greatest(max(popularity_raw), 1) m from "${s}".book_stats),
    base as (
      select p.id, p.slug, p.name_en, p.name_ar, p.image_url, p.publication_year, p.language,
             ${prio} as priority,
             coalesce(bs.popularity_raw, 0) / mx.m * 100 as popularity,
             case when p.publication_year is null then 20
                  else greatest(0, least(100, 100 - ($3 - p.publication_year) * 18)) end as recency,
             coalesce(bs.ol_want_to_read + bs.ol_reading + bs.ol_already_read, 0) as readers,
             coalesce(bs.ol_ratings, 0) + coalesce(bs.gb_ratings, 0) as ratings,
             bs.fetched_at is not null as fetched,
             cb.status::text as queued_status, to_char(cb.publish_date, 'YYYY-MM-DD') as queued_date,
             ${AUTHOR_SQL} as author,
             coalesce(nullif(pub.name_ar,''), nullif(pub.name,''), pub.title) as publisher,
             coalesce(nullif(pc.name_ar,''), pc.name) as category
        from products p
        cross join mx
        left join "${s}".book_stats bs on bs.product_id = p.id
        left join "${s}".content_books cb on cb.product_id = p.id
        left join publishers pub on pub.id = p.publisher_id
        left join product_categories pc on pc.id = p.primary_category_id
       where ${where.join(" and ")}
    )
    select *, popularity * $2 + recency * (1 - $2) + priority as score, count(*) over() as total
      from base order by ${order} limit ${size} offset ${offset}`;

  const { rows } = await pool().query(sql, params);
  return {
    total: rows[0] ? Number(rows[0].total) : 0,
    rows: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      titleEn: r.name_en,
      titleAr: r.name_ar,
      author: r.author,
      publisher: r.publisher,
      imageUrl: r.image_url,
      year: r.publication_year,
      language: r.language,
      category: r.category,
      priority: Number(r.priority),
      popularity: Math.round(Number(r.popularity)),
      recency: Math.round(Number(r.recency)),
      score: Math.round(Number(r.score)),
      readers: Number(r.readers),
      ratings: Number(r.ratings),
      fetched: r.fetched,
      queuedStatus: r.queued_status,
      queuedDate: r.queued_date,
    })),
  };
}

export async function categories(): Promise<{ id: string; name: string; count: number }[]> {
  const { rows } = await pool().query(`
    select pc.id, coalesce(nullif(pc.name_ar,''), pc.name) name, count(*)::int count
      from products p join product_categories pc on pc.id = p.primary_category_id
     where p.deleted_at is null and p.published
     group by 1,2 having count(*) >= 5 order by 3 desc`);
  return rows;
}

export interface BookDetails {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string | null;
  isbn: string | null;
  language: string | null;
  year: number | null;
  pageCount: number | null;
  imageUrl: string | null;
  shortDesc: string | null;
  shortDescAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  authors: { name: string; nameAr: string | null }[];
  publisher: { name: string; nameAr: string | null; slug: string; websiteUrl: string | null } | null;
  category: string | null;
  translationStatus: string;
}

export async function bookDetails(ids: string[]): Promise<BookDetails[]> {
  if (!ids.length) return [];
  const { rows } = await pool().query(
    `select p.*,
       (select json_agg(json_build_object('name', a.name, 'nameAr', a.name_ar)) from authors a
          join "_ProductAuthors" pa on pa."A" = a.id where pa."B" = p.id) authors,
       (select json_build_object('name', coalesce(nullif(pub.name,''), pub.title), 'nameAr', pub.name_ar,
                                 'slug', pub.slug, 'websiteUrl', pub.website_url)
          from publishers pub where pub.id = p.publisher_id) publisher_json,
       (select coalesce(nullif(pc.name_ar,''), pc.name) from product_categories pc where pc.id = p.primary_category_id) category
     from products p where p.id = any($1)`,
    [ids],
  );
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    titleEn: r.name_en,
    titleAr: r.name_ar,
    isbn: r.isbn,
    language: r.language,
    year: r.publication_year,
    pageCount: r.page_count,
    imageUrl: r.image_url,
    shortDesc: r.short_desc,
    shortDescAr: r.short_desc_ar,
    description: r.description,
    descriptionAr: r.description_ar,
    authors: r.authors ?? [],
    publisher: r.publisher_json,
    category: r.category,
    translationStatus: r.translation_status,
  }));
}

/** الكتب اللي محتاجة تحديث شهرة (عمرها ما اتجابت، أو أقدم من days يوم) */
export async function booksNeedingStats(limit: number, days = 30, minYear = 2018) {
  const s = socialSchema();
  const { rows } = await pool().query(
    `select p.id, p.isbn, p.name_en, ${AUTHOR_EN_SQL} author
       from products p left join "${s}".book_stats bs on bs.product_id = p.id
      where p.deleted_at is null and p.published
        and (p.publication_year is null or p.publication_year >= $3)
        and (bs.fetched_at is null or bs.fetched_at < now() - ($2 || ' days')::interval)
      order by bs.fetched_at nulls first, p.publication_year desc nulls last
      limit $1`,
    [limit, String(days), minYear],
  );
  return rows as { id: string; isbn: string | null; name_en: string; author: string | null }[];
}

export async function statsCoverage(minYear = 2018) {
  const s = socialSchema();
  const { rows } = await pool().query(
    `select count(*)::int total, count(bs.fetched_at)::int fetched,
            count(*) filter (where bs.popularity_raw > 0)::int found
       from products p left join "${s}".book_stats bs on bs.product_id = p.id
      where p.deleted_at is null and p.published and (p.publication_year is null or p.publication_year >= $1)`,
    [minYear],
  );
  return rows[0] as { total: number; fetched: number; found: number };
}

/** الكتابة الوحيدة في قاعدة المنصة */
export async function setSocialPriority(productId: string, priority: number) {
  if (!(await hasPriorityColumn())) {
    throw new Error("عمود social_priority لسه مش موجود في products — شغّل migration المنصة الأول");
  }
  const v = Math.max(-100, Math.min(100, Math.round(priority)));
  await writePool().query(`update products set social_priority = $1 where id = $2`, [v, productId]);
}
