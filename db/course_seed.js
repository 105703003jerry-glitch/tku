export const seedSql = `
INSERT INTO courses (
    id,
    track_key,
    track_label_zh,
    track_label_en,
    level_key,
    duration_label,
    instructor_name,
    status,
    sort_order,
    published_at
)
VALUES
    ('course-a1-foundations', 'mandarin-core', '核心華語', 'Core Mandarin', 'A1', '6 weeks', 'TKCLCLAB Faculty', 'published', 10, NOW()),
    ('course-a2-life', 'mandarin-core', '核心華語', 'Core Mandarin', 'A2', '8 weeks', 'TKCLCLAB Faculty', 'published', 20, NOW()),
    ('course-b1-tocfl', 'tocfl-pathway', 'TOCFL 路徑', 'TOCFL Pathway', 'B1', '10 weeks', 'TOCFL Coaching Team', 'published', 30, NOW()),
    ('course-b2-discussion', 'tocfl-pathway', 'TOCFL 路徑', 'TOCFL Pathway', 'B2', '12 weeks', 'TOCFL Coaching Team', 'published', 40, NOW()),
    ('course-pro-industry', 'professional-track', '專業華語', 'Professional Track', 'B2', '6 weeks', 'Industry & Policy Faculty', 'published', 50, NOW()),
    ('course-c1-leadership', 'professional-track', '專業華語', 'Professional Track', 'C1', '8 weeks', 'Advanced Communication Faculty', 'published', 60, NOW())
ON CONFLICT (id) DO UPDATE SET
    track_key = EXCLUDED.track_key,
    track_label_zh = EXCLUDED.track_label_zh,
    track_label_en = EXCLUDED.track_label_en,
    level_key = EXCLUDED.level_key,
    duration_label = EXCLUDED.duration_label,
    instructor_name = EXCLUDED.instructor_name,
    status = EXCLUDED.status,
    sort_order = EXCLUDED.sort_order,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

INSERT INTO course_localizations (course_id, locale, title, summary, description, format_label, audience_label)
VALUES
    ('course-a1-foundations', 'zh-TW', '華語基礎啟航', '建立發音、句型與日常溝通底盤，適合剛開始接觸華語的國際學習者。', '這門課將發音、日常對話與文化脈絡結合成一條清楚的學習線，適合作為正式招生的入門主力課程。', '影片導讀 + 同步討論', '華語初學者'),
    ('course-a1-foundations', 'en', 'Mandarin Foundations', 'A beginner-friendly course that builds pronunciation, sentence patterns, and everyday communication.', 'A public-facing flagship entry course combining pronunciation, everyday communication, and cultural context.', 'Video-led with live discussion', 'First-time Mandarin learners'),
    ('course-a2-life', 'zh-TW', '生活華語應用', '以生活情境為主軸，提升聽說讀的整合能力。', '課程從餐飲、交通、校園與社交互動切入，適合當成 A2 階段的標準招生方案。', '主題式單元 + 任務練習', '已有基礎的學習者'),
    ('course-a2-life', 'en', 'Mandarin for Daily Life', 'An applied course that develops integrated listening, speaking, and reading through real-life situations.', 'This course covers food, transport, campus, and social interaction for a strong A2 public offer.', 'Theme-based modules with tasks', 'Learners with basic Mandarin'),
    ('course-b1-tocfl', 'zh-TW', 'TOCFL B1 衝刺路徑', '結合題型分析、重點詞彙與閱讀策略，幫助學生有系統地準備 TOCFL。', '這門課更適合當成考試導向商品與招生頁主打內容，能直接對外說明成果與進步路徑。', '診斷 + 模擬題 + 回饋', '準備 TOCFL 進階級的學習者'),
    ('course-b1-tocfl', 'en', 'TOCFL B1 Pathway', 'A structured pathway for TOCFL preparation with vocabulary, reading strategy, and test familiarization.', 'Designed as a recruitment-friendly exam-prep offer with clear outcomes and progression.', 'Diagnostic, mock tests, and review', 'Learners targeting intermediate TOCFL'),
    ('course-b2-discussion', 'zh-TW', 'TOCFL B2 學術表達', '聚焦高頻學術詞彙與觀點表達，提升高階聽讀與口語輸出。', '若未來要擴充正式學習平台，這類中高階課程最適合接續到付費班與教學服務。', '專題閱讀 + 高階表達', '希望提升學術與論述能力者'),
    ('course-b2-discussion', 'en', 'TOCFL B2 Academic Expression', 'A B2 track focused on academic vocabulary, argumentation, and stronger comprehension.', 'This mid-to-advanced course is ideal for future paid cohorts and deeper platform services.', 'Topic reading with advanced expression', 'Learners seeking stronger academic expression'),
    ('course-pro-industry', 'zh-TW', '華語產業觀察', '以產業、政策與國際案例為主軸，建立更高層次的語言與內容理解。', '這種內容特別適合學校合作、師培專班或品牌內容輸出，能拉開與一般課程網站的差異。', '講座內容 + 導讀討論', '教育工作者與進階學習者'),
    ('course-pro-industry', 'en', 'Mandarin Industry Insights', 'A professional track using policy, industry, and international cases as learning material.', 'A distinctive professional offer for institutional partnerships, teacher development, and premium content tracks.', 'Talk-based with guided discussion', 'Educators and advanced learners'),
    ('course-c1-leadership', 'zh-TW', '高階華語溝通與領導', '以專業簡報、談判與決策語言為核心，打造高階品牌課程。', '這是公開網站中最能提升品牌高度的旗艦課程，適合作為高端合作方案的代表內容。', '簡報、討論與案例輸出', '高階學習者與雙語專業人士'),
    ('course-c1-leadership', 'en', 'Advanced Mandarin Communication', 'A premium communication course focused on presentations, negotiation, and high-level expression.', 'This flagship course elevates the public brand and anchors premium partnership conversations.', 'Presentations, discussion, and case output', 'Advanced learners and bilingual professionals')
ON CONFLICT (course_id, locale) DO UPDATE SET
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    description = EXCLUDED.description,
    format_label = EXCLUDED.format_label,
    audience_label = EXCLUDED.audience_label;

INSERT INTO course_outcomes (course_id, locale, sort_order, content)
VALUES
    ('course-a1-foundations', 'zh-TW', 10, '掌握注音與拼音對照'),
    ('course-a1-foundations', 'zh-TW', 20, '完成自我介紹與生活會話'),
    ('course-a1-foundations', 'zh-TW', 30, '建立固定複習節奏'),
    ('course-a1-foundations', 'en', 10, 'Master foundational pronunciation patterns'),
    ('course-a1-foundations', 'en', 20, 'Handle self-introduction and daily conversation'),
    ('course-a1-foundations', 'en', 30, 'Build a repeatable study routine'),
    ('course-a2-life', 'zh-TW', 10, '能描述需求與偏好'),
    ('course-a2-life', 'zh-TW', 20, '提升短篇閱讀理解'),
    ('course-a2-life', 'zh-TW', 30, '強化情境式口說'),
    ('course-a2-life', 'en', 10, 'Describe needs and preferences'),
    ('course-a2-life', 'en', 20, 'Improve short-form reading comprehension'),
    ('course-a2-life', 'en', 30, 'Strengthen situational speaking'),
    ('course-b1-tocfl', 'zh-TW', 10, '掌握 B1 常見題型'),
    ('course-b1-tocfl', 'zh-TW', 20, '建立閱讀與聽力策略'),
    ('course-b1-tocfl', 'zh-TW', 30, '追蹤模擬測驗進步'),
    ('course-b1-tocfl', 'en', 10, 'Understand core B1 task types'),
    ('course-b1-tocfl', 'en', 20, 'Build listening and reading strategies'),
    ('course-b1-tocfl', 'en', 30, 'Track progress across mock assessments'),
    ('course-b2-discussion', 'zh-TW', 10, '提升論述組織能力'),
    ('course-b2-discussion', 'zh-TW', 20, '熟悉中高階詞彙'),
    ('course-b2-discussion', 'zh-TW', 30, '完成模擬口語任務'),
    ('course-b2-discussion', 'en', 10, 'Improve argument structure'),
    ('course-b2-discussion', 'en', 20, 'Expand higher-level vocabulary'),
    ('course-b2-discussion', 'en', 30, 'Complete guided speaking tasks'),
    ('course-pro-industry', 'zh-TW', 10, '理解專業主題華語'),
    ('course-pro-industry', 'zh-TW', 20, '練習跨文化討論'),
    ('course-pro-industry', 'zh-TW', 30, '建立產業語彙庫'),
    ('course-pro-industry', 'en', 10, 'Interpret professional Mandarin topics'),
    ('course-pro-industry', 'en', 20, 'Practice cross-cultural discussion'),
    ('course-pro-industry', 'en', 30, 'Build an industry-focused vocabulary bank'),
    ('course-c1-leadership', 'zh-TW', 10, '完成高階主題簡報'),
    ('course-c1-leadership', 'zh-TW', 20, '提升說服與協商表達'),
    ('course-c1-leadership', 'zh-TW', 30, '建立專業情境應對力'),
    ('course-c1-leadership', 'en', 10, 'Deliver advanced topic presentations'),
    ('course-c1-leadership', 'en', 20, 'Improve persuasive and negotiation language'),
    ('course-c1-leadership', 'en', 30, 'Respond confidently in professional situations')
ON CONFLICT DO NOTHING;

INSERT INTO course_modules (course_id, locale, sort_order, title)
VALUES
    ('course-a1-foundations', 'zh-TW', 10, '發音與聲調'),
    ('course-a1-foundations', 'zh-TW', 20, '生活情境句型'),
    ('course-a1-foundations', 'zh-TW', 30, '字詞辨識與複誦'),
    ('course-a1-foundations', 'en', 10, 'Pronunciation and tones'),
    ('course-a1-foundations', 'en', 20, 'Daily-life sentence patterns'),
    ('course-a1-foundations', 'en', 30, 'Vocabulary recognition and repetition'),
    ('course-a2-life', 'zh-TW', 10, '購物與消費'),
    ('course-a2-life', 'zh-TW', 20, '出行與方向'),
    ('course-a2-life', 'zh-TW', 30, '校園與社交'),
    ('course-a2-life', 'en', 10, 'Shopping and transactions'),
    ('course-a2-life', 'en', 20, 'Travel and directions'),
    ('course-a2-life', 'en', 30, 'Campus and social interaction'),
    ('course-b1-tocfl', 'zh-TW', 10, '題型拆解'),
    ('course-b1-tocfl', 'zh-TW', 20, '詞彙與語法強化'),
    ('course-b1-tocfl', 'zh-TW', 30, '模擬測驗與回顧'),
    ('course-b1-tocfl', 'en', 10, 'Task analysis'),
    ('course-b1-tocfl', 'en', 20, 'Vocabulary and grammar reinforcement'),
    ('course-b1-tocfl', 'en', 30, 'Mock exams and review'),
    ('course-b2-discussion', 'zh-TW', 10, '主題閱讀'),
    ('course-b2-discussion', 'zh-TW', 20, '觀點比較'),
    ('course-b2-discussion', 'zh-TW', 30, '口語與寫作轉化'),
    ('course-b2-discussion', 'en', 10, 'Topical reading'),
    ('course-b2-discussion', 'en', 20, 'Comparing perspectives'),
    ('course-b2-discussion', 'en', 30, 'Speaking-to-writing transfer'),
    ('course-pro-industry', 'zh-TW', 10, '政策議題導讀'),
    ('course-pro-industry', 'zh-TW', 20, '國際案例分析'),
    ('course-pro-industry', 'zh-TW', 30, '主題討論任務'),
    ('course-pro-industry', 'en', 10, 'Policy topic briefings'),
    ('course-pro-industry', 'en', 20, 'International case analysis'),
    ('course-pro-industry', 'en', 30, 'Structured discussion tasks'),
    ('course-c1-leadership', 'zh-TW', 10, '策略簡報'),
    ('course-c1-leadership', 'zh-TW', 20, '協商語言'),
    ('course-c1-leadership', 'zh-TW', 30, '案例模擬'),
    ('course-c1-leadership', 'en', 10, 'Strategic presentations'),
    ('course-c1-leadership', 'en', 20, 'Negotiation language'),
    ('course-c1-leadership', 'en', 30, 'Scenario simulation')
ON CONFLICT DO NOTHING;

INSERT INTO lessons (
    course_id,
    locale,
    module_sort_order,
    lesson_sort_order,
    title,
    lesson_type,
    content_url,
    external_video_id,
    thumbnail_url,
    duration_seconds,
    is_required
)
VALUES
    ('course-a1-foundations', 'zh-TW', 10, 10, '時代華語L1新同學—語法「呢」吳宛軒', 'video', 'https://www.youtube.com/watch?v=hDcAosGpRss', 'hDcAosGpRss', 'https://img.youtube.com/vi/hDcAosGpRss/maxresdefault.jpg', 600, true),
    ('course-a1-foundations', 'zh-TW', 20, 20, '時代華語 你在哪裡？黃姿宜 / chitchat with Bella 黃佳維', 'video', 'https://www.youtube.com/watch?v=zIocM5fiIAM', 'zIocM5fiIAM', 'https://img.youtube.com/vi/zIocM5fiIAM/maxresdefault.jpg', 600, true),
    ('course-a2-life', 'zh-TW', 10, 10, '時代華語 你在哪裡 林芝安', 'video', 'https://www.youtube.com/watch?v=gLF4OTokj4I', 'gLF4OTokj4I', 'https://img.youtube.com/vi/gLF4OTokj4I/maxresdefault.jpg', 600, true),
    ('course-a2-life', 'zh-TW', 20, 20, '時代華語 我的錢包在哪裡 魏暖真', 'video', 'https://www.youtube.com/watch?v=1a9N_IvgixY', '1a9N_IvgixY', 'https://img.youtube.com/vi/1a9N_IvgixY/maxresdefault.jpg', 600, true),
    ('course-b1-tocfl', 'zh-TW', 10, 10, '時代華語 第一課 飲食文化 彭盈婕', 'video', 'https://www.youtube.com/watch?v=aq25zNt2bSw', 'aq25zNt2bSw', 'https://img.youtube.com/vi/aq25zNt2bSw/maxresdefault.jpg', 600, true),
    ('course-b1-tocfl', 'zh-TW', 20, 20, '時代華語 你-我的时代 lesson 1 方映红', 'video', 'https://www.youtube.com/watch?v=tzRQ860aLUU', 'tzRQ860aLUU', 'https://img.youtube.com/vi/tzRQ860aLUU/maxresdefault.jpg', 600, true),
    ('course-b2-discussion', 'zh-TW', 10, 10, '時代華語 – 旅行趣 蘇怡甄、李欣穎、陳意真', 'video', 'https://www.youtube.com/watch?v=20K5qtViMrc', '20K5qtViMrc', 'https://img.youtube.com/vi/20K5qtViMrc/maxresdefault.jpg', 600, true),
    ('course-b2-discussion', 'zh-TW', 20, 20, '時代華語 – 行旅台中GO', 'video', 'https://www.youtube.com/watch?v=a0XTzPbHKmU', 'a0XTzPbHKmU', 'https://img.youtube.com/vi/a0XTzPbHKmU/maxresdefault.jpg', 600, true),
    ('course-pro-industry', 'zh-TW', 10, 10, '以平板為核心的時代華語教學系統', 'video', 'https://www.youtube.com/watch?v=5MBhktwbPcY', '5MBhktwbPcY', 'https://img.youtube.com/vi/5MBhktwbPcY/maxresdefault.jpg', 600, true),
    ('course-pro-industry', 'zh-TW', 20, 20, '時代華語教學系統平臺2.0', 'video', 'https://www.youtube.com/watch?v=g65NjUsXqAA', 'g65NjUsXqAA', 'https://img.youtube.com/vi/g65NjUsXqAA/maxresdefault.jpg', 600, true),
    ('course-c1-leadership', 'zh-TW', 10, 10, '時代華語-防疫時代 張瓊云', 'video', 'https://www.youtube.com/watch?v=EKoYoHggGfY', 'EKoYoHggGfY', 'https://img.youtube.com/vi/EKoYoHggGfY/maxresdefault.jpg', 600, true),
    ('course-c1-leadership', 'zh-TW', 20, 20, '時代華語 華語界的新寵兒 feat るる先生 吳映儒', 'video', 'https://www.youtube.com/watch?v=lVcjLp2oUDA', 'lVcjLp2oUDA', 'https://img.youtube.com/vi/lVcjLp2oUDA/maxresdefault.jpg', 600, true)
ON CONFLICT (course_id, module_sort_order, lesson_sort_order) DO UPDATE SET
    title = EXCLUDED.title,
    lesson_type = EXCLUDED.lesson_type,
    content_url = EXCLUDED.content_url,
    external_video_id = EXCLUDED.external_video_id,
    thumbnail_url = EXCLUDED.thumbnail_url,
    duration_seconds = EXCLUDED.duration_seconds,
    is_required = EXCLUDED.is_required;
`;
