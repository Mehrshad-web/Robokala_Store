// shopping-cart.js
// auth-helper.js باید قبل از این فایل لود شده باشد

const CART_CONFIG = {
    MAX_QTY: 10,
    DEFAULT_IMAGE: 'img/product/prod1.jpeg',
    CART_API: '/api/cart',
    ORDER_API: '/api/orders',
    AUTH_PAGE: '/authentication.html',
    PRODUCTS_PAGE: '/products-explore.html'
};

let cartItemsCache = [];

/* ===================== SAFE HELPERS ===================== */

function safeIsLoggedIn() {
    return typeof isLoggedIn === 'function' && isLoggedIn();
}

async function safeAuthFetch(url, options = {}) {
    const finalOptions = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    };

    if (typeof authFetch === 'function') {
        return authFetch(url, finalOptions);
    }

    return fetch(url, finalOptions);
}

function safeGetLocalCart() {
    if (typeof getLocalCart === 'function') {
        return getLocalCart();
    }

    try {
        return JSON.parse(localStorage.getItem('robokala_cart') || '[]');
    } catch {
        return [];
    }
}

function safeSetLocalCart(cart) {
    if (typeof setLocalCart === 'function') {
        setLocalCart(cart);
        return;
    }

    localStorage.setItem('robokala_cart', JSON.stringify(cart));
}

function safeUpdateCartBadge() {
    if (typeof updateCartBadge === 'function') {
        updateCartBadge();
    }
}

function notify(message, success = true) {
    if (typeof showNotification === 'function') {
        showNotification(message, success);
        return;
    }

    let stack = document.querySelector('.message-stack');

    if (!stack) {
        stack = document.createElement('div');
        stack.className = 'message-stack';
        stack.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(stack);
    }

    const el = document.createElement('div');
    el.textContent = message;
    el.style.cssText = `
        padding: 12px 16px;
        border-radius: 12px;
        color: #fff;
        background: ${success ? 'rgba(46, 204, 113, .95)' : 'rgba(255, 107, 107, .95)'};
        box-shadow: 0 10px 30px rgba(0,0,0,.25);
        font-size: 14px;
        transition: .25s ease;
    `;

    stack.appendChild(el);

    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-8px)';
        setTimeout(() => el.remove(), 250);
    }, 2500);
}

function formatPrice(value) {
    return Number(value || 0).toLocaleString('fa-IR') + ' تومان';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function getProductFromItem(item) {
    return item.product || item;
}

function getProductId(item) {
    const product = getProductFromItem(item);
    return product.id ?? item.product_id ?? item.id;
}

function getCartItemId(item) {
    return item.id ?? getProductId(item);
}

function normalizeLocalItem(item) {
    return {
        id: item.id,
        quantity: Number(item.quantity || 1),
        product: {
            id: item.id,
            name: item.name || item.title || 'محصول',
            price: Number(item.price || 0),
            discount: Number(item.discount || 0),
            image_url: item.image_url || item.image || ''
        }
    };
}

/* ===================== LOAD CART ===================== */

async function loadCart() {
    const container = document.querySelector('.cart-items');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align:center;padding:40px;opacity:.6">
            در حال بارگذاری...
        </div>
    `;

    if (safeIsLoggedIn()) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // سقف انتظار: ۱۵ ثانیه

        try {
            const res = await safeAuthFetch(CART_CONFIG.CART_API, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!res) return; // authFetch خودش یا ریدایرکت کرده یا پیام خطا داده

            if (!res.ok) {
                showCartError(`خطای سرور (کد ${res.status})`);
                return;
            }

            const data = await res.json();
            const items = Array.isArray(data) ? data : data.items || data.cart || [];

            cartItemsCache = items;
            renderCart(items, true);

        } catch (err) {
            clearTimeout(timeoutId);
            console.error('خطا در بارگذاری سبد خرید:', err);
            
            if (err.name === 'AbortError') {
                showCartError('سرور خیلی دیر جواب داد — اگه رو Render تستش می‌کنی، ممکنه سرور تازه داشته بیدار می‌شده');
            } else {
                showCartError('اتصال به سرور برقرار نشد');
            }
        }
    } else {
        const localItems = safeGetLocalCart().map(normalizeLocalItem);
        cartItemsCache = localItems;
        renderCart(localItems, false);
    }
}

function showCartError(msg) {
    const container = document.querySelector('.cart-items');
    if (!container) return;
    container.innerHTML = `
        <div style="text-align:center;padding:50px 20px">
            <div style="font-size:15px;color:#ff6b6b;margin-bottom:18px">⚠️ ${msg}</div>
            <button onclick="loadCart()" style="
                background:#00d4ff;border:none;color:#000;
                padding:10px 26px;border-radius:9px;cursor:pointer;
                font-size:14px;font-weight:700;">
                تلاش دوباره
            </button>
        </div>`;
}

/* ===================== RENDER CART ===================== */

function renderCart(items = [], isApi = false) {
    const container = document.querySelector('.cart-items');
    const countEl = document.getElementById('cartItemCount');
    const origEl = document.getElementById('totalOriginal');
    const discEl = document.getElementById('totalDiscount');
    const finalEl = document.getElementById('totalFinal');

    if (!container) return;

    if (!items.length) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px;opacity:.75">
                <p style="font-size:18px;margin-bottom:16px">سبد خرید شما خالی است 🛒</p>
                <a href="${CART_CONFIG.PRODUCTS_PAGE}" style="color:#00d4ff;text-decoration:none;font-size:15px">
                    مشاهده محصولات ←
                </a>
            </div>
        `;

        if (countEl) countEl.textContent = '0 محصول';
        if (origEl) origEl.textContent = '0 تومان';
        if (discEl) discEl.textContent = '- 0 تومان';
        if (finalEl) finalEl.textContent = '0 تومان';
        return;
    }

    let totalQuantity = 0;
    let totalOriginal = 0;
    let totalDiscount = 0;

    container.innerHTML = items.map(item => {
        const product = getProductFromItem(item);
        const cartItemId = getCartItemId(item);
        const productId = getProductId(item);

        const quantity = Number(item.quantity || 1);
        const price = Number(product.price || 0);
        const discount = Number(product.discount || 0);
        const finalPrice = Math.round(price * (1 - discount / 100));
        const imageUrl = product.image_url || product.image || CART_CONFIG.DEFAULT_IMAGE;
        const name = product.name || product.title || 'محصول';

        totalQuantity += quantity;
        totalOriginal += price * quantity;
        totalDiscount += (price - finalPrice) * quantity;

        return `
            <div class="cart-item glass-card"
                 data-id="${escapeHtml(cartItemId)}"
                 data-product-id="${escapeHtml(productId)}">
                <img class="cart-item__img"
                     src="${escapeHtml(imageUrl)}"
                     alt="${escapeHtml(name)}"
                     onerror="this.onerror=null;this.src='${CART_CONFIG.DEFAULT_IMAGE}'">

                <div class="cart-item__info">
                    <h4 class="cart-item__name">${escapeHtml(name)}</h4>

                    ${discount > 0 ? `
                        <div class="cart-item__badge">${discount}% تخفیف</div>
                    ` : ''}

                    <div class="cart-item__prices">
                        ${discount > 0 ? `
                            <span class="cart-item__old">${formatPrice(price)}</span>
                        ` : ''}

                        <span class="cart-item__price">${formatPrice(finalPrice)}</span>
                    </div>
                </div>

                <div class="cart-item__actions">
                    <div class="cart-counter-wrap">
                        <button class="cart-counter-btn decrease"
                                type="button"
                                data-id="${escapeHtml(cartItemId)}"
                                data-product-id="${escapeHtml(productId)}"
                                data-api="${isApi}"
                                data-qty="${quantity}">
                            <i class="ti ti-minus"></i>
                        </button>

                        <span class="cart-counter-num">${quantity}</span>

                        <button class="cart-counter-btn increase"
                                type="button"
                                data-id="${escapeHtml(cartItemId)}"
                                data-product-id="${escapeHtml(productId)}"
                                data-api="${isApi}"
                                data-qty="${quantity}">
                            <i class="ti ti-plus"></i>
                        </button>
                    </div>

                    <button class="cart-item-remove"
                            type="button"
                            data-id="${escapeHtml(cartItemId)}"
                            data-product-id="${escapeHtml(productId)}"
                            data-api="${isApi}"
                            style="background:transparent;border:none;color:#ff6b6b;cursor:pointer;padding:8px;font-size:18px;margin-top:8px;">
                        <i class="ti ti-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    const totalFinal = totalOriginal - totalDiscount;

    if (countEl) countEl.textContent = `${totalQuantity} محصول`;
    if (origEl) origEl.textContent = formatPrice(totalOriginal);
    if (discEl) discEl.textContent = `- ${formatPrice(totalDiscount)}`;
    if (finalEl) finalEl.textContent = formatPrice(totalFinal);

    bindCartEvents(container);
}

/* ===================== CART EVENTS ===================== */

function bindCartEvents(container) {
    container.querySelectorAll('.cart-counter-btn.decrease').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const productId = btn.dataset.productId;
            const qty = Number(btn.dataset.qty || 1) - 1;
            const isApi = btn.dataset.api === 'true';

            changeQty(id, productId, qty, isApi);
        });
    });

    container.querySelectorAll('.cart-counter-btn.increase').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const productId = btn.dataset.productId;
            const currentQty = Number(btn.dataset.qty || 1);

            if (currentQty >= CART_CONFIG.MAX_QTY) {
                notify(`حداکثر تعداد مجاز ${CART_CONFIG.MAX_QTY} عدد است`, false);
                return;
            }

            const isApi = btn.dataset.api === 'true';

            changeQty(id, productId, currentQty + 1, isApi);
        });
    });

    container.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const productId = btn.dataset.productId;
            const isApi = btn.dataset.api === 'true';

            removeCartItem(id, productId, isApi);
        });
    });
}

/* ===================== CART ACTIONS ===================== */

async function changeQty(cartItemId, productId, qty, isApi) {
    if (qty <= 0) {
        removeCartItem(cartItemId, productId, isApi);
        return;
    }

    try {
        if (isApi) {
            const res = await safeAuthFetch(`/api/cart/items/${cartItemId}`, {
                method: 'PUT',
                body: JSON.stringify({ quantity: qty })
            });

            if (!res || !res.ok) {
                notify('خطا در بروزرسانی تعداد محصول', false);
                return;
            }

            await loadCart();
            safeUpdateCartBadge();
            return;
        }

        const cart = safeGetLocalCart();
        const index = cart.findIndex(item => String(item.id) === String(productId));

        if (index !== -1) {
            cart[index].quantity = qty;
            safeSetLocalCart(cart);
        }

        await loadCart();
        safeUpdateCartBadge();
    } catch (error) {
        console.error(error);
        notify('خطا در بروزرسانی سبد خرید', false);
    }
}

async function removeCartItem(cartItemId, productId, isApi) {
    const itemEl = document.querySelector(`.cart-item[data-id="${CSS.escape(String(cartItemId))}"]`);

    if (itemEl) {
        itemEl.style.transition = '0.25s ease';
        itemEl.style.opacity = '0';
        itemEl.style.transform = 'translateX(30px)';
    }

    setTimeout(async () => {
        try {
            if (isApi) {
                const res = await safeAuthFetch(`/api/cart/items/${cartItemId}`, {
                    method: 'DELETE'
                });

                if (!res || !res.ok) {
                    notify('خطا در حذف محصول', false);
                    await loadCart();
                    return;
                }

                notify('محصول از سبد حذف شد');
                await loadCart();
                safeUpdateCartBadge();
                return;
            }

            const cart = safeGetLocalCart().filter(item => String(item.id) !== String(productId));

            safeSetLocalCart(cart);
            notify('محصول از سبد حذف شد');
            await loadCart();
            safeUpdateCartBadge();
        } catch (error) {
            console.error(error);
            notify('خطا در حذف محصول', false);
            await loadCart();
        }
    }, itemEl ? 250 : 0);
}

/* ===================== CHECKOUT ===================== */

function bindCheckout() {
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (!checkoutBtn) return;

    checkoutBtn.addEventListener('click', async () => {

        if (!isLoggedIn()) {
            setRedirectAfterLogin('/shopping-cart.html');

            showNotification('برای ثبت سفارش ابتدا وارد حساب شو', false);

            setTimeout(() => {
                window.location.href = '/authentication.html';
            }, 1200);

            return;
        }

        if (!cartItemsCache.length) {
            showNotification('سبد خرید شما خالی است', false);
            return;
        }

        const originalText = checkoutBtn.textContent;

        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'در حال پردازش...';

        try {
            const res = await safeAuthFetch(CART_CONFIG.ORDER_API, {
                method: 'POST'
            });

            if (!res) {
                showNotification('خطا در ثبت سفارش', false);
                return;
            }

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                showNotification(`✅ سفارش #${data.id || data.order_id || ''} ثبت شد`);
                safeUpdateCartBadge();

                setTimeout(() => {
                    window.location.href = '/';
                }, 1800);
            } else {
                showNotification(
                    data.error || data.message || 'خطا در ثبت سفارش',
                    false
                );
            }
        } catch (error) {
            console.error(error);
            showNotification('خطا در ارتباط با سرور', false);
        } finally {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = originalText || 'ادامه و پرداخت';
        }
    });
}

// مقداردهی اولیه سبد خرید هنگام بارگذاری صفحه
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    bindCheckout();
});