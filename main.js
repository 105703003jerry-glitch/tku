var state = {
    lang: window.getInitialLanguage(),
    user: null,
    courses: (window.TKCLC_DATA && window.TKCLC_DATA.courses) ? window.TKCLC_DATA.courses.slice() : []
};

function uiText(zh, en) {
    return state.lang === 'en' ? en : zh;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function apiRequest(method, url, payload) {
    var options = {
        method: method,
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (method === 'GET') {
        options.cache = 'no-store';
        options.headers['Cache-Control'] = 'no-store';
    }

    if (payload) {
        options.body = JSON.stringify(payload);
    }

    return fetch(url, options).then(function(response) {
        return response.text().then(function(text) {
            var data = {};

            try {
                data = text ? JSON.parse(text) : {};
            } catch (_error) {
                data = {};
            }

            if (!response.ok) {
                throw new Error(data.error || 'Request failed.');
            }

            return data;
        });
    });
}

function loadSession() {
    return apiRequest('GET', '/api/auth/me').then(function(data) {
        state.user = data.user || null;
    }).catch(function() {
        state.user = null;
    });
}

function loadCourses() {
    return apiRequest('GET', '/api/courses').then(function(data) {
        if (data.items && data.items.length) {
            state.courses = data.items;
        }
    }).catch(function() {
        state.courses = (window.TKCLC_DATA && window.TKCLC_DATA.courses) ? window.TKCLC_DATA.courses.slice() : [];
    });
}

function getLoginHref() {
    return '/login?next=' + encodeURIComponent('/app');
}

function getWorkspaceHref() {
    return '/app';
}

function getCourseLabel(map) {
    if (!map) {
        return '';
    }

    return map[state.lang] || map['zh-TW'] || map.en || '';
}

function getCourseThumbnail(course) {
    var lessons = course && course.lessons ? course.lessons : [];
    var firstLesson = lessons.length ? lessons[0] : null;

    if (firstLesson && firstLesson.thumbnailUrl) {
        return firstLesson.thumbnailUrl;
    }

    if (firstLesson && firstLesson.externalVideoId) {
        return 'https://i.ytimg.com/vi/' + firstLesson.externalVideoId + '/hqdefault.jpg';
    }

    return 'https://placehold.co/960x540/07091a/30cfd5?text=TKCLCLAB';
}

function getCourseChapterCount(course) {
    return course && course.lessons ? course.lessons.length : 0;
}

function getTrackCourses(track, limit) {
    var list = state.courses.filter(function(course) {
        return course.track === track;
    });

    return typeof limit === 'number' ? list.slice(0, limit) : list;
}

function openCourse() {
    window.location.href = state.user ? getWorkspaceHref() : getLoginHref();
}

function renderNavbar() {
    var userActions = state.user
        ? '' +
            '<div class="nav-actions">' +
                '<select id="lang-select" class="lang-select" aria-label="' + escapeHtml(uiText('語言', 'Language')) + '">' +
                    '<option value="zh-TW"' + (state.lang === 'zh-TW' ? ' selected' : '') + '>繁體中文</option>' +
                    '<option value="en"' + (state.lang === 'en' ? ' selected' : '') + '>English</option>' +
                '</select>' +
                '<span class="nav-user-pill">' + escapeHtml(state.user.name || state.user.email) + '</span>' +
                '<a href="/app" class="btn-primary">' + uiText('前往學習區', 'Go to Workspace') + '</a>' +
                '<button class="btn-text" id="logout-button" type="button">' + uiText('登出', 'Logout') + '</button>' +
            '</div>'
        : '' +
            '<div class="nav-actions">' +
                '<select id="lang-select" class="lang-select" aria-label="' + escapeHtml(uiText('語言', 'Language')) + '">' +
                    '<option value="zh-TW"' + (state.lang === 'zh-TW' ? ' selected' : '') + '>繁體中文</option>' +
                    '<option value="en"' + (state.lang === 'en' ? ' selected' : '') + '>English</option>' +
                '</select>' +
                '<a href="' + getLoginHref() + '" class="btn-text">' + uiText('登入', 'Login') + '</a>' +
                '<a href="' + getLoginHref() + '" class="btn-primary">' + uiText('免費開始', 'Start Free') + '</a>' +
            '</div>';

    return '' +
        '<nav class="navbar scrolled" id="navbar">' +
            '<div class="nav-container">' +
                '<div class="nav-logo"><a href="/">TKCLCLAB</a></div>' +
                '<ul class="nav-links">' +
                    '<li><a href="#courses">' + uiText('華語課程', 'Courses') + '</a></li>' +
                    '<li><a href="#pro">' + uiText('專業課程', 'Pro Courses') + '</a></li>' +
                    '<li><a href="#tocfl">' + uiText('TOCFL測驗', 'TOCFL Prep') + '</a></li>' +
                '</ul>' +
                userActions +
            '</div>' +
        '</nav>';
}

function renderHero() {
    return '' +
        '<header class="hero">' +
            '<div class="hero-bg-overlay"></div>' +
            '<div class="hero-content">' +
                '<h1 class="hero-title">' + uiText('打造屬於你的 AI 華語學習旅程', 'Build your AI-powered Mandarin learning journey') + '<br><span class="highlight">' + uiText('把專業教學內容帶到全球學習者身邊', 'Bring expert Mandarin teaching to learners worldwide') + '</span></h1>' +
                '<p class="hero-subtitle">' + uiText('透過影片學習、進度追蹤與 AI 助教整合，讓學習者能在同一個平台完成入門、考試準備與主題式進修。', 'Combine video learning, progress tracking, and an AI tutor so learners can study foundations, exam prep, and applied Mandarin in one platform.') + '</p>' +
                '<div class="hero-ctas">' +
                    '<a href="' + (state.user ? getWorkspaceHref() : getLoginHref()) + '" class="btn-hero-solid">' + uiText('立即開始', 'Start Now') + '</a>' +
                    '<a href="#courses" class="btn-hero-outline">' + uiText('了解更多', 'Learn More') + '</a>' +
                '</div>' +
            '</div>' +
            '<section class="service-cards-section">' +
                '<div class="service-cards-container">' +
                    '<div class="service-card">' +
                        '<div class="card-icon">⚡</div>' +
                        '<h3>' + uiText('AI 驅動內容學習', 'AI-powered lesson flow') + '</h3>' +
                        '<p>' + uiText('從影片章節、課程結構到學習提示，都用一致的流程幫助學習者持續前進。', 'Keep learners moving with a consistent flow across video chapters, course structure, and study prompts.') + '</p>' +
                    '</div>' +
                    '<div class="service-card">' +
                        '<div class="card-icon">👤</div>' +
                        '<h3>' + uiText('個人化華語教練', 'Personal Mandarin coaching') + '</h3>' +
                        '<p>' + uiText('登入後即可進入學習區，搭配 AI 助教與課程內容完成更聚焦的學習。', 'After sign-in, learners enter a focused workspace with an AI tutor and structured course content.') + '</p>' +
                    '</div>' +
                    '<div class="service-card">' +
                        '<div class="card-icon">📊</div>' +
                        '<h3>' + uiText('可追蹤的學習進度', 'Trackable learning progress') + '</h3>' +
                        '<p>' + uiText('系統會把 lesson 完成狀態同步到學習歷程，讓課程經營與學習追蹤更清楚。', 'Lesson completion syncs into learner progress so study history and course operations stay visible.') + '</p>' +
                    '</div>' +
                '</div>' +
            '</section>' +
        '</header>';
}

function renderFeatureSection() {
    return '' +
        '<section class="features">' +
            '<div class="section-container">' +
                '<h2 class="section-title">' + uiText('為什麼選擇 TKCLCLAB？', 'Why TKCLCLAB?') + '</h2>' +
                '<div class="features-grid">' +
                    '<div class="feature-item">' +
                        '<div class="feature-icon">🔍</div>' +
                        '<h4>' + uiText('AI 學習分析', 'AI learning insights') + '</h4>' +
                        '<p>' + uiText('以影片與 lesson 為核心整理學習重點，幫助學習者更快掌握內容。', 'Organize study focus around videos and lessons so learners can absorb the material faster.') + '</p>' +
                    '</div>' +
                    '<div class="feature-item">' +
                        '<div class="feature-icon">🤝</div>' +
                        '<h4>' + uiText('國際學習社群', 'Global learner access') + '</h4>' +
                        '<p>' + uiText('從公開首頁到登入後學習區，整體體驗更適合國際招生與長期經營。', 'From the public homepage to the signed-in workspace, the experience is better suited for global recruitment and retention.') + '</p>' +
                    '</div>' +
                    '<div class="feature-item">' +
                        '<div class="feature-icon">📈</div>' +
                        '<h4>' + uiText('TOCFL 目標導向', 'TOCFL-oriented pathways') + '</h4>' +
                        '<p>' + uiText('把程度、課程與學習路徑對齊，讓考試準備與能力提升更有方向。', 'Align levels, programs, and learning paths so exam preparation and skill growth are easier to follow.') + '</p>' +
                    '</div>' +
                    '<div class="feature-item">' +
                        '<div class="feature-icon">🚀</div>' +
                        '<h4>' + uiText('沉浸式影音學習', 'Immersive video learning') + '</h4>' +
                        '<p>' + uiText('以 YouTube lesson、AI 助教與進度同步組成真正可持續使用的學習工作台。', 'Combine YouTube lessons, an AI tutor, and synced progress into a workspace learners can keep using.') + '</p>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</section>';
}

function renderCourseCard(course) {
    return '' +
        '<div class="course-card" data-course-open="true">' +
            '<div class="course-thumbnail">' +
                '<img src="' + escapeHtml(getCourseThumbnail(course)) + '" alt="' + escapeHtml(getCourseLabel(course.title)) + '" loading="lazy">' +
                '<div class="course-level level-' + escapeHtml(String(course.level || '').toLowerCase()) + '">' + escapeHtml(course.level || '') + '</div>' +
                '<div class="course-play-btn">▶</div>' +
            '</div>' +
            '<div class="course-info">' +
                '<h3>' + escapeHtml(getCourseLabel(course.title)) + '</h3>' +
                '<p class="instructor">🎓 ' + escapeHtml(course.instructor || 'TKCLCLAB Faculty') + '</p>' +
                '<div class="course-meta">' +
                    '<span class="meta-item">⏱ ' + escapeHtml(course.duration || '') + '</span>' +
                    '<span class="meta-item">📌 ' + escapeHtml(String(getCourseChapterCount(course))) + ' ' + uiText('章節', 'lessons') + '</span>' +
                    '<span class="meta-item">🏷 ' + escapeHtml(getCourseLabel(course.trackLabel) || course.track || '') + '</span>' +
                '</div>' +
                '<div class="course-summary">' + escapeHtml(getCourseLabel(course.summary)) + '</div>' +
            '</div>' +
        '</div>';
}

function renderCourseSection(sectionId, titleZh, titleEn, bodyZh, bodyEn, courses) {
    return '' +
        '<section class="courses-preview" id="' + sectionId + '">' +
            '<div class="section-container">' +
                '<h2 class="section-title">' + uiText(titleZh, titleEn) + '</h2>' +
                '<p class="section-subtitle">' + uiText(bodyZh, bodyEn) + '</p>' +
                '<div class="courses-grid">' +
                    courses.map(renderCourseCard).join('') +
                '</div>' +
                '<div class="section-action">' +
                    '<a href="' + (state.user ? getWorkspaceHref() : getLoginHref()) + '" class="btn-hero-solid">' + uiText('進入學習平台', 'Enter the Learning Platform') + '</a>' +
                '</div>' +
            '</div>' +
        '</section>';
}

function renderCtaBanner() {
    return '' +
        '<section class="cta-banner">' +
            '<div class="cta-content">' +
                '<h2>' + uiText('準備好用 AI 更有效率地學華語了嗎？', 'Ready to study Mandarin more effectively with AI?') + '</h2>' +
                '<p>' + uiText('登入後即可進入課程影片、AI 助教與進度追蹤整合的學習工作台。', 'Sign in to access a learning workspace with course videos, AI tutoring, and synced progress tracking.') + '</p>' +
                '<a href="' + (state.user ? getWorkspaceHref() : getLoginHref()) + '" class="btn-cta">' + uiText('免費開始學習', 'Start Learning Free') + '</a>' +
            '</div>' +
        '</section>';
}

function renderFooter() {
    return '' +
        '<footer class="footer">' +
            '<div class="footer-container">' +
                '<div class="footer-brand">TKCLCLAB</div>' +
                '<p class="copyright">' + uiText('© 2026 TKCLCLAB. 保留所有權利。', '© 2026 TKCLCLAB. All rights reserved.') + '</p>' +
                '<div class="footer-links">' +
                    '<a href="' + getLoginHref() + '">' + uiText('登入', 'Login') + '</a>' +
                    '<a href="' + getWorkspaceHref() + '">' + uiText('學習區', 'Workspace') + '</a>' +
                    '<a href="mailto:' + escapeHtml(window.TKCLC_DATA.contact.email) + '">' + uiText('聯絡', 'Contact') + '</a>' +
                '</div>' +
            '</div>' +
        '</footer>';
}

function renderApp() {
    var app = document.getElementById('app');
    var coreCourses = getTrackCourses('mandarin-core', 3);
    var proCourses = getTrackCourses('professional-track', 3);
    var tocflCourses = getTrackCourses('tocfl-pathway', 3);

    document.documentElement.lang = state.lang;
    document.title = uiText('TKCLCLAB - AI 華語智能學習平台', 'TKCLCLAB - AI Mandarin Learning Platform');

    app.innerHTML = '' +
        renderNavbar() +
        renderHero() +
        renderFeatureSection() +
        renderCourseSection(
            'courses',
            '熱門華語課程',
            'Popular Mandarin Courses',
            '從基礎發音、生活會話到主題式學習，這些課程是平台最適合對外展示的學習入口。',
            'From pronunciation and daily communication to guided topic-based study, these programs serve as the main public learning entry point.',
            coreCourses
        ) +
        renderCourseSection(
            'pro',
            '專業華語課程',
            'Professional Mandarin Courses',
            '聚焦產業、商務與專業情境應用，適合已具備基礎能力後的延伸學習。',
            'Focused on industry, business, and professional communication scenarios for learners ready to go beyond the basics.',
            proCourses
        ) +
        renderCourseSection(
            'tocfl',
            'TOCFL 測驗路徑',
            'TOCFL Preparation Pathways',
            '以程度對應、模擬練習與能力提升為主軸，幫助學習者更有方向地準備 TOCFL。',
            'Built around level alignment, guided practice, and skill progression for learners preparing toward TOCFL goals.',
            tocflCourses
        ) +
        renderCtaBanner() +
        renderFooter();

    bindEvents();
}

function handleLogout() {
    apiRequest('POST', '/api/auth/logout').then(function() {
        state.user = null;
        renderApp();
    }).catch(function() {
        state.user = null;
        renderApp();
    });
}

function bindEvents() {
    var langSelect = document.getElementById('lang-select');
    var logoutButton = document.getElementById('logout-button');
    var courseButtons = document.querySelectorAll('[data-course-open="true"]');
    var index;

    if (langSelect) {
        langSelect.addEventListener('change', function(event) {
            state.lang = event.target.value;
            window.setLanguage(state.lang);
            renderApp();
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    for (index = 0; index < courseButtons.length; index += 1) {
        courseButtons[index].addEventListener('click', openCourse);
    }
}

window.addEventListener('DOMContentLoaded', function() {
    Promise.all([loadSession(), loadCourses()]).then(function() {
        renderApp();
    });
});
