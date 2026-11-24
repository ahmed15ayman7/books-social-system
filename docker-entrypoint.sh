#!/bin/sh
# لو حصل خطأ في التجهيز، السيرفر بيقوم برضه ويعرض الخطأ على /api/health
# بدل ما الكونتينر يقع ويتمسح هو واللوج بتاعه.
STATUS_FILE=/tmp/startup-status.txt
: > "$STATUS_FILE"

fail() {
  echo "!! $1"
  echo "$1" >> "$STATUS_FILE"
}

for v in DATABASE_URL SOURCE_DATABASE_URL AUTH_SECRET CRON_SECRET AGENT_TOKEN; do
  eval "val=\${$v}"
  [ -z "$val" ] && fail "متغير ناقص: $v"
done

if [ -n "$DATABASE_URL" ] && ! GUARD=$(npx tsx scripts/check-system-db.ts 2>&1); then
  echo "$GUARD"
  fail "$(echo "$GUARD" | grep -v "npm notice" | grep -v "^$" | head -1) — الـmigrations اتلغت"
elif [ -n "$DATABASE_URL" ]; then
  # الـmigrations على قاعدة/schema السيستم بس (DATABASE_URL) — قاعدة المنصة مبتتلمسش
  echo "$GUARD"
  echo "→ prisma migrate deploy"
  if OUT=$(npx prisma migrate deploy 2>&1); then
    echo "$OUT" | tail -3
    echo "→ seed (settings + default templates, never overwrites edits)"
    npx tsx scripts/seed.ts 2>&1 || fail "الـseed فشل — شوف اللوج"
    if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
      npx tsx scripts/create-admin.ts "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "${ADMIN_NAME:-Admin}" 2>&1 \
        || fail "الأدمن متعملش (كلمة السر لازم 8 حروف على الأقل)"
    fi
  else
    echo "$OUT"
    fail "الـmigrations فشلت: $(echo "$OUT" | grep -E 'Error|P[0-9]{4}' | head -3 | tr '\n' ' ')"
  fi
fi

echo "→ starting on port ${PORT:-3000}"
exec node server.js
