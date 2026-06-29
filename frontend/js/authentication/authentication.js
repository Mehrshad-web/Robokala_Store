// authentication.js
// auth-helper.js باید قبل از این فایل لود شده باشد

// ================= MESSAGE SYSTEM =================
function Message(type, text) {
    const stack = getStack();

    const el = document.createElement('div');
    el.className = `message ${type}`;
    el.innerHTML = `<span>${text}</span>`;

    stack.appendChild(el);

    setTimeout(() => {
        el.classList.add('hide');
        setTimeout(() => el.remove(), 200);
    }, 2000);
}

function getStack() {
    let stack = document.querySelector('.message-stack');

    if (!stack) {
        stack = document.createElement('div');
        stack.className = 'message-stack';
        document.body.appendChild(stack);
    }

    return stack;
}

const API = '';

if (typeof isLoggedIn === 'function' && isLoggedIn()) {
    window.location.href = '/';
}

// ================= SWITCH LOGIN/REGISTER =================
const btnLogin = document.getElementById('btnLogin');
const btnRegister = document.getElementById('btnRegister');
const switchBg = document.getElementById('switchBg');
const formsTrack = document.getElementById('formsTrack');
const greetingTitle = document.getElementById('greetingTitle');
const greetingDesc = document.getElementById('greetingDesc');

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

// ================= LOGIN METHOD SWITCH =================
const loginMethodSwitch = document.getElementById('loginMethodSwitch');
const loginPhoneLbl = document.getElementById('loginPhoneLbl');
const loginEmailLbl = document.getElementById('loginEmailLbl');
const loginPhoneGroup = document.getElementById('loginPhoneGroup');
const loginEmailGroup = document.getElementById('loginEmailGroup');
const loginPasswordGroup = document.getElementById('loginPasswordGroup');
const loginOtpWrap = document.getElementById('loginOtpWrap');
const forgotLink = document.getElementById('forgotLink');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');

let isEmailMode = false;
let loginOtpSent = false;

loginMethodSwitch?.addEventListener('click', () => {
    isEmailMode = !isEmailMode;

    loginMethodSwitch.classList.toggle('on', isEmailMode);
    loginPhoneLbl?.classList.toggle('on', !isEmailMode);
    loginEmailLbl?.classList.toggle('on', isEmailMode);

    if (isEmailMode) {
        if (loginPhoneGroup) loginPhoneGroup.style.display = 'none';
        loginOtpWrap?.classList.remove('open');
        if (loginEmailGroup) loginEmailGroup.style.display = 'flex';
        if (loginPasswordGroup) loginPasswordGroup.style.display = 'flex';
        if (forgotLink) forgotLink.style.display = 'block';
        if (loginSubmitBtn) loginSubmitBtn.textContent = 'ورود به حساب';
    } else {
        if (loginPhoneGroup) loginPhoneGroup.style.display = 'flex';
        if (loginEmailGroup) loginEmailGroup.style.display = 'none';
        if (loginPasswordGroup) loginPasswordGroup.style.display = 'none';
        if (forgotLink) forgotLink.style.display = 'none';
        if (loginSubmitBtn) loginSubmitBtn.textContent = loginOtpSent ? 'تایید کد' : 'دریافت کد تایید';
    }
});

// ================= VALIDATORS =================
function isValidPhone(phone) {
    return /^09\d{9}$/.test(phone);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(pass) {
    return String(pass || '').length >= 8;
}

// ================= LOGIN =================
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // ورود با موبایل - ارسال OTP
        if (!isEmailMode && !loginOtpSent) {
            const phone = document.getElementById('loginPhone')?.value.trim();

            if (!isValidPhone(phone)) {
                Message('error', 'شماره موبایل معتبر نیست');
                return;
            }

            if (!loginSubmitBtn) return;

            loginSubmitBtn.disabled = true;
            loginSubmitBtn.textContent = 'در حال ارسال...';

            try {
                const res = await fetch(`${API}/auth/send-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone })
                });

                const data = await res.json().catch(() => ({}));

                if (!res.ok) {
                    Message('error', data.error || 'خطا در ارسال کد');
                    return;
                }

                loginOtpWrap?.classList.add('open');
                startTimer('loginTimer', 'loginResend');

                loginSubmitBtn.textContent = 'تایید کد';
                loginOtpSent = true;

                Message('success', 'کد تایید ارسال شد');
            } catch {
                Message('error', 'خطا در ارتباط با سرور');
            } finally {
                loginSubmitBtn.disabled = false;
                loginSubmitBtn.textContent = loginOtpSent ? 'تایید کد' : 'دریافت کد تایید';
            }

            return;
        }

        // تایید OTP ورود موبایلی
        if (!isEmailMode && loginOtpSent) {
            const phone = document.getElementById('loginPhone')?.value.trim();

            const code = Array.from(
                document.querySelectorAll('#loginOtpWrap .otp-input')
            ).map(i => i.value).join('');

            if (code.length < 5) {
                Message('error', 'کد تایید کامل نیست');
                return;
            }

            if (!loginSubmitBtn) return;

            loginSubmitBtn.disabled = true;
            loginSubmitBtn.textContent = 'در حال بررسی...';

            try {
                const res = await fetch(`${API}/auth/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone, code })
                });

                const data = await res.json().catch(() => ({}));

                if (!res.ok) {
                    Message('error', data.error || 'کد اشتباه است');
                    return;
                }

                setAuth(data.access_token, data.user);
                Message('success', '✅ ورود با موفقیت انجام شد');

                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } catch {
                Message('error', 'خطا در ارتباط با سرور');
            } finally {
                loginSubmitBtn.disabled = false;
                loginSubmitBtn.textContent = 'تایید کد';
            }

            return;
        }

        // ورود با ایمیل
        const email = document.getElementById('loginEmail')?.value.trim();
        const password = document.getElementById('loginPassword')?.value;

        if (!isValidEmail(email)) {
            Message('error', 'ایمیل معتبر نیست');
            return;
        }

        if (!password) {
            Message('error', 'رمز عبور را وارد کنید');
            return;
        }

        if (!loginSubmitBtn) return;

        // ================= API =================
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.textContent = 'در حال ورود...';

        try {
            const res = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                setAuth(data.access_token, data.user);
                Message('success', '✅ ورود با موفقیت انجام شد');

                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } else {
                Message('error', data.error || 'ایمیل یا رمز اشتباهه');
            }
        } catch {
            Message('error', 'خطا در ارتباط با سرور');
        } finally {
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.textContent = 'ورود به حساب';
        }
    });
}

// ================= REGISTER =================
const registerForm = document.getElementById('registerForm');
const registerSubmitBtn = document.getElementById('registerSubmitBtn');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('registerName')?.value.trim();
        const email = document.getElementById('registerEmail')?.value.trim();
        const password = document.getElementById('registerPassword')?.value;

        if (!name) {
            Message('error', 'نام کاربری را وارد کنید');
            return;
        }

        if (!isValidEmail(email)) {
            Message('error', 'ایمیل معتبر نیست');
            return;
        }

        if (!isValidPassword(password)) {
            Message('error', 'رمز عبور باید حداقل ۸ کاراکتر باشد');
            return;
        }

        if (!registerSubmitBtn) return;

        // ================= API =================
        registerSubmitBtn.disabled = true;
        registerSubmitBtn.textContent = 'در حال ثبت‌نام...';

        try {
            const res = await fetch('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: name, email, password })
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                setAuth(data.access_token, data.user);
                Message('success', '✅ ثبت‌نام با موفقیت انجام شد');

                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } else {
                Message('error', data.error || 'خطا در ثبت‌نام');
            }
        } catch {
            Message('error', 'خطا در ارتباط با سرور');
        } finally {
            registerSubmitBtn.disabled = false;
            registerSubmitBtn.textContent = 'ثبت‌نام و دریافت';
        }
    });
}

// ================= OTP TIMER =================
function startTimer(timerId, resendId) {
    let seconds = 120;

    const timerEl = document.getElementById(timerId);
    const resendEl = document.getElementById(resendId);

    if (!timerEl || !resendEl) return;

    resendEl.style.display = 'none';
    timerEl.style.display = 'inline';

    const interval = setInterval(() => {
        seconds--;

        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');

        timerEl.textContent = `${m}:${s}`;

        if (seconds <= 0) {
            clearInterval(interval);

            timerEl.style.display = 'none';
            resendEl.style.display = 'inline';
        }
    }, 1000);
}
