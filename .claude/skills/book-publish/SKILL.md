---
name: book-publish
description: Publishes (or schedules) a day's Books Platform posts from the dashboard queue in the built-in browser — YouTube Shorts (Arabic + English), Facebook Reel and posts, and X tweets — and marks each post as published with its URL so the calendar updates live. Use for PUBLISH jobs from books-social-run, or when the user asks to publish/schedule today's or a given day's book posts.
---

# نشر منشورات يوم

اتكلم بالعامية المصرية. البراوزر: البراوزر المدمج في تطبيق Claude (اقرا سكيل built-in-browser قبل أول خطوة). الحسابات متسجّلة فيه من المستخدم، وإنت مابتكتبش باسورد أبدًا.

## 1. القايمة
`npm run -s agent -- day <YYYY-MM-DD> [bookId]` → المنشورات اللي لسه منزلتش بالترتيب، ومعاها `asset` (المسار الكامل للملف) و`text` و`title` و`scheduledAt`.
- منشور حالته PENDING (المحتوى لسه متعملش) → اتخطاه وقول للمستخدم إن الكتاب محتاج إنتاج الأول.
- اعرض على المستخدم في الشات جدول: الساعة · المنصة · النوع · أول سطر من النص. واسأله سؤال واحد: «أنشر/أجدول دول؟». **ماتنشرش حاجة قبل "أيوه" صريحة في الشات.** موافقة واحدة بتغطي القايمة اللي عرضتها بس.

## 2. لكل منشور (بالترتيب)
1. `npm run -s agent -- post <id> status=PUBLISHING` (بيبان في صفحة اليوم إنه بينزل).
2. لو ميعاده لسه مجاش: **جدوِل** على المنصة نفسها بنفس الميعاد (توقيت القاهرة). لو ميعاده فات أو النهارده وقرب: انشر دلوقتي.
3. بعد ما المنصة تأكد: هات لينك المنشور وسجّل:
   `npm run -s agent -- post <id> status=PUBLISHED url=<لينك المنشور>`
   (للمجدول: لينك الفيديو/المنشور من صفحة المحتوى المجدول، وسجّله PUBLISHED برضه بعد ما الجدولة تتأكد، وفي اللوج اكتب "مجدول").
4. لو فشل: `post <id> status=FAILED error="السبب"` وكمّل اللي بعده.
5. سجّل في المهمة: `job <jobId> log "YouTube Short عربي: اتجدول 1:00 م"`.

## اختيار الملف (رفع الملفات)
البراوزر المدمج مابيقدرش يختار ملف من الجهاز لوحده. لما يفتح مربع اختيار الملف: قول للمستخدم المسار الكامل (من `asset`) وهو يختاره، وكمّل إنت الباقي. لو المستخدم شغّل Claude in Chrome وقال استخدمه، استخدم أداة file_upload بتاعته بدل كده.

## المنصات
**YouTube Studio** (القناة العربية / القناة الإنجليزية حسب `lang` — اسأل المستخدم مرة واحدة لو عنده قناة واحدة بس):
Create → Upload videos → الملف → Title = أول سطر من text، Description = الباقي → Thumbnail مش متاح للـShorts → "No, it's not made for kids" → Altered content حسب قاعدة book-content → Visibility: Schedule بالميعاد (المنطقة الزمنية GMT+2) أو Public → اللينك من "Video link".
**Facebook** (Meta Business Suite → Create reel / Create post، صفحة Books Platform):
Reel: الفيديو + الكابشن (text) + Schedule. Post: الصورة (asset) + النص + Schedule. اللينك من Content → Scheduled/Published.
لو المستخدم عايز Instagram كمان، Business Suite بيسمح بالنشر على الاتنين من نفس الشاشة؛ ماتعلّمش ده من غير ما يطلب.
**X** (x.com/compose/post): النص + الصورة (لو فيه asset) → أيقونة الجدولة (Schedule) بالميعاد → Confirm → Schedule. اللينك من Scheduled posts بعد ما ينزل، أو من البروفايل.

## في الآخر
- `job <jobId> done "نزل X، اتجدول Y، فشل Z"`.
- سطرين للمستخدم: كام منشور نزل/اتجدول، وإيه اللي فشل وليه، ولينك صفحة اليوم في الداشبورد.
