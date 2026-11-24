---
name: book-content
description: Produces the full social media content package for ONE book from the Books Platform queue — a 45-second vertical video in simplified Modern Standard Arabic for the whole Arab world (YouTube Short + Facebook Reel) and an English version (YouTube Short for foreign viewers), 2 tweets with a quote design, 2 Facebook posts with designs, titles/descriptions/tags — saved into D:\booksplatformContent\<book folder> and written back to the dashboard. Use for PRODUCE jobs from books-social-run, or when the user asks to make content/video for a specific book from the queue.
---

# إنتاج محتوى كتاب (فيديو 45 ثانية عربي + إنجليزي + تغريدتين + بوستين)

بيبدأ لما المستخدم يدوس «تجهيز الفيديو» في صفحة الكتاب. الناتج دايمًا **فيديوهين**: واحد عربي وواحد إنجليزي، بنفس المشاهد.

اتكلم مع المستخدم بالعامية المصرية. كل الملفات جوه فولدر الكتاب `D:\booksplatformContent\<folder>`:
`images\` صور AI · `clips\` فيديوهات Flow و Pexels · `audio\` الصوت · `designs\` تصاميم Canva/ChatGPT/Gemini · `work\` ملفات مؤقتة · `final\` الناتج.

## 0. البيانات
`npm run -s agent -- book <bookId>` بيرجع: بيانات الكتاب من المنصة (العنوان عربي/إنجليزي، المؤلف، الناشر، الوصف عربي وإنجليزي، الغلاف، ISBN، السنة) + الـ7 منشورات بالـ id والـ link (فيه UTM لكل منصة) و`expectedAsset`.
- اقرا الوصفين كويس. لو محتاج معلومة زيادة (فكرة الكتاب الأساسية، قصة المؤلف، اقتباس حقيقي)، دوّر في مصادر موثوقة (موقع الناشر، مراجعات صحف معروفة، Wikipedia للمؤلف). أي اقتباس بيتنسب للكتاب لازم يكون موجود نصًا في مصدر، وإلا اكتبه كفكرة مش اقتباس.
- لو الكتاب جديد ومفيش عنه غير الوصف: الفيديو يبقى «ليه الكتاب ده مهم دلوقتي» مبني على الوصف بس، من غير اختراع تفاصيل.

## 1. الكتابة (ملف `script.md` في الفولدر)
**السكريبت العربي: فصحى مبسطة لكل الوطن العربي (مش لهجة مصرية ولا أي لهجة)، حوالي 95–110 كلمة = 45 ثانية:**
- اللغة: فصحى سهلة وقريبة، جمل قصيرة (8–14 كلمة)، كلمات مفهومة من المغرب للخليج. ممنوع الكلمات العامية («ده»، «إزاي»، «عشان»)، وممنوع الفصحى المعقدة («إنّ ممّا لا شكّ فيه»، «حريٌّ بنا»).
- اكتبه بالتشكيل على الكلمات اللي ممكن تتنطق غلط (الأفعال المبنية للمجهول، الأسماء الأجنبية، الكلمات المتشابهة) عشان محرك الصوت ينطقها صح.
- الأسماء الأجنبية (المؤلف، العنوان) تتكتب بالعربي زي ما بتتنطق، والعنوان الأصلي يظهر على الشاشة بس.
- 0–3 ث: خطّاف بسؤال أو مفارقة من موضوع الكتاب («هل تعلم أن…؟»، «ماذا لو…؟»)، مش «اليوم سنتحدث عن…».
- 3–35 ث: أهم 3 أفكار في الكتاب، كل فكرة جملتين.
- 35–42 ث: لمن هذا الكتاب.
- آخر 3 ث: دعوة للتفاعل («أخبرنا في التعليقات…») + «الكتاب متاح على Books Platform، والرابط في الوصف».
- **اسم المنصة في السكريبت العربي يتكتب بالإنجليزي «Books Platform»** (اختيار المستخدم: المحرك بينطقه صح كده). ممنوع «بوكس بلاتفورم» بالعربي.
- اقرا السكريبت بصوت عالي في دماغك: لو فيه جملة صعبة تتقال في نفس واحد، قسّمها.
**السكريبت الإنجليزي (American English، 105–115 كلمة):** نفس الهيكل، مكتوب من الأول لجمهور أجنبي (مش ترجمة حرفية)، والختام: "Find it on Books Platform — link in description."
**جدول المشاهد:** كل مشهد 3–5 ثواني: النص المقروء · الصورة/الكليب · الكلام اللي على الشاشة (3 كلمات بالكتير).
**النصوص (كل واحد في ملف لوحده جوه `work\` عشان يتبعت بـ text=@file):**
- `yt_ar.txt` و `yt_en.txt`: سطر أول = العنوان (أقل من 60 حرف، فيه #Shorts)، وبعده الوصف (3 أسطر + لينك المنشور بتاعه + 5 هاشتاجات).
- `reel_ar.txt`: كابشن الريل (سطرين + لينك + 3 هاشتاجات).
- `tweet_1.txt`: الاقتباس/الفكرة + تعليق قصير يفتح نقاش (أقل من 260 حرف مع اللينك).
- `tweet_2.txt`: سؤال نقاش عن فكرة الكتاب (من غير لينك أو بلينك في الآخر).
- `fb_book.txt`: ترشيح الكتاب: خطّاف، نبذة في 3 أسطر، لمين، اللينك، منشن لدار النشر لو ليها صفحة.
- `fb_question.txt`: سؤال أو مسابقة صغيرة عن موضوع الكتاب.
النصوص العربية (يوتيوب، ريل، تغريدات، فيسبوك) بنفس الفصحى المبسطة. اكتب بأسلوب بشري (استخدم سكيل anti-ai-writing لو متاحة): من غير «في عالم مليء بـ…» ومن غير إيموجي كتير.

## 2. الصوت (ثابت لكل الكتب)
الأصوات بتيجي من خانة `voice` في `npm run -s agent -- book <bookId>` (المستخدم بيثبّتها من الإعدادات بعد ما يسمع العيّنات). **ماتختارش صوت تاني من دماغك**، حتى لو حاسس إن صوت تاني أحسن: اقترح على المستخدم، والتغيير بيبقى من الإعدادات.
- **إنجليزي:** OfflineTTS في البراوزر المدمج (https://offlinetts.com/app/) — Kokoro، صوت `voice.en.voice` (af_heart = Heart)، q4، سرعة 1. Load Model أول مرة، الصق النص، Generate Speech، Download MP3 → انقله لـ `audio\voice_en.mp3`.
- **عربي، لو `voice.ar.engine` = edge:** السكريبت في `work\script_ar.txt` (جملة في كل سطر)، وبعدين:
  `C:\Python314\python.exe D:\projects\books-social-system\scripts\tts_ar.py <folder> <voice.ar.edgeVoice> <voice.ar.rate> <voice.ar.pitch>`
  بيطلّع `audio\voice_ar.mp3` + `work\words_ar.json` (توقيت كل كلمة من المحرك نفسه، أدق من whisper) + `final\video_ar.srt`.
  الطول المطلوب 43–47 ث. الفصحى بالتشكيل أبطأ من العامية: **حوالي 60–65 كلمة بس** = 46 ث. لو طلع أطول قصّر النص، ماتغيرش السرعة.
- **عربي، لو `voice.ar.engine` = elevenlabs (الصوت الثابت حاليًا: Saber - Clear Arabic Narrator):** elevenlabs.io/app/speech-synthesis/text-to-speech في البراوزر المدمج، الصوت `voice.ar.elevenVoice` والموديل Eleven v4. اكتب نسخة بالتاجات في `work\script_ar_eleven.txt` (نفس الكلام بالظبط + تاجات زي [curious] [serious] [emphatic] [thoughtful] [warm] [friendly] [pause]) والصقها في المحرر **في سطر واحد من غير Enter** (الـEnter بيعمل بلوكات والتوليد بيطلع أول بلوك بس — اتأكد إن العداد = طول النص كله). Generate بيطلّع نسختين: نزّل الاتنين (بينزلوا .tmp في Downloads) لـ `audio\_eleven\`، واختار الأدق بـ whisper (خصوصًا نطق Books Platform)، وانسخه `audio\voice_ar.mp3`. التوقيت: `transcribe.py ... ar` وفي plan.json `"captionsFromScript": {"ar": true, "en": true}`. Saber أسرع من Edge: 64 كلمة ≈ 37 ث. لو الرصيد خلص (العداد في الصفحة): سجّل بـ `tts_ar.py` بالصوت `voice.ar.edgeVoice` وقول للمستخدم في شات الكتاب.
- راجع النطق: اسمع أول 10 ثواني. لو فيه كلمة اتنطقت غلط (اسم المؤلف مثلًا)، شكّلها أو اكتبها زي ما بتتنطق وسجّل تاني.
- توقيت الكلمات الإنجليزي: `C:\Python314\python.exe D:\projects\books-social-system\scripts\transcribe.py <folder>\audio\voice_en.mp3 en` (faster-whisper، بيطلّع `work\words_en.json` و `final\video_en.srt`). الإنجليزي بصوت Heart: حوالي 105–115 كلمة، ولو قصير استخدم سرعة 0.9 في OfflineTTS.

## 3. الصور والفيديوهات (بالأولوية دي بالظبط)
**كليبات حركة:**
1. **Google Flow** (https://labs.google/flow — الخطة المجانية): كليب أو اتنين بس لكل كتاب (لقطة الخطّاف + لقطة الختام)، 8 ثواني، **رأسي 9:16**، من غير نص ولا وجوه حقيقية ولا لوجوهات. شوف الرصيد الباقي قبل ما تولّد، ولو خلص كمّل بـ Pexels.
2. **Pexels** (https://www.pexels.com/videos/) فلتر Portrait: 3–5 كليبات للأجواء (مكتبة، قراية، مدينة…)، نسخة 1080x1920 أو أقرب حاجة، من غير لوجو أو ماركة ظاهرة. الاسم يبدأ بحروف الكتاب: `<initials>_library.mp4`.
**تسجيل الدخول:** Flow وGemini (حساب Google) وChatGPT بيحتاجوا المستخدم يسجّل دخول في البراوزر المدمج. لو مش متسجّل، كمّل بالأداة اللي بعدها وماتوقفش، وقوله في الآخر يسجّل عشان الكتب الجاية.
**صور AI (4–5 صور، صورة في كل برومبت):**
1. **Canva** (Magic Media / Dream Lab) → 2. **ChatGPT** (توليد الصور) → 3. **Gemini** → 4. موقع مجاني تاني (Microsoft Designer/Bing Image Creator أو Ideogram).
   Canva متوصّل كـ connector: `generate-image` (صورة لكل برومبت، PORTRAIT_9_16) وبيرجع media id بس. عشان تنزّل الصورة بالحجم الكامل: حطهم في تصميم واحد بـ `create-design` (format "Your Story"، صفحة لكل صورة) وبعدين `export-design` PNG 1080x1920. **راجع كل صورة بعد التصدير**: Canva ساعات بيضيف كلام على الصورة رغم "no text" — الصورة دي ماتستخدمهاش (حطها في `images\_rejected`). رصيد Canva AI محدود: لو رجع `quota_exceeded` كمّل بـ ChatGPT ثم Gemini.
بنمشي بالترتيب: لو الأول مش متاح أو رصيده خلص أو مستني تسجيل دخول، روح للي بعده.
برومبت ثابت (مقاس رأسي): `ONE single full-size vertical 9:16 cinematic image (not a grid): [المشهد], [الإضاءة والجو], no text, no logos, no real people's faces.`
**غلاف الكتاب:** من `book.cover` (لينك المنصة) — نزّله لـ `images\cover.jpg`. ده بيظهر في الخطّاف والختام.

## 4. تصاميم الموشن جرافيك (لازم من Canva أو ChatGPT أو Gemini)
كل العناصر الجرافيكية بتتصمم في Canva الأول (ChatGPT ثم Gemini لو Canva مش متاح). أوفر طريقة: **تصميم واحد 12 صفحة** بـ `create-design` (format "Your Story"، الغلاف كـ reference بعد رفعه بـ `create-upload-url`) والنص المطلوب حرفيًا لكل صفحة، وسيب الربع اللي تحت فاضي للترجمة:
  1 title_ar · 2–4 idea1/2/3_ar · 5 end_ar · 6 title_en · 7–9 idea1/2/3_en · 10 end_en · 11 poster_ar · 12 poster_en
  صدّره PNG 1080x1920 ونزّله لـ `designs\cards\<الاسم>.png`، واعمل contact sheet وبصّ عليه قبل ما تكمّل.
- البوسترات: `final\cover_ar.jpg` و`final\cover_en.jpg` من صفحات 11 و12.
- لو الغلاف من المنصة صغير (أقل من 600 عرض): ماتكبّروش في الفيديو لوحده، خلّيه جوه كروت Canva بس.
الحركة نفسها بالكود (Remotion أو ffmpeg): ظهور/زوم/انزلاق للتصاميم دي، مش رسم جرافيك جديد بالكود.

## 5. المونتاج (1080x1920، 30fps، 37–47 ثانية)
- **بعد أي رندر لازم فحص التزامن:** `C:\Python314\python.exe D:\projects\books-social-system\scripts\check_sync.py <folder> ar` (ونفسه بـ `en`). متوسط الفرق لازم أقل من 0.2 ث، ولو أكتر ماتسلّمش الفيديو.
- تعديل على الصوت أو الترجمة بس (من غير ما مدد المشاهد تتغير): ضيف `--reuse` للرندر عشان يستخدم المشاهد المعمولة.
- **المونتاج بـ `scripts\render_book.py`**: اكتب `work\plan.json` (المشاهد لكل لغة: كل مشهد = أرقام الجمل + shots: صورة/كليب/كارت، مع `start` للكليب و`fixed` لمدة الكارت). الأداة بتحسب توقيت كل مشهد من توقيت الكلمات، وبتعمل زووم للصور وقص للكليبات، وظهور ناعم للكروت، وترجمة كلمة بكلمة، وwhoosh مع كل قطع، وloudnorm -14 LUFS. المثال: `D:\booksplatformContent\hopes-and-impediments-selected\work\plan.json`.
  - أول حاجة `--preview` (4 فريمات في `work\frames_<lang>`) وبصّ عليهم، وبعدين الرندر الكامل: `C:\Python314\python.exe D:\projects\books-social-system\scripts\render_book.py <folder> ar` ونفس الأمر بـ `en`.
  - الترجمة العربي: الأداة بتعكس ترتيب الكلمات وبتفصل كل كلمة لأن libass بيبوّظ ترتيب العربي مع تلوين الكلمة. ماتغيرش ده. وآخر جملة (كارت النهاية) من غير ترجمة.
- الترتيب: خطّاف (كليب Flow + الغلاف + title_card) → 3 أفكار (صور/كليبات + idea cards، تغيير الصورة كل 3–4 ثواني) → الختام (end_card + كليب Flow الختامي).
- الترجمة محروقة: 2–3 كلمات في المرة، الكلمة المقروءة بالأحمر، في التلت اللي تحت (بعيد عن أزرار Shorts/Reels). للعربي استخدم ملف ASS مع ffmpeg/libass (بيشكّل العربي صح) بخط عربي عريض.
- whoosh خفيف مع كل انتقال، والموسيقى (لو المستخدم ادى ملف) تحت الصوت بـ 20 dB.
- نسختين: `final\video_ar.mp4` و `final\video_en.mp4` بنفس المشاهد، والنص على الشاشة بلغة كل نسخة. والـ srt: `final\video_ar.srt` و `final\video_en.srt`.
- غلاف Short لكل نسخة: `final\cover_ar.jpg` و `final\cover_en.jpg` (1080x1920، 3 كلمات بالكتير).

## 6. تصاميم البوستات (Canva الأول، بعدين ChatGPT، بعدين Gemini)
لو رصيد Canva خلص ومفيش ChatGPT/Gemini: اعملهم قص من كروت Canva نفسها (من غير رسم بالكود): fb_book = أعلى title_ar (1080x1350)، fb_question = poster_ar مقصوص مربع، quote = كارت فكرة على خلفية 1600x900 سودا.
- `designs\quote.png` (1600x900 لـ X): الاقتباس أو الفكرة + اسم الكتاب والمؤلف + لوجو، بهوية المنصة.
- `designs\fb_book.png` (1080x1350): الغلاف + العنوان + جملة ليه تقراه.
- `designs\fb_question.png` (1080x1080): السؤال بخط كبير.

## 7. المراجعة والتسليم
- قبل الرندر الكامل: اعمل فريمات من الخطّاف والفكرة التانية والختام وبصّ عليهم (النص جوه الإطار؟ العربي متشكّل صح؟ مقروء على الموبايل؟).
- بعد الرندر: الطول 43–47 ث، مفيش فريمات سودا، الصوت متزامن مع الترجمة (عيّنات من 3 أماكن).
- اكتب في الداشبورد كل منشور (الـ id من خطوة 0):
  ```
  npm run -s agent -- post <SHORT_AR id> status=READY title="..." text=@D:\booksplatformContent\<folder>\work\yt_ar.txt assetPath=final/video_ar.mp4
  npm run -s agent -- post <REEL_AR id>  status=READY text=@...\work\reel_ar.txt assetPath=final/video_ar.mp4
  npm run -s agent -- post <SHORT_EN id> status=READY title="..." text=@...\work\yt_en.txt assetPath=final/video_en.mp4
  npm run -s agent -- post <TWEET_1 id>  status=READY text=@...\work\tweet_1.txt assetPath=designs/quote.png
  npm run -s agent -- post <TWEET_2 id>  status=READY text=@...\work\tweet_2.txt
  npm run -s agent -- post <FB_BOOK id>  status=READY text=@...\work\fb_book.txt assetPath=designs/fb_book.png
  npm run -s agent -- post <FB_QUESTION id> status=READY text=@...\work\fb_question.txt assetPath=designs/fb_question.png
  ```
- `npm run -s agent -- sync <bookId>` (قايمة الملفات للوحة) و `npm run -s agent -- reply <bookId> "الفيديو والتصاميم جاهزين: …"` عشان يبان في شات الكتاب.
- لو مهمة PRODUCE: `job <jobId> done "7 منشورات جاهزة"`. وابعت للمستخدم الفيديوهين بـ SendUserFile، ولينك صفحة الكتاب `/content/<bookId>` عشان يراجع ويطلب تعديلات.

## حقوق وإفصاح
- غلاف الكتاب واقتباس قصير مع ذكر الكتاب والمؤلف = استخدام عادي لترشيح الكتاب. ممنوع صفحات كاملة من الكتاب.
- YouTube: سؤال "Altered or synthetic content" بنختار "لا" طالما الصور توضيحية والصوت مش مقلّد لشخص حقيقي، ولو أي لقطة واقعية (Flow) ممكن تتفهم إنها حقيقية اختار "نعم".
