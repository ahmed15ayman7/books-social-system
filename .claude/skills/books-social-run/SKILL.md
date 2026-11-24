---
name: books-social-run
description: Runs the Books Platform social media queue from this machine — pulls open jobs from the books-social-system dashboard (production of book videos/designs, revisions requested from a book's chat, and publishing days) and executes them one by one with book-content, book-revise and book-publish. Use when the user says "نفّذ مهام السوشيال", "شغّل الطابور", "اعمل الكتب اللي في الطابور", "ابدأ النشر", or asks to run/continue the social queue.
---

# تشغيل طابور السوشيال (Books Platform)

اتكلم مع المستخدم بالعامية المصرية. السيستم: `D:\projects\books-social-system` (لوحة التحكم على localhost:3200 أو دومين Coolify).
كل الكلام مع السيستم بالأداة دي (بتقرا AGENT_URL/APP_URL و AGENT_TOKEN من `.env`):

```
cd D:\projects\books-social-system
npm run -s agent -- jobs
```

## الخطوات
1. هات المهام المفتوحة (`jobs`). الترتيب: PUBLISH (مواعيدها ثابتة)، بعدين REVISE (المستخدم مستني رد في شات الكتاب)، بعدين PRODUCE بترتيب يوم النشر.
2. لو مفيش مهام: قول كده في سطر واحد واقف.
3. قبل أي مهمة: `npm run -s agent -- folders` (بيعمل فولدر كل كتاب جوه `D:\booksplatformContent` لو مش موجود).
4. لكل مهمة:
   - `npm run -s agent -- job <jobId> start "بدأت"`
   - PRODUCE → اتبع سكيل **book-content** للكتاب ده.
   - REVISE → اتبع سكيل **book-revise** (فيها `target` و`instruction`، والرد بيتكتب في شات الكتاب).
   - PUBLISH → اتبع سكيل **book-publish** لليوم ده (أو للكتاب لو المهمة فيها book).
   - سجّل كل خطوة مهمة: `npm run -s agent -- job <jobId> log "الصوت العربي خلص"` (اللوج بيظهر في صفحة اليوم والطابور).
   - في الآخر: `job <jobId> done "..."` أو `job <jobId> fail "السبب"`.
   - لو الرد 409 (cancelled from dashboard) وقّف المهمة دي فورًا وروح للي بعدها.
5. ابدأ بمهمة واحدة وخلّصها للآخر قبل اللي بعدها. بعد كل كتاب ابعت للمستخدم ملخص في سطرين (إيه اللي اتعمل + مسار الفولدر).

## قواعد ثابتة
- النشر محتوى عام: قبل ما تنشر أي حاجة، اعرض على المستخدم في الشات قايمة المنشورات اللي هتنزل (المنصة، النوع، الميعاد، أول سطر من النص) واستنى "أيوه" صريحة في الشات. الضغط على زرار "بدء النشر" في اللوحة بيعمل المهمة بس، ومش بيعتبر موافقة على النشر.
- مابنكتبش باسورد في أي موقع. لو موقع طلب تسجيل دخول، اطلب من المستخدم يسجل هو في البراوزر وكمّل.
- أي ملف بيتنزل من البراوزر بيروح Downloads؛ انقله لفولدر الكتاب الصح بـ PowerShell (Move-Item) وسمّيه بالاسم المطلوب.
- لو أداة ناقصة (ffmpeg، edge-tts، faster-whisper) شغّل `scripts\setup-tools.ps1` بعد ما تقول للمستخدم هيتثبت إيه.
