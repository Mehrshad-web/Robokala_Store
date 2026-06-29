// ============================================================
// index.js — صفحه اصلی RoboKala
// ============================================================

// ════════════════════════════════════════════════════════════
// لود محصولات ویژه
// ════════════════════════════════════════════════════════════
async function loadFeaturedProducts() {

    const scroll = document.getElementById('psScroll');
    if (!scroll) return;

    try {

        const res = await fetch('/api/products?per_page=8');
        if (!res.ok) throw new Error();

        const data = await res.json();
        const products = data.products || data;

        if (!products.length) {
            makeStaticCardsClickable();
            return;
        }

        // cache برای دسترسی سریع
        const map = {};
        products.forEach(p => map[p.id] = p);

        scroll.innerHTML = products.map(renderIndexCard).join('');

        // ───── Event Delegation ─────
        scroll.addEventListener('click', (e) => {

            // add to cart
            const cartBtn = e.target.closest('[data-cart-pid]');
            if (cartBtn) {
                e.stopPropagation();
                const product = map[cartBtn.dataset.cartPid];
                if (product) addToCartFromCard(product, e);
                return;
            }

            // go to product
            const card = e.target.closest('[data-pid]');
            if (card) {
                window.location.href = `/product.html?id=${card.dataset.pid}`;
            }

        });

    } catch {

        makeStaticCardsClickable();

    }

}


// ════════════════════════════════════════════════════════════
// ساخت کارت محصول
// ════════════════════════════════════════════════════════════
function renderIndexCard(p) {

    const hasDisc = p.discount > 0;

    const finalPrice = hasDisc
        ? Math.round(p.price * (1 - p.discount / 100))
        : p.price;

    return `
        <div class="product-card" data-pid="${p.id}" style="cursor:pointer">

            ${hasDisc ? `<div class="product-card__badge">${p.discount}%</div>` : ''}

            <div class="product-card__img">
                <img src="${p.image_url || 'img/product/prod1.jpeg'}"
                     alt="${p.name}"
                     onerror="this.onerror=null;this.src='img/product/prod1.jpeg'">
            </div>

            <div class="product-card__name">
                ${p.name}
            </div>

            <div class="product-card__footer">

                <div class="product-card__price-box">

                    ${hasDisc
                        ? `<div class="product-card__old">
                            ${p.price.toLocaleString('fa-IR')}
                           </div>`
                        : ''
                    }

                    <div class="product-card__price">
                        ${finalPrice.toLocaleString('fa-IR')}
                        <span class="product-card__unit">تومان</span>
                    </div>

                </div>

                <div class="product-card__cart"
                     data-cart-pid="${p.id}"
                     style="cursor:pointer">

                    <i class="ti ti-shopping-cart"></i>

                </div>

            </div>

        </div>
    `;

}


// ════════════════════════════════════════════════════════════
// اگر API کار نکرد
// ════════════════════════════════════════════════════════════
function makeStaticCardsClickable() {

    document.querySelectorAll('#psScroll .product-card').forEach(card => {

        card.style.cursor = 'pointer';

        card.onclick = () => {
            window.location.href = '/products-explore.html';
        };

        const cartBtn = card.querySelector('.product-card__cart');

        if (cartBtn) {

            cartBtn.onclick = (e) => {

                e.stopPropagation();

                if (typeof isLoggedIn === 'function' && !isLoggedIn()) {

                    window.location.href = '/authentication.html';

                } else {

                    showNotification(
                        'محصول موردنظر رو از صفحه محصولات انتخاب کن',
                        false
                    );

                }

            };

        }

    });

}


// ════════════════════════════════════════════════════════════
// دسته‌بندی‌ها
// ════════════════════════════════════════════════════════════
function setupCategories() {

    document.querySelectorAll('.cat-card').forEach(card => {

        const name = card
            .querySelector('.cat-name')
            ?.textContent
            ?.trim();

        if (!name) return;

        card.style.cursor = 'pointer';

        card.addEventListener('click', () => {

            window.location.href =
                `/products-explore.html?category=${encodeURIComponent(name)}`;

        });

    });

}


// ════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

    loadFeaturedProducts();

    setupCategories();

});
