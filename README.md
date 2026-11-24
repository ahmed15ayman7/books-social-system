# سيستم السوشيال ميديا — Books Platform

لوحة تحكم بتختار منها الكتب (الأشهر عالميًا والأحدث)، وتعملها طابور إنتاج، وتشوف خطة النشر في تقويم شهري، وتدوس «بدء النشر» فـClaude ينفّذ من جهازك.
مبني على [خطة منصات Books Platform](./خطة%20منصات%20Books%20Platform.md): كل كتاب = Short عربي + Short إنجليزي (للأجانب) + Reel عربي + تغريدتين + بوستين فيسبوك.

## الصفحات

| الصفحة | المسار |
| --- | --- |
| لوحة التحكم (النهارده، الشهر، الطابور، 3 charts، أنسب 5 كتب) | `/` |
| ترتيب الكتب: بحث وفلترة، اختيار متعدد، أولوية، «تحديث الترتيب» | `/books` |
| طابور الإنتاج + مهام Claude | `/queue` |
| التقويم الشهري (مربع لكل يوم: نزل/لسه، والضغط بيفتح الكتب) | `/calendar` |
| صفحة اليوم كاملة + زرار «بدء النشر» (بتتحدث لوحدها وClaude بينشر) | `/calendar/YYYY-MM-DD` |
| صفحة الكتاب: جاهزية النشر، الفيديو والبوستر، المحتوى المكتوب (تعديل واعتماد)، ملفات الفولدر بالعرض، وشات تعديلات لـ Claude | `/content/<id>` |
| اللي اتنشر بتاريخ النشر | `/published` |
| التقارير: أسبوع، شهر، أو فترة تختارها + CSV | `/reports` |
| الإعدادات: كتب في اليوم، المواعيد، وزن الشهرة | `/settings` |

## الترتيب
النتيجة = الشهرة × الوزن + الحداثة × (100 − الوزن) + الأولوية (`products.social_priority` في قاعدة المنصة).
الشهرة من Open Library (اللي عايزين يقروا الكتاب / بيقروه / قروه، والتقييمات، والطبعات)، وللكتب الجديدة اللي لسه مالهاش قرّاء بتتحسب من شهرة المؤلف. اختياري: Google Books بـ`GOOGLE_BOOKS_API_KEY`.
البيانات بتتجاب في الخلفية (زرار «تحديث الترتيب» = 600 كتاب، أو `npm run popularity -- 4000`)، وكل كتاب بيتحدّث تاني بعد 30 يوم.

## إزاي Claude بيشتغل
1. اختيار كتب ← «أضف للطابور» ← كل كتاب بياخد يوم فاضي + 7 منشورات + مهمة إنتاج + فولدر في `D:\booksplatformContent\<الكتاب>`.
2. في Claude (في المشروع ده) قول: **«نفّذ مهام السوشيال»** ← سكيل `books-social-run` بيسحب المهام ويشغّل:
   - `book-content`: السكريبت عربي وإنجليزي، الصوت (OfflineTTS للإنجليزي، edge-tts مصري للعربي، ElevenLabs للمشاعر)، Flow ← Pexels للكليبات، Canva ← ChatGPT ← Gemini للصور والتصاميم، مونتاج 45 ثانية رأسي، تصاميم البوستات.
   - `book-publish`: بيعرض عليك منشورات اليوم، وبعد موافقتك في الشات بينشر أو يجدول على YouTube وFacebook وX من البراوزر المدمج، وكل منشور ينزل بيتعلّم في التقويم.
3. الأداة اللي Claude بيكلم بيها السيستم: `npm run agent -- jobs | book <id> | day <date> | post <id> key=value | job <id> start|log|done|fail`.

## التشغيل المحلي
```powershell
npm install
npx prisma migrate deploy   # جداول schema social
npm run db:seed
npm run create-admin -- you@example.com "password" "Name"
npm run dev                 # http://localhost:3200
powershell -ExecutionPolicy Bypass -File scripts\setup-tools.ps1   # ffmpeg + edge-tts + faster-whisper
```

## عمود الأولوية في قاعدة المنصة
الـmigration في مشروع المنصة: `books-platform/web/prisma/migrations/20261118120000_product_social_priority` (عمود `social_priority INTEGER DEFAULT 0` + index). بيتطبق مع `npm run db:migrate:prod` في مشروع المنصة. لحد ما يتطبق الترتيب شغال والأولوية بتتحسب صفر.

## Coolify
زي سيستم الإيميلات: Dockerfile، البورت 3000، المتغيرات من `.env.example` (مع `AGENT_TOKEN`)، والـhealth على `/api/health`.
Scheduled Task يومي: `wget -qO- --header="Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/popularity`.
على جهازك حط `AGENT_URL` = دومين Coolify ونفس `AGENT_TOKEN` في `.env` عشان Claude يكلم اللوحة اللي على السيرفر. (فولدرات الكتب في الحالة دي بتتعمل بـ `npm run agent -- folders`.)
