var loginState = {
    lang: (function() {
        try {
            return localStorage.getItem('tkclc_pro_lang') || 'zh-TW';
        } catch (_error) {
            return 'zh-TW';
        }
    }()),
    user: null,
    googleAvailable: false,
    errorCode: '',
    loading: true
};

function loginText(zh, en) {
    return loginState.lang === 'en' ? en : zh;
}

function setLang(lang) {
    loginState.lang = lang;
    try {
        localStorage.setItem('tkclc_pro_lang', lang);
    } catch (_error) {
        // ignore storage errors
    }
}

function getNextPath() {
    var params = new URLSearchParams(window.location.search);
    var next = params.get('next') || '/app';

    if (!next || next.charAt(0) !== '/' || next.indexOf('//') === 0) {
        return '/app';
    }

    return next;
}

function getErrorMessage() {
    var params = new URLSearchParams(window.location.search);
    var code = params.get('error') || '';

    if (code === 'google_not_configured') {
        return loginText('Google 登入尚未完成設定，請先補上 Google OAuth 憑證。', 'Google sign-in is not configured yet. Please add the Google OAuth credentials first.');
    }

    if (code === 'google_cancelled') {
        return loginText('你已取消 Google 登入。', 'Google sign-in was cancelled.');
    }

    if (code === 'google_state_invalid') {
        return loginText('登入驗證已過期，請重新點一次 Google 登入。', 'The sign-in session expired. Please try Google sign-in again.');
    }

    if (code === 'google_failed') {
        return loginText('Google 登入目前暫時失敗，請稍後再試。', 'Google sign-in failed temporarily. Please try again.');
    }

    return '';
}

function apiRequest(url) {
    return fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
            'Cache-Control': 'no-store'
        }
    }).then(function(response) {
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

function renderLogin() {
    var root = document.getElementById('login-app');
    var errorMessage = getErrorMessage();
    var loginHref = '/api/auth/google/start?next=' + encodeURIComponent(getNextPath());
    var googleButtonClass = loginState.googleAvailable ? 'login-google' : 'login-google disabled';

    document.documentElement.lang = loginState.lang;
    document.title = loginText('TKCLCLAB | Google 登入', 'TKCLCLAB | Google Sign-In');

    root.innerHTML = '' +
        '<div class="login-shell">' +
            '<header class="login-topbar">' +
                '<a class="login-brand" href="/">' +
                    '<span class="login-mark">TK</span>' +
                    '<span class="login-brand-copy">' +
                        '<strong>TKCLCLAB</strong>' +
                        '<span>' + loginText('先登入，再進入學習工作台', 'Sign in first, then enter the learner workspace') + '</span>' +
                    '</span>' +
                '</a>' +
                '<label class="login-lang">' +
                    '<span>' + loginText('語言', 'Language') + '</span>' +
                    '<select id="login-lang-select">' +
                        '<option value="zh-TW"' + (loginState.lang === 'zh-TW' ? ' selected' : '') + '>繁體中文</option>' +
                        '<option value="en"' + (loginState.lang === 'en' ? ' selected' : '') + '>English</option>' +
                    '</select>' +
                '</label>' +
            '</header>' +
            '<main class="login-layout">' +
                '<section class="login-copy">' +
                    '<span class="login-eyebrow">' + loginText('Google-Only Login', 'Google-only login') + '</span>' +
                    '<h1>' + loginText('登入後進入完整學習平台，影片、AI 助教與進度追蹤都會在這裡展開。', 'Enter the full learning platform after sign-in, with videos, AI tutoring, and progress tracking in one place.') + '</h1>' +
                    '<p>' + loginText('這個入口延續官網的視覺風格，只保留單一 Google 登入流程，讓公開頁面與學習工作台之間的轉換更自然。', 'This entry point follows the same visual language as the public site and keeps a single Google flow so the transition into the workspace feels consistent.') + '</p>' +
                    '<div class="login-points">' +
                        '<div class="login-point"><strong>01</strong><div><h3>' + loginText('單一登入流程', 'One sign-in flow') + '</h3><p>' + loginText('只保留 Google 登入，入口更直接。', 'Google is the only sign-in method, keeping the entry simple.') + '</p></div></div>' +
                        '<div class="login-point"><strong>02</strong><div><h3>' + loginText('登入後展開內容', 'Content opens after login') + '</h3><p>' + loginText('YouTube 課程、AI 助教與進度同步集中在學習區。', 'YouTube lessons, AI tutoring, and synced progress stay inside the workspace.') + '</p></div></div>' +
                        '<div class="login-point"><strong>03</strong><div><h3>' + loginText('一致的產品體驗', 'Consistent product feel') + '</h3><p>' + loginText('從官網到學習區維持同一套視覺語言。', 'The public site and the workspace now share the same visual system.') + '</p></div></div>' +
                    '</div>' +
                '</section>' +
                '<aside class="login-card">' +
                    '<span class="login-eyebrow">' + loginText('Sign In', 'Sign in') + '</span>' +
                    '<h2>' + loginText('登入 TKCLCLAB 學習區', 'Sign in to the TKCLCLAB workspace') + '</h2>' +
                    '<p>' + loginText('使用你的 Google 帳號登入後，系統會帶你進入課程影片與學習進度工作台。', 'Continue with your Google account and the system will take you into the lesson and progress workspace.') + '</p>' +
                    (errorMessage ? '<div class="login-status error">' + errorMessage + '</div>' : '') +
                    (!loginState.googleAvailable ? '<div class="login-status">' + loginText('Google 登入按鈕會在設定完成後啟用。', 'The Google button will become available once the OAuth credentials are configured.') + '</div>' : '') +
                    '<a class="' + googleButtonClass + '" href="' + (loginState.googleAvailable ? loginHref : '#') + '">' +
                        '<span class="login-google-icon"></span>' +
                        '<span>' + loginText('使用 Google 登入', 'Continue with Google') + '</span>' +
                    '</a>' +
                    '<div class="login-card-note">' + loginText('登入後，主要課程內容、YouTube lesson、AI 助教與進度追蹤都會出現在學習區。', 'After sign-in, the main lesson content, YouTube learning studio, AI tutor, and progress tracking appear in the workspace.') + '</div>' +
                    '<a class="login-secondary-link" href="/">' + loginText('返回首頁', 'Back to home') + '</a>' +
                '</aside>' +
            '</main>' +
        '</div>';

    bindLoginEvents();
}

function bindLoginEvents() {
    var langSelect = document.getElementById('login-lang-select');

    if (langSelect) {
        langSelect.addEventListener('change', function(event) {
            setLang(event.target.value);
            renderLogin();
        });
    }
}

window.addEventListener('DOMContentLoaded', function() {
    Promise.all([
        apiRequest('/api/auth/me').catch(function() { return { user: null }; }),
        apiRequest('/api/auth/google/config').catch(function() { return { available: false }; })
    ]).then(function(results) {
        loginState.user = results[0].user || null;
        loginState.googleAvailable = Boolean(results[1].available);

        if (loginState.user) {
            window.location.replace(getNextPath());
            return;
        }

        loginState.loading = false;
        renderLogin();
    });
});
