// ============================================================
// authentication.js — نسخه ترکیبی و پایدار (ایمیل محور)
// auth-helper.js باید قبل از این فایل لود شده باشد
// ============================================================

// ─── اگه از قبل لاگین بود، برگرد به مسیر مقصد ───
if (typeof isLoggedIn === 'function' && isLoggedIn()) {
    window.location.href = typeof consumeRedirectAfterLogin === 'function'
        ? consumeRedirectAfterLogin()
        : '/';
}

// ════════════════════════════════════════════════════════════
// سیستم پیام (Message System)
// ════════════════════════════════════════════════════════════
function Message(type, text) {
    let stack = document.querySelector('.message-stack');

    if (!stack) {
        stack = document.createElement('div');
        stack.className = 'message-stack';
        document.body.appendChild(stack);
    }

    const el = document.createElement('div');
    el.className = `message ${type}`;

    const span = document.createElement('span');
    span.textContent = text;
    el.appendChild(span);

    stack.appendChild(el);

    setTimeout(() => {
        el.classList.add('hide');
        setTimeout(() => el.remove(), 200);
    }, 2500);
}

// ════════════════════════════════════════════════════════════
// سوییچ تب ورود / ثبت‌نام
// ════════════════════════════════════════════════════════════
const btnLogin      = document.getElementById('btnLogin');
const btnRegister   = document.getElementById('btnRegister');
const switchBg      = document.getElementById('switchBg');
const formsTrack    = document.getElementById('formsTrack');
const greetingTitle = document.getElementById('greetingTitle');
const greetingDesc  = document.getElementById('greetingDesc');

function goTo(mode) {
    const isRegister = mode === 'register';

    switchBg?.classList.toggle('to-register', isRegister);
    formsTrack?.classList.toggle('to-register', isRegister);
    btnLogin?.classList.toggle('active', !isRegister);
    btnRegister?.classList.toggle('active', isRegister);

    if (greetingTitle) {
        greetingTitle.textContent = isRegister ? 'به ما بپیوند!' : 'خوش برگشتی!';
    }

    if (greetingDesc) {
        greetingDesc.textContent = isRegister
            ? 'برای شروع یک حساب کاربری جدید بساز'
            : 'برای ادامه وارد حساب کاربری خودت شو';
    }
}

btnLogin?.addEventListener('click', () => goTo('login'));
btnRegister?.addEventListener('click', () => goTo('register'));

// ════════════════════════════════════════════════════════════
// غیرفعال‌سازی بخش موبایل/OTP با پنهان‌سازی، نه حذف فیزیکی
// ════════════════════════════════════════════════════════════
const setupInitialUI = () => {
    const hides = [
        'loginPhoneGroup',
        'loginOtpWrap',
        'loginMethodSwitch',
        'registerOtpWrap',
        'forgotLink'
    ];

    hides.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const shows = [
        'loginEmailGroup',
        'loginPasswordGroup'
    ];

    shows.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = '';
    });

    const loginBtn = document.getElementById('loginSubmitBtn');
    if (loginBtn) loginBtn.textContent = 'ورود به حساب';

    const registerBtn = document.getElementById('registerSubmitBtn');
    if (registerBtn) registerBtn.textContent = 'ثبت‌نام';
};

setupInitialUI();

// ════════════════════════════════════════════════════════════
// اعتبارسنجی (Validators)
// ════════════════════════════════════════════════════════════
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
const isValidPassword = (pass) => String(pass || '').length >= 6;

// ════════════════════════════════════════════════════════════
// LOGIN LOGIC
// ════════════════════════════════════════════════════════════
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email    = document.getElementById('loginEmail')?.value.trim();
        const password = document.getElementById('loginPassword')?.value;
        const btn      = document.getElementById('loginSubmitBtn');

        if (!isValidEmail(email)) return Message('error', 'ایمیل معتبر وارد کن');
        if (!password) return Message('error', 'رمز عبور رو وارد کن');
        if (!btn) return Message('error', 'دکمه ورود پیدا نشد');

        btn.disabled = true;
        const oldTxt = btn.textContent;
        btn.textContent = 'در حال بررسی...';

        try {
            const res = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                setAuth(data.access_token, data.user);

                if (typeof mergeLocalCartToServer === 'function') {
                    await mergeLocalCartToServer();
                }

                Message('success', '✅ خوش آمدید');

                setTimeout(() => {
                    window.location.href = typeof consumeRedirectAfterLogin === 'function'
                        ? consumeRedirectAfterLogin()
                        : '/';
                }, 1200);
            } else {
                Message('error', data.error || 'ایمیل یا رمز اشتباه است');
                btn.disabled = false;
                btn.textContent = oldTxt;
            }
        } catch (err) {
            Message('error', 'اختلال در ارتباط با سرور');
            btn.disabled = false;
            btn.textContent = oldTxt;
        }
    });
}

// ════════════════════════════════════════════════════════════
// REGISTER LOGIC
// ════════════════════════════════════════════════════════════
const registerForm = document.getElementById('registerForm');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('registerName')?.value.trim();
        const email    = document.getElementById('registerEmail')?.value.trim();
        const password = document.getElementById('registerPassword')?.value;
        const btn      = document.getElementById('registerSubmitBtn');

        if (!username) return Message('error', 'نام کاربری الزامی است');
        if (!isValidEmail(email)) return Message('error', 'ایمیل معتبر نیست');
        if (!isValidPassword(password)) return Message('error', 'رمز عبور باید حداقل ۶ کاراکتر باشد');
        if (!btn) return Message('error', 'دکمه ثبت‌نام پیدا نشد');

        btn.disabled = true;
        const oldTxt = btn.textContent;
        btn.textContent = 'در حال ساخت حساب...';

        try {
            const res = await fetch('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                setAuth(data.access_token, data.user);

                if (typeof mergeLocalCartToServer === 'function') {
                    await mergeLocalCartToServer();
                }

                Message('success', '✅ ثبت‌نام با موفقیت انجام شد');

                setTimeout(() => {
                    window.location.href = typeof consumeRedirectAfterLogin === 'function'
                        ? consumeRedirectAfterLogin()
                        : '/';
                }, 1200);
            } else {
                Message('error', data.error || 'خطا در فرآیند ثبت‌نام');
                btn.disabled = false;
                btn.textContent = oldTxt;
            }
        } catch (err) {
            Message('error', 'خطا در اتصال به شبکه');
            btn.disabled = false;
            btn.textContent = oldTxt;
        }
    });
}

// ════════════════════════════════════════════════════════════
// نمایش/مخفی رمز عبور
// ════════════════════════════════════════════════════════════
function wireTogglePass(btnId, inputId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);

    if (!btn || !input) return;

    btn.addEventListener('click', () => {
        input.type = input.type === 'password' ? 'text' : 'password';

        btn.classList.toggle('fa-eye');
        btn.classList.toggle('fa-eye-slash');
    });
}

wireTogglePass('loginPassToggle', 'loginPassword');
wireTogglePass('registerPassToggle', 'registerPassword');
