// ============================================================
// product-page.js — RoboKala (Ultimate Integrated Version)
// ============================================================

const productId = new URLSearchParams(window.location.search).get('id');
if (!productId) window.location.href = '/products-explore.html';

// استیت‌های سراسری برای استفاده در رویدادها
let currentProduct = null;
let currentQty = 1;

// ════════════════════════════════════════════════════════════
// ۱. بارگذاری اصلی محصول
// ════════════════════════════════════════════════════════════
async function loadProduct() {
    try {
        const res = await fetch(`/api/products/${productId}`);
        if (!res.ok) throw new Error();
        
        const p = await res.json();
        currentProduct = p;
        
        // رندر کردن بخش‌های مختلف
        renderProduct(p);
        initGallery(p);
        initWishlist(p);
        
        // بارگذاری بخش‌های جانبی
        loadComments(p.id);
        loadSimilar(p.category_id || p.categoryId, p.id);
        
    } catch (err) {
        console.error('خطا در بارگذاری محصول:', err);
        showNotification('خطا در بارگذاری اطلاعات محصول', false);
    }
}

// ════════════════════════════════════════════════════════════
// ۲. رندر اطلاعات محصول
// ════════════════════════════════════════════════════════════
function renderProduct(p) {
    document.title = `${p.name} — RoboKala`;

    const hasDisc = p.discount > 0;
    const finalPrice = hasDisc ? Math.round(p.price * (1 - p.discount / 100)) : p.price;

    // عنوان
    const nameEl = document.querySelector('.product-header h1');
    if (nameEl) nameEl.textContent = p.name;

    // قیمت فعلی
    const priceEl = document.querySelector('.current-price');
    if (priceEl) priceEl.textContent = finalPrice.toLocaleString('fa-IR') + ' تومان';

    // قیمت خط خورده
    const oldEl = document.querySelector('.old-price');
    if (oldEl) {
        oldEl.textContent = hasDisc ? p.price.toLocaleString('fa-IR') + ' تومان' : '';
        oldEl.style.display = hasDisc ? '' : 'none';
    }

    // نشان تخفیف
    const badge = document.querySelector('.discount-badge');
    if (badge) {
        badge.textContent = hasDisc ? `${p.discount}٪ تخفیف` : '';
        badge.style.display = hasDisc ? '' : 'none';
    }

    // توضیحات
    const descEl = document.querySelector('.description-box p');
    if (descEl) descEl.textContent = p.description || 'توضیحاتی ثبت نشده است.';

    // موجودی انبار
    const stockEl = document.querySelector('.product-stock');
    if (stockEl) {
        const stock = Number(p.stock || 0);
        stockEl.textContent = stock > 0 ? `موجود (${stock} عدد)` : 'ناموجود';
        stockEl.style.color = stock > 0 ? '#51cf66' : '#ff6b6b';
    }

    // ظاهر دکمه سبد خرید (فقط ظاهر، اکشن پایین بایند شده)
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
        if (p.stock <= 0) {
            cartBtn.innerHTML = 'ناموجود';
            cartBtn.disabled = true;
            cartBtn.style.opacity = '0.5';
        } else {
            cartBtn.disabled = false;
            cartBtn.style.opacity = '1';
        }
    }
}

// ════════════════════════════════════════════════════════════
// ۳. گالری تصاویر (Swipe & Thumbnails)
// ════════════════════════════════════════════════════════════
function initGallery(p) {
    const mainImage = document.getElementById('mainProductImage');
    const thumbs = document.querySelectorAll('.thumb img, .product-thumb img');
    if (!mainImage) return;

    // جمع‌آوری تمام عکس‌ها
    const images = [];
    if (p.image_url) images.push(p.image_url);
    if (p.images && p.images.length) images.push(...p.images);
    if (images.length === 0) images.push('img/product/prod1.jpeg');

    // ست کردن عکس اصلی
    mainImage.src = images[0];
    mainImage.onerror = () => { mainImage.src = 'img/product/prod1.jpeg'; };

    // ست کردن بندانگشتی‌ها
    thumbs.forEach((img, index) => {
        if (images[index]) {
            img.src = images[index];
            img.parentElement.addEventListener('click', () => {
                mainImage.src = images[index];
                document.querySelector('.thumb.active')?.classList.remove('active');
                img.parentElement.classList.add('active');
            });
        }
    });
}

// ════════════════════════════════════════════════════════════
// ۴. علاقه‌مندی‌ها (Wishlist)
// ════════════════════════════════════════════════════════════
function initWishlist(p) {
    const wishBtn = document.getElementById('wishBtn');
    const wishIcon = document.getElementById('wishIcon');
    if (!wishBtn) return;

    let localWishlist = JSON.parse(localStorage.getItem('robokala_wishlist') || '[]');
    let isInWishlist = localWishlist.some(item => String(item.id) === String(p.id));

    // تنظیم ظاهر اولیه
    const updateUi = (active) => {
        wishBtn.classList.toggle('active', active);
        if (wishIcon) {
            wishIcon.classList.toggle('ti-heart', !active);
            wishIcon.classList.toggle('ti-heart-filled', active);
        }
    };
    updateUi(isInWishlist);

    // بایند کردن کلیک
    wishBtn.addEventListener('click', async () => {
        isInWishlist = !isInWishlist;
        updateUi(isInWishlist);

        // افکت انیمیشن
        wishBtn.classList.remove('pop');
        void wishBtn.offsetWidth;
        wishBtn.classList.add('pop');

        if (typeof isLoggedIn === 'function' && isLoggedIn()) {
            try {
                await authFetch(`/api/wishlist/toggle`, {
                    method: 'POST',
                    body: JSON.stringify({ product_id: p.id })
                });
            } catch {
                showNotification('خطا در ثبت علاقه‌مندی', false);
                updateUi(!isInWishlist);
            }
        } else {
            // آپدیت لوکال استوریج برای کاربر مهمان
            if (isInWishlist) {
                localWishlist.push({ id: p.id, name: p.name, price: p.price, image_url: p.image_url });
            } else {
                localWishlist = localWishlist.filter(item => String(item.id) !== String(p.id));
            }
            localStorage.setItem('robokala_wishlist', JSON.stringify(localWishlist));
            showNotification(isInWishlist ? 'به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها حذف شد', true);
        }
    });
}

// ════════════════════════════════════════════════════════════
// ۵. محصولات مشابه
// ════════════════════════════════════════════════════════════
async function loadSimilar(categoryId, currentId) {
    const grid = document.querySelector('.bs-grid');
    if (!grid) return;

    try {
        const url = categoryId 
            ? `/api/products?category_id=${categoryId}&per_page=6` 
            : `/api/products?per_page=6`;
            
        const res = await fetch(url);
        if (!res.ok) return;
        
        const data = await res.json();
        const products = (data.products || data).filter(p => String(p.id) !== String(currentId)).slice(0, 4);
        
        if (!products.length) {
            grid.innerHTML = '<p style="text-align:center;color:#888;grid-column:1/-1;">محصول مشابهی یافت نشد.</p>';
            return;
        }

        const map = {};
        grid.innerHTML = products.map(p => {
            map[p.id] = p;
            const finalPrice = p.discount > 0 ? Math.round(p.price * (1 - p.discount/100)) : p.price;
            return `
                <div class="product-card" data-pid="${p.id}" style="cursor:pointer">
                    ${p.discount > 0 ? `<div class="product-card__badge">${p.discount}%</div>` : ''}
                    <div class="product-card__img">
                        <img src="${p.image_url||'img/product/prod1.jpeg'}" alt="${p.name}"
                             onerror="this.onerror=null;this.src='img/product/prod1.jpeg'">
                    </div>
                    <div class="product-card__name">${p.name}</div>
                    <div class="product-card__footer">
                        <div class="product-card__price-box">
                            <div class="product-card__price">
                                ${finalPrice.toLocaleString('fa-IR')} <span class="product-card__unit">تومان</span>
                            </div>
                        </div>
                        <div class="product-card__cart" data-cart-pid="${p.id}" style="cursor:pointer">
                            <i class="ti ti-shopping-cart"></i>
                        </div>
                    </div>
                </div>`;
        }).join('');

        // Event Delegation برای کارت‌های مشابه
        grid.addEventListener('click', (e) => {
            const cartBtn = e.target.closest('[data-cart-pid]');
            if (cartBtn) {
                e.stopPropagation();
                const p = map[parseInt(cartBtn.dataset.cartPid)];
                if (p && typeof addToCartFromCard === 'function') addToCartFromCard(p, 1);
                return;
            }
            const card = e.target.closest('[data-pid]');
            if (card) window.location.href = `/product.html?id=${card.dataset.pid}`;
        });

    } catch (err) { console.error(err); }
}

// ════════════════════════════════════════════════════════════
// ۶. نظرات محصول
// ════════════════════════════════════════════════════════════
async function loadComments(id) {
    const container = document.getElementById('commentsList');
    if (!container) return;

    try {
        const res = await fetch(`/api/products/${id}/comments`);
        if (!res.ok) throw new Error();
        const comments = await res.json();

        if (!comments.length) {
            container.innerHTML = '<p style="color:#888">نظری برای این محصول ثبت نشده است.</p>';
            return;
        }

        container.innerHTML = comments.map(c => `
            <div class="comment-item">
                <div class="comment-item__header">
                    <strong>${c.user_name || c.username || 'کاربر'}</strong>
                    ${c.rating ? `<span>${'★'.repeat(c.rating)}</span>` : ''}
                </div>
                <p>${c.body || c.text || ''}</p>
                <small>${c.created_at || ''}</small>
            </div>
        `).join('');
    } catch {
        container.innerHTML = '<p style="color:#888">نظری برای این محصول ثبت نشده است.</p>';
    }
}

// ════════════════════════════════════════════════════════════
// 🌟 ۷. بایند شدن رویدادها (کاملا خارج از توابع رندر - فقط یک‌بار)
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    
    // الف) دکمه‌های کنترل تعداد و افزودن به سبد اصلی
    document.getElementById('cartBtn')?.addEventListener('click', async () => {
        if (!currentProduct || currentProduct.stock <= 0) return;
        
        // استفاده از تابع طلایی auth-helper.js
        if (typeof addToCartFromCard === 'function') {
            await addToCartFromCard(currentProduct, currentQty);
        }

        // تغییر ظاهر به کانتر
        const cartBtn = document.getElementById('cartBtn');
        const cartCounter = document.getElementById('cartCounter');
        if (cartBtn) cartBtn.style.display = 'none';
        if (cartCounter) cartCounter.style.display = 'flex';
    });

    document.getElementById('decreaseBtn')?.addEventListener('click', () => {
        if (currentQty > 1) { 
            currentQty--; 
            const el = document.getElementById('counterNum'); 
            if (el) el.textContent = currentQty; 
        }
    });

    document.getElementById('increaseBtn')?.addEventListener('click', () => {
        if (currentProduct && currentQty >= currentProduct.stock) {
            if (typeof showNotification === 'function') showNotification(`حداکثر ${currentProduct.stock} عدد موجود است`, false);
            return;
        }
        currentQty++;
        const el = document.getElementById('counterNum');
        if (el) el.textContent = currentQty;
    });

    // ب) فرم ثبت نظر
    const commentForm = document.getElementById('commentForm');
    commentForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
            if (typeof setRedirectAfterLogin === 'function') setRedirectAfterLogin(window.location.pathname + window.location.search);
            if (typeof showNotification === 'function') showNotification('برای ثبت نظر ابتدا وارد حساب شو', false);
            setTimeout(() => { window.location.href = '/authentication.html'; }, 1200);
            return;
        }

        const body = commentForm.querySelector('textarea')?.value?.trim();
        const rating = commentForm.querySelector('[name="rating"]')?.value;

        if (!body) return;

        try {
            const btn = commentForm.querySelector('button[type="submit"]');
            if (btn) btn.disabled = true;

            await authFetch(`/api/products/${productId}/comments`, {
                method: 'POST',
                body: JSON.stringify({ body, rating: Number(rating || 0) })
            });

            if (typeof showNotification === 'function') showNotification('دیدگاه شما ثبت شد');
            commentForm.reset();
            loadComments(productId);
            
            if (btn) btn.disabled = false;
        } catch {
            if (typeof showNotification === 'function') showNotification('خطا در ثبت دیدگاه', false);
        }
    });

    // اجرا در بدو ورود
    loadProduct();
});