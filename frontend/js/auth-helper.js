// ======================================================
// auth-helper.js — RoboKala Core Helper
// ======================================================

const TOKEN_KEY = 'robokala_token';
const USER_KEY = 'robokala_user';
const CART_KEY = 'robokala_cart';
const REDIRECT_KEY = 'rk_redirect_after_login';

// متغیری برای جلوگیری از اجرای تکراری تابع افزودن به سبد خرید
const _pendingCartAdds = new Set();


// ================= TOKEN =================

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
    try {
        const u = localStorage.getItem(USER_KEY);
        return u ? JSON.parse(u) : null;
    } catch (err) {
        console.error('Invalid user data:', err);
        localStorage.removeItem(USER_KEY);
        return null;
    }
}

function isLoggedIn() {
    return !!getToken();
}


// ================= AUTH STORAGE =================

function setAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}


// ================= REDIRECT AFTER LOGIN =================

function setRedirectAfterLogin(path) {
    sessionStorage.setItem(REDIRECT_KEY, path);
}

function consumeRedirectAfterLogin() {
    const target = sessionStorage.getItem(REDIRECT_KEY);
    sessionStorage.removeItem(REDIRECT_KEY);
    return target || '/';
}


// ================= HEADERS =================

function authHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
}


// ================= AUTH FETCH =================

async function authFetch(url, options = {}) {
    try {
        const res = await fetch(url, {
            ...options,
            headers: {
                ...authHeaders(),
                ...(options.headers || {})
            }
        });

        if (res.status === 401) {
            clearAuth();
            setRedirectAfterLogin(
                window.location.pathname + window.location.search
            );
            window.location.href = '/authentication.html';
            return null;
        }

        return res;

    } catch (err) {
        console.error('Network error:', err);
        showNotification('خطای اتصال به سرور', false);
        return null;
    }
}


// ================= LOCAL CART =================

function getLocalCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch (err) {
        console.error('Invalid cart data:', err);
        localStorage.removeItem(CART_KEY);
        return [];
    }
}

function setLocalCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}


// ================= MERGE CART AFTER LOGIN =================

async function mergeLocalCartToServer() {
    const local = getLocalCart();
    if (!local.length) return;

    for (const item of local) {
        try {
            await fetch('/api/cart/items', {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                    product_id: item.id,
                    quantity: item.quantity
                })
            });
        } catch (err) {
            console.error('Cart merge error:', err);
        }
    }
    localStorage.removeItem(CART_KEY);
}


// ================= NOTIFICATION =================

function showNotification(msg, isSuccess = true) {
    document.querySelectorAll('.rk-notif').forEach(n => n.remove());

    const n = document.createElement('div');
    n.className = 'rk-notif';
    n.textContent = msg;

    n.style.cssText = `
        position:fixed;
        bottom:24px;
        left:50%;
        transform:translateX(-50%);
        background:${isSuccess ? '#51cf66' : '#ff6b6b'};
        color:white;
        padding:12px 28px;
        border-radius:10px;
        z-index:99999;
        font-size:14px;
        box-shadow:0 4px 16px rgba(0,0,0,0.25);
        opacity:1;
        transition:opacity 0.3s;
        white-space:nowrap;
        font-family:inherit;
    `;

    document.body.appendChild(n);

    setTimeout(() => {
        n.style.opacity = '0';
        setTimeout(() => n.remove(), 300);
    }, 2200);
}


// ================= PRODUCT NAVIGATION =================

function goToProduct(id) {
    if (!id) return;
    window.location.href = `/product.html?id=${id}`;
}


// ================= ADD TO CART =================

async function addToCartFromCard(product, quantity = 1) {
    if (!product || !product.id) {
        showNotification('اطلاعات محصول نامعتبر است', false);
        return;
    }

    const key = String(product.id);
    
    // جلوگیری از کلیک‌های تکراری و باگ ثبت ۲ محصول به جای ۱ محصول
    if (_pendingCartAdds.has(key)) return;
    _pendingCartAdds.add(key);

    try {
        const productData = {
            id: product.id,
            name: product.name || product.title || 'محصول بدون نام',
            price: Number(product.price) || 0,
            discount: Number(product.discount) || 0,
            image_url: product.image_url || '',
            quantity: quantity
        };

        if (isLoggedIn()) {
            const res = await authFetch('/api/cart/items', {
                method: 'POST',
                body: JSON.stringify({
                    product_id: productData.id,
                    quantity: quantity
                })
            });

            if (!res) return;

            if (res.ok) {
                showNotification('✅ محصول به سبد اضافه شد');
                updateCartBadge();
                return;
            }

            let errorMsg = 'خطا در افزودن محصول';
            try {
                const data = await res.json();
                errorMsg = data.error || data.message || errorMsg;
            } catch {}

            showNotification(errorMsg, false);
            return;
        }

        // کاربر مهمان (آفلاین)
        const cart = getLocalCart();
        const existingItem = cart.find(i => String(i.id) === String(productData.id));

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push(productData);
        }

        setLocalCart(cart);
        showNotification('✅ محصول به سبد اضافه شد');
        updateCartBadge();

    } finally {
        // حذف قفل محصول بعد از اتمام عملیات
        _pendingCartAdds.delete(key);
    }
}


// ================= CART BADGE =================

async function updateCartBadge() {
    let count = 0;

    if (isLoggedIn()) {
        try {
            const res = await authFetch('/api/cart');
            if (res && res.ok) {
                const items = await res.json();
                if (Array.isArray(items)) {
                    count = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
                } else if (Array.isArray(items.items)) {
                    count = items.items.reduce((s, i) => s + Number(i.quantity || 0), 0);
                }
            }
        } catch (err) {
            console.error('Cart badge error:', err);
        }
    } else {
        count = getLocalCart().reduce((s, i) => s + Number(i.quantity || 0), 0);
    }

    document
        .querySelectorAll('.cart-badge,[data-cart-count],#cartBadge,#cartCount')
        .forEach(el => {
            el.textContent = count;
            el.style.display = count > 0 ? 'flex' : 'none';
        });
}


// ================= NAVBAR USER =================

function updateNavUser() {
    const user = getUser();
    const nameEl = document.getElementById('navUsername');

    if (nameEl) {
        nameEl.textContent = user ? user.username : '';
        nameEl.style.display = user ? 'inline' : 'none';
    }

    document
        .querySelectorAll('.nav-auth-link,#navLoginLink')
        .forEach(link => {
            if (user) {
                if (link.id === 'navLoginLink') {
                    link.textContent = 'خروج';
                } else {
                    link.textContent = `👤 ${user.username}`;
                }

                link.href = '#';
                link.onclick = (e) => {
                    e.preventDefault();
                    clearAuth();
                    showNotification('خارج شدید');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 800);
                };
            } else {
                link.textContent = 'ورود / ثبت‌نام';
                link.href = '/authentication.html';
                link.onclick = null;
            }
        });
}


// ================= FOOTER CONTENT =================

async function loadFooterContent() {
    try {
        const res = await fetch('/api/site-content');
        if (!res.ok) return;
        const data = await res.json();

        const socialEl = document.getElementById('footerSocial');
        if (socialEl) {
            socialEl.innerHTML = (data.social_links && data.social_links.length)
                ? data.social_links.map(s => `
                    <a href="${s.url}" target="_blank" rel="noopener">
                        <i class="${s.icon_class}"></i>
                        ${s.platform}
                    </a>
                `).join('')
                : '';
        }

        const settings = data.settings || {};
        const map = {
            footerAbout: settings.footer_about,
            footerPhone: settings.footer_phone,
            footerEmail: settings.footer_email,
            footerCopyright: settings.footer_copyright
        };

        Object.entries(map).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el && val) el.textContent = val;
        });
    } catch (err) {
        console.error('Footer load error:', err);
    }
}


// ================= AUTO INIT =================

document.addEventListener('DOMContentLoaded', () => {
    updateNavUser();
    updateCartBadge();
    loadFooterContent();
});