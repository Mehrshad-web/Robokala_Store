// ======================================================
// auth-helper.js — Shared helpers for auth, cart, navbar
// ======================================================

const TOKEN_KEY = 'robokala_token';
const USER_KEY = 'robokala_user';
const CART_KEY = 'robokala_cart';


// ================= TOKEN =================
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
    try {
        const u = localStorage.getItem(USER_KEY);
        return u ? JSON.parse(u) : null;
    } catch (err) {
        console.error('Invalid user data in localStorage:', err);
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


// ================= HEADERS =================
function authHeaders() {
    const token = getToken();

    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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
        console.error('Invalid cart data in localStorage:', err);
        localStorage.removeItem(CART_KEY);
        return [];
    }
}

function setLocalCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
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
async function addToCartFromCard(product) {
    if (!product || !product.id) {
        showNotification('اطلاعات محصول نامعتبر است', false);
        return;
    }

    const productData = {
        id: product.id,
        name: product.name || product.title || 'محصول بدون نام',
        price: Number(product.price) || 0,
        discount: Number(product.discount) || 0,
        image_url: product.image_url || product.image || '',
        quantity: 1
    };

    if (isLoggedIn()) {
        const res = await authFetch('/api/cart/items', {
            method: 'POST',
            body: JSON.stringify({
                product_id: productData.id,
                quantity: 1
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

    const cart = getLocalCart();
    const existingItem = cart.find(item => String(item.id) === String(productData.id));

    if (existingItem) {
        existingItem.quantity = Number(existingItem.quantity || 0) + 1;
    } else {
        cart.push(productData);
    }

    setLocalCart(cart);
    showNotification('✅ محصول به سبد اضافه شد');
    updateCartBadge();
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
                    count = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
                } else if (Array.isArray(items.items)) {
                    count = items.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
                }
            }
        } catch (err) {
            console.error('Cart badge update failed:', err);
        }
    } else {
        count = getLocalCart().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    }

    document.querySelectorAll('.cart-badge, [data-cart-count], #cartBadge, #cartCount').forEach(el => {
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

    document.querySelectorAll('.nav-auth-link, #navLoginLink').forEach(link => {
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


// ================= AUTO INIT =================
document.addEventListener('DOMContentLoaded', () => {
    updateNavUser();
    updateCartBadge();
});
