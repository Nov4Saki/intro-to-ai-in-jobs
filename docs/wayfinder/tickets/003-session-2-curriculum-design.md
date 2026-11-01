# Decision Ticket: Session 2 Curriculum & Interactive Architecture

**Parent**: [Wayfinder Map](../MAP.md)  
**Ticket ID**: `003-session-2-curriculum-design`  
**Type**: `wayfinder:prototype`  
**Status**: Closed  
**Assignee**: Antigravity  

---

## Question

How should **Session 2: تعلّم الآلة والذكاء الاصطناعي التوليدي** (Machine Learning & Generative AI) be structured across:
1. **Slide Presentation Deck (`ai-session-2-slides-ar.html`)**: 16:9 widescreen, branded with Future Solutions formal template, crisp logos, instructor عبدالرحمن عيسى, date جمادى الأولى 1448, and zero instructor notes in student deck.
2. **Interactive Activity Curriculum (`session-2.ts`)**: Interactive stations using mixed mechanics (bucket-sort, sequence, matching, odd-one-out, draft-review, choice) designed for office employees and managers.
3. **Pedagogical Progression**: Bridging seamlessly from Session 1 basics to practical workplace generative AI understanding without technical math or jargon.

---

## Resolution

1. **Slide Presentation Deck (`sessions/session_2/ai-session-2-slides-ar.html`)**:
   - 30 widescreen 16:9 slides.
   - Branded with `background.jpg` formal template and enlarged `4.2rem` logo (`6.8rem` on cover slide).
   - Set instructor to **عبدالرحمن عيسى** and date to **جمادى الأولى 1448**.
   - Completely free of mentor-only notes and free of word "موسيقى".
   - Zero em-dashes and en-dashes across all text.
2. **Exported High-DPI PDF (`materials/session_2/ai-session-2-slides-ar.pdf`)**:
   - 30-page high-DPI PDF exported via Playwright with `device_scale_factor=2`.
3. **Interactive Activities (`src/content/session-2.ts`)**:
   - 6 activity stations covering all 5 core sections.
   - Genuine mixture of at least 3 game mechanics per part (`bucket-sort`, `matching`, `sequence`, `draft-review`, `odd-one-out`, `choice`, `myth-fact`).
4. **Automated Verification**:
   - All 5 unit tests pass in `src/engine/activity-engine.test.ts`.
   - Next.js static build verified and exported successfully.

---

## Proposed Structure & Agenda (120 Minutes)

1. **الافتتاح والمراجعة السريعة (0:00 - 0:10 / 10 دقائق)**:
   - مراجعة سريعة للجلسة الأولى (المهام الأربع، البرمجيات التقليدية مقابل الذكاء الاصطناعي).
   - نشاط إحماء سريع: تصنيف سيناريوهات جديدة.
2. **القسم ١: كيف تتعلّم الآلة؟ (0:10 - 0:30 / 20 دقيقة)**:
   - فكرة التعلّم من الأمثلة بدلاً من كتابة القواعد باليد.
   - البيانات كوقود: أثر جودة البيانات وتنوعها على دقة النموذج (Garbage In, Garbage Out).
   - نشاط تفاعلي: توصيل البيانات بالقرارات المتوقعة.
3. **القسم ٢: ثورة الذكاء الاصطناعي التوليدي (0:30 - 0:50 / 20 دقيقة)**:
   - الفرق بين الذكاء التمييزي (Classification) والذكاء التوليدي (Generation).
   - كيف تتنبأ النماذج اللغوية (LLMs) بالكلمة التالية بذكاء إحصائي هائل.
   - توليد الصور والوسائط من الأوصاف النصية.
4. **استراحة قهوة وتنشيط (0:50 - 1:00 / 10 دقائق)**.
5. **القسم ٣: تشريح المطالبة الفعّالة (1:00 - 1:20 / 20 دقيقة)**:
   - المكونات الأربعة للمطالبة الاحترافية في العمل (الدور، السياق، المهمة، والشروط).
   - نشاط ترتيب تسلسلي: صياغة مطالبة خطوة بخطوة.
6. **القسم ٤: الهلوسة والحدود في بيئة العمل (1:20 - 1:40 / 20 دقيقة)**:
   - لماذا تحدث الهلوسة؟ وكيف نكشفها بالقلم الأصفر؟
   - نشاط فحص مسودة: كشف الهفوات والافتراضات الزائفة.
7. **القسم ٥: المختبر التطبيقي والختام (1:40 - 2:00 / 20 دقيقة)**:
   - تصنيف مهام العمل: مناسب للتوليد أم يحتاج تدقيقاً دقيقاً أم لا يناسب إطلاقاً؟
   - الخلاصة وتقديم الجلسة الثالثة.
