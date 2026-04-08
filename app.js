var portalState = {
    lang: window.getInitialLanguage(),
    loading: true,
    user: null,
    dashboard: null,
    courses: window.TKCLC_DATA.courses.slice(),
    lessonDetailsByCourse: {},
    authStatus: { type: '', message: '' },
    progressStatus: { type: '', message: '' },
    aiStatus: { type: '', message: '' },
    adminStatus: { type: '', message: '' },
    selectedCourseId: window.TKCLC_DATA.courses[0].id,
    selectedLessonId: null,
    aiConversationId: null,
    aiMessages: [],
    adminItems: []
};

function portalText(zh, en) {
    return portalState.lang === 'en' ? en : zh;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getCourseById(courseId) {
    var index;
    for (index = 0; index < portalState.courses.length; index += 1) {
        if (portalState.courses[index].id === courseId) {
            return portalState.courses[index];
        }
    }
    return portalState.courses[0];
}

function getEnrollment(courseId) {
    var items = portalState.dashboard && portalState.dashboard.enrollments ? portalState.dashboard.enrollments : [];
    var index;
    for (index = 0; index < items.length; index += 1) {
        if (items[index].course_id === courseId) {
            return items[index];
        }
    }
    return null;
}

function getCourseLessons(course) {
    return course && course.lessons ? course.lessons : [];
}

function getCourseLessonData(courseId) {
    return portalState.lessonDetailsByCourse[courseId] || null;
}

function getLessonList(course) {
    var detail = getCourseLessonData(course.id);
    if (detail && detail.lessons && detail.lessons.length) {
        return detail.lessons;
    }
    return getCourseLessons(course);
}

function getLessonValue(lesson, camelKey, snakeKey, fallback) {
    if (!lesson) {
        return fallback;
    }

    if (typeof lesson[camelKey] !== 'undefined' && lesson[camelKey] !== null) {
        return lesson[camelKey];
    }

    if (typeof lesson[snakeKey] !== 'undefined' && lesson[snakeKey] !== null) {
        return lesson[snakeKey];
    }

    return fallback;
}

function getLessonTitle(lesson) {
    return getLessonValue(lesson, 'title', 'title', '');
}

function getLessonVideoId(lesson) {
    return getLessonValue(lesson, 'externalVideoId', 'external_video_id', '');
}

function getLessonThumbnail(lesson) {
    return getLessonValue(lesson, 'thumbnailUrl', 'thumbnail_url', '');
}

function getLessonDurationSeconds(lesson) {
    return Number(getLessonValue(lesson, 'durationSeconds', 'duration_seconds', 0) || 0);
}

function formatDuration(seconds) {
    var totalSeconds = Math.max(0, Number(seconds) || 0);
    var minutes = Math.round(totalSeconds / 60);

    if (!minutes) {
        return portalText('短片', 'Short lesson');
    }

    return minutes + ' ' + portalText('分鐘', 'min');
}

function getLessonStatusLabel(status) {
    if (status === 'completed') {
        return portalText('已完成', 'Completed');
    }

    if (status === 'in_progress') {
        return portalText('學習中', 'In progress');
    }

    return portalText('未開始', 'Not started');
}

function getLessonStatusIcon(status) {
    if (status === 'completed') {
        return '✓';
    }

    if (status === 'in_progress') {
        return '•';
    }

    return '○';
}

function getInstructorBadge(name) {
    var label = String(name || 'TK').replace(/\s+/g, '').slice(0, 2).toUpperCase();
    return label || 'TK';
}

function getLessonSummary(course) {
    var detail = getCourseLessonData(course.id);
    var enrollment = getEnrollment(course.id);
    var lessons = getLessonList(course);

    if (detail && detail.summary) {
        return detail.summary;
    }

    return {
        enrollmentId: enrollment ? enrollment.id : null,
        completedLessons: enrollment ? Number(enrollment.completed_lessons_count_snapshot || enrollment.completed_units || 0) : 0,
        totalLessons: lessons.length,
        progressPercent: enrollment ? Number(enrollment.progress_percent || 0) : 0,
        currentModule: enrollment && enrollment.current_module ? enrollment.current_module : '',
        notes: enrollment && enrollment.notes ? enrollment.notes : ''
    };
}

function getLessonProgressItem(courseId, lessonId) {
    var detail = getCourseLessonData(courseId);
    var lessons = detail && detail.lessons ? detail.lessons : [];
    var index;

    for (index = 0; index < lessons.length; index += 1) {
        if (String(lessons[index].id) === String(lessonId)) {
            return lessons[index];
        }
    }

    return null;
}

function getSelectedLesson(course) {
    var lessons = getLessonList(course);
    var index;

    if (!lessons.length) {
        return null;
    }

    for (index = 0; index < lessons.length; index += 1) {
        if (String(lessons[index].id) === String(portalState.selectedLessonId)) {
            return lessons[index];
        }
    }

    portalState.selectedLessonId = lessons[0].id;
    return lessons[0];
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

function loadCourses() {
    return apiRequest('GET', '/api/courses').then(function(data) {
        if (data.items && data.items.length) {
            portalState.courses = data.items;
            portalState.selectedCourseId = getCourseById(portalState.selectedCourseId).id;
            if (!portalState.selectedLessonId && getCourseLessons(portalState.courses[0]).length) {
                portalState.selectedLessonId = getCourseLessons(portalState.courses[0])[0].id;
            }
        }
    }).catch(function() {
        portalState.courses = window.TKCLC_DATA.courses.slice();
    });
}

function loadSession() {
    return apiRequest('GET', '/api/auth/me').then(function(data) {
        portalState.user = data.user;
        if (!portalState.user) {
            portalState.dashboard = null;
            portalState.lessonDetailsByCourse = {};
            portalState.selectedLessonId = null;
            portalState.aiConversationId = null;
            portalState.aiMessages = [];
        }
    }).catch(function() {
        portalState.user = null;
        portalState.dashboard = null;
    });
}

function redirectToLogin() {
    window.location.replace('/login?next=' + encodeURIComponent('/app'));
}

function loadCourseDetail(courseId) {
    if (!portalState.user || !courseId) {
        return Promise.resolve();
    }

    return apiRequest('GET', '/api/learn/progress?courseId=' + encodeURIComponent(courseId)).then(function(data) {
        portalState.lessonDetailsByCourse[courseId] = data;
        if (data.lessons && data.lessons.length) {
            if (!getLessonProgressItem(courseId, portalState.selectedLessonId)) {
                portalState.selectedLessonId = data.lessons[0].id;
            }
        }
    }).catch(function(error) {
        portalState.progressStatus = {
            type: 'error',
            message: error.message
        };
    });
}

function loadDashboard() {
    if (!portalState.user) {
        return Promise.resolve();
    }

    return apiRequest('GET', '/api/learn/dashboard').then(function(data) {
        portalState.dashboard = data;
        if (data.enrollments && data.enrollments.length) {
            portalState.selectedCourseId = data.enrollments[0].course_id;
        }
        return loadCourseDetail(portalState.selectedCourseId);
    }).catch(function(error) {
        portalState.progressStatus = {
            type: 'error',
            message: error.message
        };
    });
}

function loadAdminInquiries() {
    if (!portalState.user) {
        return Promise.resolve();
    }

    portalState.adminStatus = {
        type: '',
        message: portalText('正在載入詢問資料...', 'Loading inquiries...')
    };
    renderPortal();

    return apiRequest('GET', '/api/admin/inquiries').then(function(data) {
        portalState.adminItems = data.items || [];
        portalState.adminStatus = {
            type: 'success',
            message: portalText('已載入最新詢問資料。', 'Latest inquiries loaded.')
        };
        renderPortal();
    }).catch(function(error) {
        portalState.adminStatus = {
            type: 'error',
            message: error.message
        };
        renderPortal();
    });
}

function bootstrapPortal() {
    portalState.loading = true;
    renderPortal();
    loadCourses().then(function() {
        return loadSession();
    }).then(function() {
        if (!portalState.user) {
            redirectToLogin();
            return null;
        }
        return loadDashboard();
    }).then(function() {
        if (!portalState.user) {
            return;
        }
        portalState.loading = false;
        renderPortal();
    });
}

function renderHeader() {
    var userLabel = portalState.user
        ? escapeHtml(portalState.user.name + ' · ' + portalState.user.email)
        : portalText('未登入', 'Not signed in');

    return `
        <header class="portal-header">
            <a class="portal-brand" href="/">
                <span class="portal-mark">TK</span>
                <span class="portal-brand-copy">
                    <strong>TKCLCLAB Portal</strong>
                    <span>${portalText('學員學習區與營運後台', 'Learner workspace and operations console')}</span>
                </span>
            </a>
            <div class="portal-actions">
                <label class="portal-meta">
                    ${window.t('lang_label')}
                    <select id="portal-lang-select">
                        ${window.LANG_OPTIONS.map(function(option) {
                            return '<option value="' + option.value + '"' + (option.value === portalState.lang ? ' selected' : '') + '>' + option.label + '</option>';
                        }).join('')}
                    </select>
                </label>
                <span class="portal-meta">${userLabel}</span>
                <a class="portal-button-secondary" href="/">${portalText('返回官網', 'Back to site')}</a>
                ${portalState.user ? '<button class="portal-button" id="portal-logout-button">' + portalText('登出', 'Sign out') + '</button>' : ''}
            </div>
        </header>
    `;
}

function renderHero() {
    return `
        <section class="portal-hero">
            <span class="portal-pill">${portalText('Lesson-Based Portal', 'Lesson-based portal')}</span>
            <h1>${portalText('影片 lesson、學習進度與 AI 助教，現在整合在同一個學習工作台。', 'Lessons, progress tracking, and the AI tutor now live inside one learning workspace.')}</h1>
            <p>${portalText('你可以直接在這裡觀看 YouTube 課程、切換 lesson、標記完成進度，並在右側用 AI 助教整理重點與提問。', 'Watch YouTube lessons, switch between units, mark completion, and use the AI tutor on the right to summarize and ask follow-up questions.')}</p>
        </section>
    `;
}

function renderAuth() {
    return `
        <section class="portal-section portal-auth">
            <article class="portal-card">
                <div class="portal-meta">${portalText('建立學員帳號', 'Create learner account')}</div>
                <h3>${portalText('開始觀看影片與追蹤進度', 'Watch lessons and track progress')}</h3>
                <form class="portal-form" id="register-form">
                    <div class="portal-field">
                        <label>${portalText('姓名', 'Name')}</label>
                        <input name="name" required>
                    </div>
                    <div class="portal-field">
                        <label>Email</label>
                        <input name="email" type="email" required>
                    </div>
                    <div class="portal-field">
                        <label>${portalText('密碼', 'Password')}</label>
                        <input name="password" type="password" minlength="8" required>
                    </div>
                    <button class="portal-button" type="submit">${portalText('註冊並登入', 'Register and sign in')}</button>
                </form>
            </article>
            <article class="portal-card">
                <div class="portal-meta">${portalText('已有帳號', 'Returning learner')}</div>
                <h3>${portalText('登入學員入口', 'Sign in to the portal')}</h3>
                <form class="portal-form" id="login-form">
                    <div class="portal-field">
                        <label>Email</label>
                        <input name="email" type="email" required>
                    </div>
                    <div class="portal-field">
                        <label>${portalText('密碼', 'Password')}</label>
                        <input name="password" type="password" required>
                    </div>
                    <button class="portal-button-secondary" type="submit">${portalText('登入', 'Sign in')}</button>
                </form>
            </article>
        </section>
    `;
}

function renderStats() {
    var stats = portalState.dashboard && portalState.dashboard.stats ? portalState.dashboard.stats : {
        enrollment_count: 0,
        avg_progress: 0
    };
    var enrolledCount = Number(stats.enrollment_count || 0);
    var avgProgress = Number(stats.avg_progress || 0);
    var aiCount = portalState.aiMessages.length ? Math.ceil(portalState.aiMessages.length / 2) : 0;

    return `
        <section class="portal-section portal-stats">
            <article class="portal-stat">
                <div class="portal-meta">${portalText('已加入課程', 'Enrolled courses')}</div>
                <div class="portal-stat-value">${enrolledCount}</div>
            </article>
            <article class="portal-stat">
                <div class="portal-meta">${portalText('平均進度', 'Average progress')}</div>
                <div class="portal-stat-value">${avgProgress}%</div>
            </article>
            <article class="portal-stat">
                <div class="portal-meta">${portalText('本次 AI 對話輪數', 'AI turns this session')}</div>
                <div class="portal-stat-value">${aiCount}</div>
            </article>
        </section>
    `;
}

function renderCourses() {
    return `
        <section class="portal-section">
            <div class="portal-inline-actions">
                <div>
                    <div class="portal-meta">${portalText('課程目錄', 'Catalog')}</div>
                    <h2>${portalText('選課與影片 lesson', 'Course selection and video lessons')}</h2>
                </div>
            </div>
            <div class="portal-course-grid">
                ${portalState.courses.map(function(course) {
                    var enrollment = getEnrollment(course.id);
                    var progressValue = enrollment ? Number(enrollment.progress_percent || 0) : 0;
                    var lessonCount = getLessonList(course).length;
                    return `
                        <article class="portal-course ${portalState.selectedCourseId === course.id ? 'active' : ''}">
                            <div class="portal-course-tags">
                                <span class="portal-tag">${escapeHtml(course.trackLabel[portalState.lang])}</span>
                                <span class="portal-tag">${escapeHtml(course.level)}</span>
                                <span class="portal-tag">${lessonCount} ${portalText('部影片', 'videos')}</span>
                            </div>
                            <h3>${escapeHtml(course.title[portalState.lang])}</h3>
                            <p class="portal-muted">${escapeHtml(course.summary[portalState.lang])}</p>
                            <div class="portal-progress-bar">
                                <div class="portal-progress-fill" style="width:${progressValue}%"></div>
                            </div>
                            <div class="portal-meta">${portalText('目前進度', 'Current progress')}: ${progressValue}%</div>
                            <div class="portal-inline-actions" style="margin-top:14px;">
                                <button class="portal-button-secondary portal-select-course" data-course-id="${course.id}">${portalText('查看 lesson', 'View lessons')}</button>
                                <button class="portal-button portal-enroll-course" data-course-id="${course.id}">${enrollment ? portalText('繼續學習', 'Continue') : portalText('加入課程', 'Enroll')}</button>
                            </div>
                        </article>
                    `;
                }).join('')}
            </div>
        </section>
    `;
}

function renderLearningStudio() {
    var course = getCourseById(portalState.selectedCourseId);
    var summary = getLessonSummary(course);
    var lessons = getLessonList(course);
    var selectedLesson = getSelectedLesson(course);
    var selectedProgress = selectedLesson ? getLessonProgressItem(course.id, selectedLesson.id) : null;
    var currentStatus = selectedProgress && selectedProgress.status ? selectedProgress.status : 'not_started';
    var selectedLessonTitle = getLessonTitle(selectedLesson);
    var selectedLessonVideoId = getLessonVideoId(selectedLesson);
    var selectedLessonDuration = formatDuration(getLessonDurationSeconds(selectedLesson));
    var videoEmbedUrl = selectedLessonVideoId
        ? 'https://www.youtube-nocookie.com/embed/' + selectedLessonVideoId + '?rel=0&modestbranding=1'
        : '';
    var progressValue = Number(summary.progressPercent || 0);
    var lessonListHtml = lessons.map(function(lesson) {
        var lessonProgress = getLessonProgressItem(course.id, lesson.id);
        var status = lessonProgress && lessonProgress.status ? lessonProgress.status : 'not_started';
        var lessonTitle = getLessonTitle(lesson);
        var duration = formatDuration(getLessonDurationSeconds(lesson));
        return `
            <button class="portal-segment-item ${String(portalState.selectedLessonId) === String(lesson.id) ? 'active' : ''} ${status === 'completed' ? 'completed' : ''}" data-lesson-select="${lesson.id}">
                <span class="portal-seg-check">${escapeHtml(getLessonStatusIcon(status))}</span>
                <span class="portal-seg-time">${escapeHtml(duration)}</span>
                <span class="portal-seg-title">${escapeHtml(lessonTitle)}</span>
            </button>
        `;
    }).join('');

    return `
        <section class="portal-section portal-player-page">
            <div class="portal-player-container">
                <div class="portal-player-main">
                    ${selectedLesson && selectedLessonVideoId ? `
                        <div class="portal-video-wrapper">
                            <iframe
                                src="${videoEmbedUrl}"
                                title="${escapeHtml(selectedLessonTitle)}"
                                loading="lazy"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerpolicy="strict-origin-when-cross-origin"
                                allowfullscreen
                            ></iframe>
                        </div>
                    ` : '<div class="portal-empty">' + portalText('這門課目前還沒有可嵌入的影片 lesson。', 'This course does not have an embeddable lesson yet.') + '</div>'}

                    <div class="portal-video-info">
                        <div class="portal-player-info-header">
                            <div>
                                <div class="portal-player-tags">
                                    <span class="portal-tag">${escapeHtml(course.trackLabel[portalState.lang])}</span>
                                    <span class="portal-tag">${escapeHtml(course.level)}</span>
                                    <span class="portal-tag">${escapeHtml(getLessonStatusLabel(currentStatus))}</span>
                                    <span class="portal-tag">${escapeHtml(selectedLessonDuration)}</span>
                                </div>
                                <h2 class="portal-video-title">${escapeHtml(course.title[portalState.lang])}</h2>
                                <div class="portal-player-subtitle">${escapeHtml(selectedLessonTitle)}</div>
                            </div>
                            <div class="portal-player-progress-wrap">
                                <div class="portal-meta">${portalText('學習進度', 'Progress')}</div>
                                <div class="portal-progress-bar">
                                    <div class="portal-progress-fill" style="width:${progressValue}%"></div>
                                </div>
                                <div class="portal-player-progress-value">${progressValue}%</div>
                            </div>
                        </div>

                        <div class="portal-player-instructor-row">
                            <div class="portal-instructor-avatar">${escapeHtml(getInstructorBadge(course.instructor))}</div>
                            <div>
                                <div class="portal-instructor-name">${escapeHtml(course.instructor)}</div>
                                <div class="portal-instructor-bio">${escapeHtml(course.format[portalState.lang])}</div>
                            </div>
                            <div class="portal-course-stats-row">
                                <span>${portalText('影片', 'Videos')} ${summary.totalLessons}</span>
                                <span>${portalText('完成', 'Done')} ${summary.completedLessons}</span>
                                <span>${escapeHtml(course.duration)}</span>
                            </div>
                        </div>

                        <div class="portal-course-desc">
                            <h3>${portalText('課程介紹', 'Course overview')}</h3>
                            <p>${escapeHtml(course.description[portalState.lang])}</p>
                        </div>

                        <div class="portal-tabs">
                            <button class="portal-tab active" type="button">${portalText('章節跳轉', 'Lesson list')}</button>
                            <button class="portal-tab" type="button">${portalText('學習筆記', 'Notes')}</button>
                        </div>

                        <div class="portal-syllabus-section">
                            <div class="portal-syllabus-section-title">
                                <span>${portalText('課程章節', 'Course lessons')}</span>
                                <span class="portal-sec-count">${summary.totalLessons} ${portalText('課', 'items')}</span>
                            </div>
                            <div class="portal-segment-list">
                                ${lessonListHtml}
                            </div>
                        </div>

                        <div class="portal-note-panel">
                            <form class="portal-form" id="progress-form">
                                <input type="hidden" name="courseId" value="${escapeHtml(course.id)}">
                                <input type="hidden" name="progressPercent" value="${summary.progressPercent}">
                                <input type="hidden" name="completedUnits" value="${summary.completedLessons}">
                                <input type="hidden" name="totalUnits" value="${summary.totalLessons}">
                                <input type="hidden" name="currentModule" value="${escapeHtml(selectedLessonTitle)}">
                                <div class="portal-field">
                                    <label>${portalText('學習筆記', 'Learning notes')}</label>
                                    <textarea name="notes">${escapeHtml(summary.notes || '')}</textarea>
                                </div>
                                <button class="portal-button-secondary" type="submit">${portalText('儲存筆記', 'Save notes')}</button>
                            </form>
                            <div class="portal-note">${portalText('看完影片後可以在右側問 AI，也可以在這裡記錄句型、重點詞彙與待複習內容。', 'After watching the lesson, ask the AI on the right or use this space to record patterns, vocabulary, and review notes.')}</div>
                        </div>

                        ${portalState.progressStatus.message ? '<div class="portal-status ' + portalState.progressStatus.type + '">' + escapeHtml(portalState.progressStatus.message) + '</div>' : ''}
                    </div>
                </div>

                <aside class="portal-player-sidebar">
                    <div class="portal-ai-tutor">
                        <div class="portal-ai-header">
                            <div class="portal-ai-avatar-wrap">AI</div>
                            <div>
                                <div class="portal-ai-name">${portalText('AI 助教', 'AI tutor')}</div>
                                <div class="portal-ai-sub">${portalText('影片學習側欄', 'Lesson sidebar')}</div>
                            </div>
                            <div class="portal-ai-status-dot ${portalState.aiStatus.type === '' ? '' : 'active'}"></div>
                        </div>

                        <div class="portal-ai-context-banner">
                            <span>${portalText('目前 lesson', 'Current lesson')}</span>
                            <strong>${escapeHtml(selectedLessonTitle)}</strong>
                        </div>

                        <div class="portal-sidebar-summary">
                            <div class="portal-sidebar-metric">
                                <span>${portalText('已完成', 'Completed')}</span>
                                <strong>${summary.completedLessons}/${summary.totalLessons}</strong>
                            </div>
                            <div class="portal-sidebar-metric">
                                <span>${portalText('目前進度', 'Progress')}</span>
                                <strong>${progressValue}%</strong>
                            </div>
                        </div>

                        <div class="portal-inline-actions portal-sidebar-actions">
                            <button class="portal-button-secondary portal-lesson-action" data-lesson-id="${selectedLesson ? selectedLesson.id : ''}" data-lesson-status="in_progress">${portalText('開始 / 繼續', 'Start / resume')}</button>
                            <button class="portal-button portal-lesson-action" data-lesson-id="${selectedLesson ? selectedLesson.id : ''}" data-lesson-status="completed">${portalText('標記完成', 'Mark complete')}</button>
                        </div>

                        <div class="portal-ai-chat">
                            ${portalState.aiMessages.length ? portalState.aiMessages.map(function(item) {
                                return '<div class="portal-message ' + escapeHtml(item.role) + '"><strong>' + escapeHtml(item.role === 'assistant' ? 'AI Tutor' : 'You') + '</strong>' + escapeHtml(item.content) + '</div>';
                            }).join('') : '<div class="portal-empty">' + portalText('還沒有對話。你可以請 AI 解釋這支影片的句型、整理重點或幫你出複習題。', 'No conversation yet. Ask the AI to explain patterns, summarize this lesson, or generate review questions.') + '</div>'}
                        </div>

                        <form class="portal-form portal-ai-form" id="ai-form">
                            <div class="portal-field">
                                <label>${portalText('提問 AI 助教', 'Ask the AI tutor')}</label>
                                <textarea name="message" placeholder="${portalText('例如：幫我整理這支影片的三個重點句型。', 'For example: summarize three key sentence patterns from this lesson.')}"></textarea>
                            </div>
                            <button class="portal-button" type="submit">${portalText('送出問題', 'Send question')}</button>
                        </form>

                        ${portalState.aiStatus.message ? '<div class="portal-status ' + portalState.aiStatus.type + '">' + escapeHtml(portalState.aiStatus.message) + '</div>' : ''}
                    </div>
                </aside>
            </div>
        </section>
    `;
}

function renderAiPanel() {
    return `
        <section class="portal-section portal-dashboard-grid">
            <article class="portal-panel">
                <div class="portal-meta">${portalText('AI Tutor Proxy', 'AI tutor proxy')}</div>
                <h2>${portalText('安全版 AI 助教', 'Secure AI tutor')}</h2>
                <p class="portal-muted">${portalText('訊息會先送到後端，再由後端決定是否呼叫模型，避免把 API key 放在瀏覽器。未設定 OPENAI_API_KEY 時，系統會先使用後備教學建議。', 'Messages are routed through the server first. If OPENAI_API_KEY is missing, the system falls back to a server-side coaching reply.')}</p>
                <div class="portal-messages">
                    ${portalState.aiMessages.length ? portalState.aiMessages.map(function(item) {
                        return '<div class="portal-message ' + escapeHtml(item.role) + '"><strong>' + escapeHtml(item.role === 'assistant' ? 'AI Tutor' : 'You') + '</strong>' + escapeHtml(item.content) + '</div>';
                    }).join('') : '<div class="portal-empty">' + portalText('還沒有對話。你可以針對目前 lesson 提問，例如請 AI 幫你解釋句型、改寫例句或安排複習步驟。', 'No conversation yet. Ask about the current lesson, grammar, sentence rewrites, or review steps.') + '</div>'}
                </div>
            </article>
            <article class="portal-panel">
                <div class="portal-meta">${portalText('提問', 'Ask a question')}</div>
                <h2>${portalText('發送到後端 AI 代理', 'Send through the server proxy')}</h2>
                <form class="portal-form" id="ai-form">
                    <div class="portal-field">
                        <label>${portalText('問題內容', 'Question')}</label>
                        <textarea name="message" placeholder="${portalText('例如：請根據目前 lesson 幫我整理三個重點句型。', 'For example: Based on this lesson, summarize three key sentence patterns.')}"></textarea>
                    </div>
                    <button class="portal-button" type="submit">${portalText('送出問題', 'Send question')}</button>
                </form>
                ${portalState.aiStatus.message ? '<div class="portal-status ' + portalState.aiStatus.type + '">' + escapeHtml(portalState.aiStatus.message) + '</div>' : ''}
            </article>
        </section>
    `;
}

function renderAdminPanel() {
    if (!portalState.dashboard || !portalState.dashboard.isAdmin) {
        return '';
    }

    return `
        <section class="portal-section">
            <div class="portal-inline-actions">
                <div>
                    <div class="portal-meta">${portalText('Admin', 'Admin')}</div>
                    <h2>${portalText('詢問名單後台', 'Inquiry operations')}</h2>
                </div>
                <button class="portal-button-secondary" id="load-inquiries-button">${portalText('載入最新詢問', 'Load inquiries')}</button>
            </div>
            ${portalState.adminStatus.message ? '<div class="portal-status ' + portalState.adminStatus.type + '">' + escapeHtml(portalState.adminStatus.message) + '</div>' : ''}
            ${portalState.adminItems.length ? `
                <article class="portal-panel" style="margin-top:16px;">
                    <table class="portal-table">
                        <thead>
                            <tr>
                                <th>${portalText('時間', 'Time')}</th>
                                <th>${portalText('姓名', 'Name')}</th>
                                <th>Email</th>
                                <th>${portalText('需求類型', 'Interest')}</th>
                                <th>${portalText('內容', 'Message')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${portalState.adminItems.map(function(item) {
                                return '<tr><td>' + escapeHtml(String(item.created_at || '')) + '</td><td>' + escapeHtml(item.name) + '</td><td>' + escapeHtml(item.email) + '</td><td>' + escapeHtml(item.interest) + '</td><td>' + escapeHtml(item.message) + '</td></tr>';
                            }).join('')}
                        </tbody>
                    </table>
                </article>
            ` : '<div class="portal-empty" style="margin-top:16px;">' + portalText('尚未載入詢問資料。', 'Inquiry list has not been loaded yet.') + '</div>'}
        </section>
    `;
}

function renderAuthenticated() {
    return [
        renderStats(),
        renderCourses(),
        renderLearningStudio(),
        renderAdminPanel()
    ].join('');
}

function renderPortal() {
    var root = document.getElementById('portal-app');
    var statusMessage = portalState.authStatus.message
        ? '<div class="portal-status ' + portalState.authStatus.type + '" style="margin-top:18px;">' + escapeHtml(portalState.authStatus.message) + '</div>'
        : '';

    root.innerHTML = `
        <div class="portal-shell">
            ${renderHeader()}
            ${renderHero()}
            ${statusMessage}
            ${portalState.loading ? '<div class="portal-section portal-empty">' + portalText('正在同步資料...', 'Syncing portal data...') + '</div>' : ''}
            ${!portalState.loading && !portalState.user ? renderAuth() : ''}
            ${!portalState.loading && portalState.user ? renderAuthenticated() : ''}
        </div>
    `;

    bindPortalEvents();
}

function setStatus(target, type, message) {
    portalState[target] = {
        type: type,
        message: message
    };
}

function handleRegister(event) {
    var form = event.target;
    var formData = new FormData(form);

    event.preventDefault();
    setStatus('authStatus', '', portalText('正在建立帳號...', 'Creating your account...'));
    renderPortal();

    apiRequest('POST', '/api/auth/register', {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        locale: portalState.lang
    }).then(function(data) {
        portalState.user = data.user;
        setStatus('authStatus', 'success', portalText('帳號建立完成，已為你登入。', 'Account created and signed in.'));
        return loadDashboard();
    }).then(function() {
        return loadCourseDetail(portalState.selectedCourseId);
    }).then(function() {
        renderPortal();
    }).catch(function(error) {
        setStatus('authStatus', 'error', error.message);
        renderPortal();
    });
}

function handleLogin(event) {
    var form = event.target;
    var formData = new FormData(form);

    event.preventDefault();
    setStatus('authStatus', '', portalText('正在登入...', 'Signing you in...'));
    renderPortal();

    apiRequest('POST', '/api/auth/login', {
        email: formData.get('email'),
        password: formData.get('password')
    }).then(function(data) {
        portalState.user = data.user;
        setStatus('authStatus', 'success', portalText('登入成功。', 'Signed in successfully.'));
        return loadDashboard();
    }).then(function() {
        return loadCourseDetail(portalState.selectedCourseId);
    }).then(function() {
        renderPortal();
    }).catch(function(error) {
        setStatus('authStatus', 'error', error.message);
        renderPortal();
    });
}

function handleLogout() {
    setStatus('authStatus', '', portalText('正在登出...', 'Signing out...'));
    renderPortal();

    apiRequest('POST', '/api/auth/logout').then(function() {
        portalState.user = null;
        portalState.dashboard = null;
        portalState.lessonDetailsByCourse = {};
        portalState.selectedLessonId = null;
        portalState.aiConversationId = null;
        portalState.aiMessages = [];
        portalState.adminItems = [];
        setStatus('authStatus', 'success', portalText('已登出。', 'Signed out.'));
        renderPortal();
    }).catch(function(error) {
        setStatus('authStatus', 'error', error.message);
        renderPortal();
    });
}

function handleEnroll(courseId) {
    setStatus('progressStatus', '', portalText('正在加入課程...', 'Enrolling...'));
    renderPortal();

    apiRequest('POST', '/api/learn/enroll', {
        courseId: courseId
    }).then(function() {
        portalState.selectedCourseId = courseId;
        setStatus('progressStatus', 'success', portalText('已加入課程。', 'Enrolled successfully.'));
        return loadDashboard();
    }).then(function() {
        return loadCourseDetail(courseId);
    }).then(function() {
        renderPortal();
    }).catch(function(error) {
        setStatus('progressStatus', 'error', error.message);
        renderPortal();
    });
}

function handleNotesSave(event) {
    var form = event.target;
    var formData = new FormData(form);
    var courseId = formData.get('courseId');

    event.preventDefault();
    setStatus('progressStatus', '', portalText('正在儲存學習筆記...', 'Saving learning notes...'));
    renderPortal();

    apiRequest('POST', '/api/learn/progress', {
        courseId: courseId,
        progressPercent: formData.get('progressPercent'),
        completedUnits: formData.get('completedUnits'),
        totalUnits: formData.get('totalUnits'),
        currentModule: formData.get('currentModule'),
        notes: formData.get('notes')
    }).then(function() {
        setStatus('progressStatus', 'success', portalText('學習筆記已更新。', 'Learning notes updated.'));
        return loadDashboard();
    }).then(function() {
        return loadCourseDetail(courseId);
    }).then(function() {
        renderPortal();
    }).catch(function(error) {
        setStatus('progressStatus', 'error', error.message);
        renderPortal();
    });
}

function handleLessonAction(lessonId, lessonStatus) {
    var course = getCourseById(portalState.selectedCourseId);
    var runSync = function() {
        apiRequest('POST', '/api/learn/progress', {
            courseId: course.id,
            lessonId: lessonId,
            lessonStatus: lessonStatus,
            eventType: lessonStatus === 'completed' ? 'lesson_completed' : 'lesson_started',
            timeSpentSeconds: lessonStatus === 'completed' ? 600 : 60
        }).then(function() {
            setStatus('progressStatus', 'success', lessonStatus === 'completed'
                ? portalText('這個 lesson 已標記完成，總進度已更新。', 'Lesson marked complete and overall progress updated.')
                : portalText('已同步 lesson 狀態。', 'Lesson status synced.'));
            return loadDashboard();
        }).then(function() {
            return loadCourseDetail(course.id);
        }).then(function() {
            renderPortal();
        }).catch(function(error) {
            setStatus('progressStatus', 'error', error.message);
            renderPortal();
        });
    };

    if (!portalState.user) {
        setStatus('progressStatus', 'error', portalText('請先登入再同步 lesson 進度。', 'Please sign in before syncing lesson progress.'));
        renderPortal();
        return;
    }

    setStatus('progressStatus', '', lessonStatus === 'completed'
        ? portalText('正在標記 lesson 完成...', 'Marking lesson as complete...')
        : portalText('正在同步 lesson 狀態...', 'Syncing lesson progress...'));
    renderPortal();

    if (!getEnrollment(course.id)) {
        apiRequest('POST', '/api/learn/enroll', { courseId: course.id }).then(function() {
            return loadDashboard();
        }).then(function() {
            return loadCourseDetail(course.id);
        }).then(function() {
            runSync();
        }).catch(function(error) {
            setStatus('progressStatus', 'error', error.message);
            renderPortal();
        });
        return;
    }

    runSync();
}

function handleAi(event) {
    var form = event.target;
    var formData = new FormData(form);
    var message = String(formData.get('message') || '').trim();
    var course = getCourseById(portalState.selectedCourseId);

    event.preventDefault();

    if (!message) {
        setStatus('aiStatus', 'error', portalText('請先輸入問題。', 'Please enter a question.'));
        renderPortal();
        return;
    }

    portalState.aiMessages.push({
        role: 'user',
        content: message
    });
    setStatus('aiStatus', '', portalText('AI 助教正在整理答案...', 'The AI tutor is preparing a reply...'));
    renderPortal();

    apiRequest('POST', '/api/ai/chat', {
        conversationId: portalState.aiConversationId,
        courseId: course.id,
        message: message
    }).then(function(data) {
        portalState.aiConversationId = data.conversationId;
        portalState.aiMessages.push({
            role: 'assistant',
            content: data.message.content
        });
        setStatus('aiStatus', 'success', data.provider === 'openai'
            ? portalText('已收到模型回覆。', 'Model response received.')
            : portalText('目前使用後備教學回覆。設定 OPENAI_API_KEY 後會切換成即時模型。', 'Using the built-in fallback reply for now. Add OPENAI_API_KEY to enable live model responses.'));
        renderPortal();
    }).catch(function(error) {
        setStatus('aiStatus', 'error', error.message);
        renderPortal();
    });
}

function bindPortalEvents() {
    var langSelect = document.getElementById('portal-lang-select');
    var registerForm = document.getElementById('register-form');
    var loginForm = document.getElementById('login-form');
    var logoutButton = document.getElementById('portal-logout-button');
    var progressForm = document.getElementById('progress-form');
    var aiForm = document.getElementById('ai-form');
    var inquiryButton = document.getElementById('load-inquiries-button');

    if (langSelect) {
        langSelect.addEventListener('change', function(event) {
            portalState.lang = event.target.value;
            window.setLanguage(portalState.lang);
            renderPortal();
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    if (progressForm) {
        progressForm.addEventListener('submit', handleNotesSave);
    }

    if (aiForm) {
        aiForm.addEventListener('submit', handleAi);
    }

    if (inquiryButton) {
        inquiryButton.addEventListener('click', loadAdminInquiries);
    }

    Array.prototype.forEach.call(document.querySelectorAll('.portal-select-course'), function(button) {
        button.addEventListener('click', function() {
            portalState.selectedCourseId = button.getAttribute('data-course-id');
            portalState.selectedLessonId = null;
            setStatus('progressStatus', '', '');
            setStatus('aiStatus', '', '');
            loadCourseDetail(portalState.selectedCourseId).then(function() {
                renderPortal();
            });
        });
    });

    Array.prototype.forEach.call(document.querySelectorAll('.portal-enroll-course'), function(button) {
        button.addEventListener('click', function() {
            handleEnroll(button.getAttribute('data-course-id'));
        });
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-lesson-select]'), function(button) {
        button.addEventListener('click', function() {
            portalState.selectedLessonId = button.getAttribute('data-lesson-select');
            renderPortal();
        });
    });

    Array.prototype.forEach.call(document.querySelectorAll('.portal-lesson-action'), function(button) {
        button.addEventListener('click', function() {
            handleLessonAction(button.getAttribute('data-lesson-id'), button.getAttribute('data-lesson-status'));
        });
    });
}

bootstrapPortal();
