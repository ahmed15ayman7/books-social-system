---
name: book-revise
description: Applies a revision the user requested from a book's page in the Books Platform social dashboard (the per-book chat or the redo buttons) — re-edit the final video from their notes, search new clips, redesign an image/poster/post design, redo the voice, or rewrite post texts — then replies in that book's chat. Use for REVISE jobs from books-social-run, or when the user asks to change something in a specific book's content.
---

# تعديل محتوى كتاب (من شات الكتاب)

اتكلم بالعامية المصرية. المهمة جاية من `npm run -s agent -- jobs` وفيها: `book.id`، `target` (على إيه)، `instruction` (طلب المستخدم بالنص).

## قبل ما تبدأ
1. `npm run -s agent -- job <jobId> start "بدأت"`
2. `npm run -s agent -- book <bookId>`: بيانات الكتاب، المنشورات، و**آخر 20 رسالة في الشات**. اقرا الرسايل القديمة كمان: لو المستخدم قال قبل كده حاجة (مثلًا «مش عايز صوت راجل»)، متكسرهاش في التعديل الجديد.
3. افتح `script.md` وملفات `work\` في فولدر الكتاب عشان تعرف الفيديو اتعمل إزاي.
4. لو الطلب مش واضح كفاية عشان تنفّذه صح (مثلًا «غيّر ده» من غير ما يقول لإيه)، ماتخمّنش: رد في الشات بسؤال واحد محدد واقفل المهمة `done "مستني رد"`.

## حسب الـ target
- **video** (الفيديو النهائي): نفّذ التعديل المطلوب بالظبط بنفس خطوات المونتاج في سكيل book-content (نفس المقاس 1080x1920، نفس الهوية). خلّي النسخة القديمة: انقل `final\video_ar.mp4` لـ `final\_old\video_ar_<التاريخ والساعة>.mp4` قبل الرندر الجديد. لو التعديل يخص النسختين (عربي وإنجليزي) طبّقه على الاتنين، ولو قال «العربي بس» يبقى العربي بس. وراجع فريمات الخطّاف والوسط والختام قبل ما تقول خلص.
- **clips** أو **file:clips/…** (بحث تاني): دوّر في Google Flow (لو فيه رصيد) ثم Pexels على كليبات بالوصف اللي طلبه، رأسي، من غير لوجوهات. حط الجديد في `clips\` واعمل الفيديو تاني بيه (القديم في `clips\_old\`).
- **images** أو **file:images/…**: صمّم الصورة تاني بنفس ترتيب الأدوات (Canva ثم ChatGPT ثم Gemini ثم موقع مجاني تاني)، صورة في كل برومبت، والتعليق بتاع المستخدم يدخل في البرومبت. بعدين اعمل الفيديو تاني لو الصورة داخلة فيه.
- **poster** أو **file:final/cover_*.jpg**: بوستر جديد 1080x1920 (للـShort/Reel)، 3 كلمات بالكتير، الغلاف + الهوية (أحمر #b11e2e وأسود وأبيض)، في Canva الأول. احفظ `final\cover_ar.jpg` و/أو `final\cover_en.jpg` والقديم في `final\_old\`.
- **designs** أو **file:designs/…**: تصميم البوست تاني (quote.png 1600x900، fb_book.png 1080x1350، fb_question.png 1080x1080) في Canva الأول.
- **voice** أو **file:audio/…**: بالصوت الثابت من خانة `voice` (نفس أوامر سكيل book-content، خطوة 2). لو المستخدم طلب صوت مختلف للكتاب ده بس، نفّذ وقوله إن باقي الكتب ماشية بالصوت الثابت؛ ولو عايز يغيره لكل الكتب، يبقى من الإعدادات ← «الصوت العربي الثابت». بعدين `transcribe.py` تاني والفيديو تاني (التوقيت اتغير).
- **script**: اكتب السكريبت تاني في `script.md`، واسأل في الشات قبل ما تعمل صوت وفيديو جديد (ده شغل كبير).
- **text** أو **text:<KIND>**: اكتب النص تاني وسجّله: `npm run -s agent -- post <postId> text=@…\work\<file>.txt` (والعنوان title="…" للـShorts). ماتغيرش status لو المنشور نزل.
- **other**: نفّذ اللي مكتوب، ولو كبير قسّمه واسأل.

## بعد التعديل
1. `npm run -s agent -- sync <bookId>` (عشان قايمة الملفات في اللوحة تتحدث لو اللوحة على Coolify).
2. لو اتغير ملف منشور جاهز (فيديو/تصميم)، المنشور يفضل READY بنفس `assetPath`. لو المنشور كان PUBLISHED، قول في الرد إن النسخة اللي نزلت مش هتتغير لوحدها (يوتيوب مثلًا مابيسمحش تبدّل الفيديو).
3. رد في شات الكتاب، 2–4 سطور: عملت إيه بالظبط، وأسماء الملفات اللي اتغيرت، وأي حاجة معملتهاش وليه:
   `npm run -s agent -- reply <bookId> "…" <jobId>` (للرد الطويل: اكتبه في ملف وابعته `@file.txt`)
4. `npm run -s agent -- job <jobId> done "…"` (أو `fail "السبب"` مع رد في الشات بالسبب).
