// ============================================================
// index.js — صفحه اصلی RoboKala (ترکیب نهایی و بدون باگ)
// ============================================================

let featuredProductsCache = {};

// ════════════════════════════════════════════════════════════
// اسلایدر داینامیک
// ════════════════════════════════════════════════════════════
async function loadSlider() {
    const track = document.querySelector('.hero .slide');
    if (!track) return;
    
    try {
        const res = await fetch('/api/site-content');
        if (!res.ok) throw new Error();
        const data = await res.json();
        const slides = data.slides || [];
        
        if (!slides.length) return;

        track.innerHTML = slides.map(s => `
            <div class="item" style="background-image:url(${s.image_url});">
                <div class="content-slider">
                    <div class="name">${s.title || ''}</div>
                    <div class="des">${s.description || ''}</div>
                    ${s.link_url ? `<a class="seeMore" href="${s.link_url}"><button>بیشتر..</button></a>` : ''}
                </div>
            </div>`).join('');
    } catch (err) {
        console.error('خطا در لود اسلایدر:', err);
    }
}

// ════════════════════════════════════════════════════════════
// لود محصولات ویژه
// ════════════════════════════════════════════════════════════
async function loadFeaturedProducts() {
    const scroll = document.getElementById('psScroll');
    if (!scroll) return;

    try {
        const res = await fetch('/api/products?per_page=8');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        const products = data.products || data;
        
        if (!products.length) {
            staticCardsClickable();
            return;
        }

        featuredProductsCache = {};
        products.forEach(p => { featuredProductsCache[p.id] = p; });

        // رندر کردن کارت‌ها با تابع تمیز و مجزا
        scroll.innerHTML = products.map(renderIndexCard).join('');

    } catch (err) {
        console.error('خطا در لود محصولات ویژه:', err);
        staticCardsClickable();
    }
}

// ════════════════════════════════════════════════════════════
// ساخت HTML کارت محصول
// ════════════════════════════════════════════════════════════
function renderIndexCard(p) {
    const hasDisc = p.discount > 0;
    const finalPrice = hasDisc ? Math.round(p.price * (1 - p.discount / 100)) : p.price;

    return `
        <div class="product-card" data-idx-pid="${p.id}" style="cursor:pointer">
            ${hasDisc ? `<div class="product-card__badge">${p.discount}%</div>` : ''}
            <div class="product-card__img">
                <img src="${p.image_url || 'img/product/prod1.jpeg'}" alt="${p.name}"
                     onerror="this.onerror=null;this.src='img/product/prod1.jpeg'">
            </div>
            <div class="product-card__name">${p.name}</div>
            <div class="product-card__footer">
                <div class="product-card__price-box">
                    ${hasDisc ? `<div class="product-card__old">${p.price.toLocaleString('fa-IR')}</div>` : ''}
                    <div class="product-card__price">
                        ${finalPrice.toLocaleString('fa-IR')}
                        <span class="product-card__unit">تومان</span>
                    </div>
                </div>
                <div class="product-card__cart" data-idx-cart="${p.id}" style="cursor:pointer" title="افزودن به سبد خرید">
                    <i class="ti ti-shopping-cart"></i>
                </div>
            </div>
        </div>`;
}

// ════════════════════════════════════════════════════════════
// Fallback در صورت قطعی سرور (آفلاین)
// ════════════════════════════════════════════════════════════
// طبق کد خودت: بدون پیام خطا، مستقیماً به صفحه محصولات هدایت می‌کند
function staticCardsClickable() {
    document.querySelectorAll('#psScroll .product-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            window.location.href = '/products-explore.html';
        });
    });
}

// ════════════════════════════════════════════════════════════
// Event Delegation — مستقل از لودر (فقط یک‌بار بایند می‌شود)
// ════════════════════════════════════════════════════════════
function wireFeaturedGridEvents() {
    const scroll = document.getElementById('psScroll');
    if (!scroll) return;

    scroll.addEventListener('click', (e) => {
        const cartBtn = e.target.closest('[data-idx-cart]');
        if (cartBtn) {
            e.stopPropagation();
            const p = featuredProductsCache[parseInt(cartBtn.dataset.idxCart)];
            if (p && typeof addToCartFromCard === 'function') {
                addToCartFromCard(p, 1);
            }
            return;
        }

        const card = e.target.closest('[data-idx-pid]');
        if (card) {
            window.location.href = `/product.html?id=${card.dataset.idxPid}`;
        }
    });
}

// ════════════════════════════════════════════════════════════
// لینک کردن دسته‌بندی‌ها
// ════════════════════════════════════════════════════════════
function setupCategories() {
    document.querySelectorAll('.cat-card').forEach(card => {
        const name = card.querySelector('.cat-name')?.textContent?.trim();
        if (!name) return;
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            window.location.href = `/products-explore.html?category=${encodeURIComponent(name)}`;
        });
    });
}

// ════════════════════════════════════════════════════════════
// INIT (اجرای اولیه)
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    loadSlider();
    loadFeaturedProducts();
    wireFeaturedGridEvents();
    setupCategories();
});