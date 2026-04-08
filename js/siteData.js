window.TKCLC_DATA = {
    metrics: [
        {
            value: '12+',
            label: {
                'zh-TW': '可對外包裝的課程模組',
                en: 'Public-facing course modules'
            }
        },
        {
            value: 'A1-C1',
            label: {
                'zh-TW': 'TOCFL 對應學習路徑',
                en: 'TOCFL-aligned learning tracks'
            }
        },
        {
            value: '3',
            label: {
                'zh-TW': '合作方案模板',
                en: 'Partnership-ready offerings'
            }
        }
    ],
    trackOptions: [
        {
            value: 'mandarin-core',
            label: {
                'zh-TW': '核心華語',
                en: 'Core Mandarin'
            }
        },
        {
            value: 'tocfl-pathway',
            label: {
                'zh-TW': 'TOCFL 路徑',
                en: 'TOCFL Pathway'
            }
        },
        {
            value: 'professional-track',
            label: {
                'zh-TW': '專業華語',
                en: 'Professional Track'
            }
        }
    ],
    levelOptions: [
        { value: 'A1', label: 'A1' },
        { value: 'A2', label: 'A2' },
        { value: 'B1', label: 'B1' },
        { value: 'B2', label: 'B2' },
        { value: 'C1', label: 'C1' }
    ],
    highlights: [
        {
            icon: '01',
            title: {
                'zh-TW': '公開站點優先',
                en: 'Public-site first'
            },
            body: {
                'zh-TW': '先把招生、課程展示與品牌資訊做好，再逐步補後端功能，避免將測試用邏輯直接暴露在正式站。',
                en: 'The public experience comes first, so recruitment and brand messaging are solid before adding secure platform features.'
            }
        },
        {
            icon: '02',
            title: {
                'zh-TW': '更清楚的課程定位',
                en: 'Sharper program positioning'
            },
            body: {
                'zh-TW': '將課程分成核心華語、TOCFL 路徑與專業華語三大軸線，讓訪客更快理解適合自己的學習入口。',
                en: 'Programs are organized into core Mandarin, TOCFL pathways, and professional Mandarin offers for faster decision making.'
            }
        },
        {
            icon: '03',
            title: {
                'zh-TW': '安全邊界更清楚',
                en: 'Safer boundaries'
            },
            body: {
                'zh-TW': '移除前端假登入、假管理員與瀏覽器端 AI 金鑰流程，避免直接把敏感邏輯帶到正式部署。',
                en: 'Unsafe front-end auth, fake admin access, and browser-side AI credentials are removed from the public release.'
            }
        }
    ],
    courses: [
        {
            id: 'course-a1-foundations',
            track: 'mandarin-core',
            trackLabel: {
                'zh-TW': '核心華語',
                en: 'Core Mandarin'
            },
            level: 'A1',
            duration: '6 weeks',
            instructor: 'TKCLCLAB Faculty',
            format: {
                'zh-TW': '影片導讀 + 同步討論',
                en: 'Video-led with live discussion'
            },
            audience: {
                'zh-TW': '華語初學者',
                en: 'First-time Mandarin learners'
            },
            title: {
                'zh-TW': '華語基礎啟航',
                en: 'Mandarin Foundations'
            },
            summary: {
                'zh-TW': '建立發音、句型與日常溝通底盤，適合剛開始接觸華語的國際學習者。',
                en: 'A beginner-friendly course that builds pronunciation, sentence patterns, and everyday communication.'
            },
            description: {
                'zh-TW': '這門課將發音、日常對話與文化脈絡結合成一條清楚的學習線，適合作為正式招生的入門主力課程。',
                en: 'A public-facing flagship entry course combining pronunciation, everyday communication, and cultural context.'
            },
            outcomes: {
                'zh-TW': ['掌握注音與拼音對照', '完成自我介紹與生活會話', '建立固定複習節奏'],
                en: ['Master foundational pronunciation patterns', 'Handle self-introduction and daily conversation', 'Build a repeatable study routine']
            },
            modules: {
                'zh-TW': ['發音與聲調', '生活情境句型', '字詞辨識與複誦'],
                en: ['Pronunciation and tones', 'Daily-life sentence patterns', 'Vocabulary recognition and repetition']
            }
        },
        {
            id: 'course-a2-life',
            track: 'mandarin-core',
            trackLabel: {
                'zh-TW': '核心華語',
                en: 'Core Mandarin'
            },
            level: 'A2',
            duration: '8 weeks',
            instructor: 'TKCLCLAB Faculty',
            format: {
                'zh-TW': '主題式單元 + 任務練習',
                en: 'Theme-based modules with tasks'
            },
            audience: {
                'zh-TW': '已有基礎的學習者',
                en: 'Learners with basic Mandarin'
            },
            title: {
                'zh-TW': '生活華語應用',
                en: 'Mandarin for Daily Life'
            },
            summary: {
                'zh-TW': '以生活情境為主軸，提升聽說讀的整合能力。',
                en: 'An applied course that develops integrated listening, speaking, and reading through real-life situations.'
            },
            description: {
                'zh-TW': '課程從餐飲、交通、校園與社交互動切入，適合當成 A2 階段的標準招生方案。',
                en: 'This course covers food, transport, campus, and social interaction for a strong A2 public offer.'
            },
            outcomes: {
                'zh-TW': ['能描述需求與偏好', '提升短篇閱讀理解', '強化情境式口說'],
                en: ['Describe needs and preferences', 'Improve short-form reading comprehension', 'Strengthen situational speaking']
            },
            modules: {
                'zh-TW': ['購物與消費', '出行與方向', '校園與社交'],
                en: ['Shopping and transactions', 'Travel and directions', 'Campus and social interaction']
            }
        },
        {
            id: 'course-b1-tocfl',
            track: 'tocfl-pathway',
            trackLabel: {
                'zh-TW': 'TOCFL 路徑',
                en: 'TOCFL Pathway'
            },
            level: 'B1',
            duration: '10 weeks',
            instructor: 'TOCFL Coaching Team',
            format: {
                'zh-TW': '診斷 + 模擬題 + 回饋',
                en: 'Diagnostic, mock tests, and review'
            },
            audience: {
                'zh-TW': '準備 TOCFL 進階級的學習者',
                en: 'Learners targeting intermediate TOCFL'
            },
            title: {
                'zh-TW': 'TOCFL B1 衝刺路徑',
                en: 'TOCFL B1 Pathway'
            },
            summary: {
                'zh-TW': '結合題型分析、重點詞彙與閱讀策略，幫助學生有系統地準備 TOCFL。',
                en: 'A structured pathway for TOCFL preparation with vocabulary, reading strategy, and test familiarization.'
            },
            description: {
                'zh-TW': '這門課更適合當成考試導向商品與招生頁主打內容，能直接對外說明成果與進步路徑。',
                en: 'Designed as a recruitment-friendly exam-prep offer with clear outcomes and progression.'
            },
            outcomes: {
                'zh-TW': ['掌握 B1 常見題型', '建立閱讀與聽力策略', '追蹤模擬測驗進步'],
                en: ['Understand core B1 task types', 'Build listening and reading strategies', 'Track progress across mock assessments']
            },
            modules: {
                'zh-TW': ['題型拆解', '詞彙與語法強化', '模擬測驗與回顧'],
                en: ['Task analysis', 'Vocabulary and grammar reinforcement', 'Mock exams and review']
            }
        },
        {
            id: 'course-b2-discussion',
            track: 'tocfl-pathway',
            trackLabel: {
                'zh-TW': 'TOCFL 路徑',
                en: 'TOCFL Pathway'
            },
            level: 'B2',
            duration: '12 weeks',
            instructor: 'TOCFL Coaching Team',
            format: {
                'zh-TW': '專題閱讀 + 高階表達',
                en: 'Topic reading with advanced expression'
            },
            audience: {
                'zh-TW': '希望提升學術與論述能力者',
                en: 'Learners seeking stronger academic expression'
            },
            title: {
                'zh-TW': 'TOCFL B2 學術表達',
                en: 'TOCFL B2 Academic Expression'
            },
            summary: {
                'zh-TW': '聚焦高頻學術詞彙與觀點表達，提升高階聽讀與口語輸出。',
                en: 'A B2 track focused on academic vocabulary, argumentation, and stronger comprehension.'
            },
            description: {
                'zh-TW': '若未來要擴充正式學習平台，這類中高階課程最適合接續到付費班與教學服務。',
                en: 'This mid-to-advanced course is ideal for future paid cohorts and deeper platform services.'
            },
            outcomes: {
                'zh-TW': ['提升論述組織能力', '熟悉中高階詞彙', '完成模擬口語任務'],
                en: ['Improve argument structure', 'Expand higher-level vocabulary', 'Complete guided speaking tasks']
            },
            modules: {
                'zh-TW': ['主題閱讀', '觀點比較', '口語與寫作轉化'],
                en: ['Topical reading', 'Comparing perspectives', 'Speaking-to-writing transfer']
            }
        },
        {
            id: 'course-pro-industry',
            track: 'professional-track',
            trackLabel: {
                'zh-TW': '專業華語',
                en: 'Professional Track'
            },
            level: 'B2',
            duration: '6 weeks',
            instructor: 'Industry & Policy Faculty',
            format: {
                'zh-TW': '講座內容 + 導讀討論',
                en: 'Talk-based with guided discussion'
            },
            audience: {
                'zh-TW': '教育工作者與進階學習者',
                en: 'Educators and advanced learners'
            },
            title: {
                'zh-TW': '華語產業觀察',
                en: 'Mandarin Industry Insights'
            },
            summary: {
                'zh-TW': '以產業、政策與國際案例為主軸，建立更高層次的語言與內容理解。',
                en: 'A professional track using policy, industry, and international cases as learning material.'
            },
            description: {
                'zh-TW': '這種內容特別適合學校合作、師培專班或品牌內容輸出，能拉開與一般課程網站的差異。',
                en: 'A distinctive professional offer for institutional partnerships, teacher development, and premium content tracks.'
            },
            outcomes: {
                'zh-TW': ['理解專業主題華語', '練習跨文化討論', '建立產業語彙庫'],
                en: ['Interpret professional Mandarin topics', 'Practice cross-cultural discussion', 'Build an industry-focused vocabulary bank']
            },
            modules: {
                'zh-TW': ['政策議題導讀', '國際案例分析', '主題討論任務'],
                en: ['Policy topic briefings', 'International case analysis', 'Structured discussion tasks']
            }
        },
        {
            id: 'course-c1-leadership',
            track: 'professional-track',
            trackLabel: {
                'zh-TW': '專業華語',
                en: 'Professional Track'
            },
            level: 'C1',
            duration: '8 weeks',
            instructor: 'Advanced Communication Faculty',
            format: {
                'zh-TW': '簡報、討論與案例輸出',
                en: 'Presentations, discussion, and case output'
            },
            audience: {
                'zh-TW': '高階學習者與雙語專業人士',
                en: 'Advanced learners and bilingual professionals'
            },
            title: {
                'zh-TW': '高階華語溝通與領導',
                en: 'Advanced Mandarin Communication'
            },
            summary: {
                'zh-TW': '以專業簡報、談判與決策語言為核心，打造高階品牌課程。',
                en: 'A premium communication course focused on presentations, negotiation, and high-level expression.'
            },
            description: {
                'zh-TW': '這是公開網站中最能提升品牌高度的旗艦課程，適合作為高端合作方案的代表內容。',
                en: 'This flagship course elevates the public brand and anchors premium partnership conversations.'
            },
            outcomes: {
                'zh-TW': ['完成高階主題簡報', '提升說服與協商表達', '建立專業情境應對力'],
                en: ['Deliver advanced topic presentations', 'Improve persuasive and negotiation language', 'Respond confidently in professional situations']
            },
            modules: {
                'zh-TW': ['策略簡報', '協商語言', '案例模擬'],
                en: ['Strategic presentations', 'Negotiation language', 'Scenario simulation']
            }
        }
    ],
    programs: [
        {
            badge: {
                'zh-TW': '招生型方案',
                en: 'Recruitment offer'
            },
            title: {
                'zh-TW': '公開課程招生頁',
                en: 'Public enrollment showcase'
            },
            body: {
                'zh-TW': '用清楚的課程分級、學習成果與洽談入口，把網站變成真正能說服學生與家長的招生頁。',
                en: 'A public course site with clear levels, outcomes, and contact paths that supports recruitment conversations.'
            },
            points: {
                'zh-TW': ['適合短期課與常態招生', '清楚展示課程差異', '保留未來串接報名系統的彈性'],
                en: ['Best for regular intake and short programs', 'Makes program differences easy to understand', 'Leaves room for future enrollment integrations']
            }
        },
        {
            badge: {
                'zh-TW': '合作型方案',
                en: 'Partnership offer'
            },
            title: {
                'zh-TW': '學校與機構合作頁',
                en: 'Institutional partnership page'
            },
            body: {
                'zh-TW': '針對學校、中心與合作單位整理課程模組、交付方式與支援範圍，讓合作洽談更具體。',
                en: 'Package modules, delivery formats, and support scope for schools, centers, and institutional partners.'
            },
            points: {
                'zh-TW': ['適合校際合作與專班', '可延伸到企業訓練', '可作為 proposal landing page'],
                en: ['Useful for school partnerships and cohorts', 'Can extend into corporate training', 'Works as a proposal landing page']
            }
        },
        {
            badge: {
                'zh-TW': '品牌型方案',
                en: 'Brand offer'
            },
            title: {
                'zh-TW': '高階品牌與內容展示',
                en: 'Premium brand positioning'
            },
            body: {
                'zh-TW': '透過專業華語與高階路徑課程，建立 TKCLCLAB 不只是課程平台，而是有觀點的華語教育品牌。',
                en: 'Use advanced and professional tracks to position TKCLCLAB as a thoughtful education brand, not only a course site.'
            },
            points: {
                'zh-TW': ['拉高網站品牌感', '適合高單價方案', '有利未來內容產品化'],
                en: ['Elevates perceived brand value', 'Supports premium offerings', 'Prepares future content productization']
            }
        }
    ],
    process: [
        {
            title: {
                'zh-TW': '先定義公開資訊架構',
                en: 'Define the public information architecture first'
            },
            body: {
                'zh-TW': '首頁、課程頁、方案頁與聯絡頁先說清楚價值，再決定哪些流程要進後台。',
                en: 'Clarify the home, course, program, and contact experience before moving anything sensitive into platform features.'
            }
        },
        {
            title: {
                'zh-TW': '將敏感功能移出瀏覽器',
                en: 'Move sensitive logic out of the browser'
            },
            body: {
                'zh-TW': '登入、權限、AI 金鑰、學習紀錄與管理操作應交由後端服務處理。',
                en: 'Authentication, roles, AI credentials, learning records, and admin operations should be handled by back-end services.'
            }
        },
        {
            title: {
                'zh-TW': '再串接真正的營運工具',
                en: 'Integrate real operations next'
            },
            body: {
                'zh-TW': '當公開站點穩定後，再接表單、自動寄信、CRM、課程後台與 AI 助教。',
                en: 'Once the public site is stable, add forms, auto-replies, CRM, course management, and AI tutoring securely.'
            }
        }
    ],
    testimonials: [
        {
            name: 'Program Director',
            role: {
                'zh-TW': '國際課程合作窗口',
                en: 'International program lead'
            },
            quote: {
                'zh-TW': '新的網站版本更像正式教育品牌官網，合作單位可以很快理解課程層級與合作形式。',
                en: 'The rebuilt site feels like a real education brand website, and partners can understand levels and delivery formats quickly.'
            }
        },
        {
            name: 'Admissions Partner',
            role: {
                'zh-TW': '招生與行銷夥伴',
                en: 'Recruitment and marketing partner'
            },
            quote: {
                'zh-TW': '以前像功能展示，現在更像能拿去招生與談合作的正式頁面。',
                en: 'It used to feel like a feature demo. Now it feels ready for recruitment and partnership conversations.'
            }
        }
    ],
    faq: [
        {
            question: {
                'zh-TW': '為什麼這個版本拿掉了登入與管理後台？',
                en: 'Why were login and admin removed from this release?'
            },
            answer: {
                'zh-TW': '因為原本的登入、權限與管理邏輯都在前端 localStorage，這不適合正式公開部署。公開版應先保留安全的展示與聯絡能力。',
                en: 'Because the original login, roles, and admin logic lived in front-end localStorage, which is not suitable for public production deployment.'
            }
        },
        {
            question: {
                'zh-TW': 'AI 助教功能去哪裡了？',
                en: 'What happened to the AI tutor?'
            },
            answer: {
                'zh-TW': 'AI 助教仍然可以做，但應該改成由後端代理模型呼叫、保護 API 金鑰並記錄使用情況，而不是讓瀏覽器直接呼叫。',
                en: 'The AI tutor can still be built, but it should be moved behind a secure back-end proxy that protects credentials and usage.'
            }
        },
        {
            question: {
                'zh-TW': '這個版本可以直接上線嗎？',
                en: 'Can this version be deployed right away?'
            },
            answer: {
                'zh-TW': '可以，作為公開品牌網站是安全得多的版本。若要加入登入、付款、後台或 AI 功能，建議再進行後端開發。',
                en: 'Yes, this version is much safer to deploy as a public brand site. Auth, payments, admin, or AI features should come in a later back-end phase.'
            }
        }
    ],
    contactCards: [
        {
            icon: '◎',
            title: {
                'zh-TW': '公開課程展示',
                en: 'Public course showcase'
            },
            body: {
                'zh-TW': '適合官網首頁、課程目錄與招生頁面。',
                en: 'Ideal for the home page, catalog, and recruitment flows.'
            }
        },
        {
            icon: '◌',
            title: {
                'zh-TW': '合作方案規劃',
                en: 'Partnership packaging'
            },
            body: {
                'zh-TW': '可延伸為學校合作、專班或品牌內容方案。',
                en: 'Can expand into institutional cohorts, partnerships, or branded content offers.'
            }
        }
    ],
    contactInterests: [
        {
            value: 'public-site',
            label: {
                'zh-TW': '公開網站與招生頁',
                en: 'Public website and recruitment pages'
            }
        },
        {
            value: 'school-program',
            label: {
                'zh-TW': '學校合作 / 專班',
                en: 'School partnership / cohort program'
            }
        },
        {
            value: 'corporate-training',
            label: {
                'zh-TW': '企業訓練',
                en: 'Corporate training'
            }
        },
        {
            value: 'platform-build',
            label: {
                'zh-TW': '平台與後端建置',
                en: 'Platform and back-end build'
            }
        }
    ],
    contact: {
        email: '105703003jerry@gmail.com',
        region: {
            'zh-TW': '台灣與國際合作',
            en: 'Taiwan and international partnerships'
        },
        reply: {
            'zh-TW': '通常 2 個工作天內',
            en: 'Usually within 2 business days'
        }
    }
};
