const API = window.API_BASE_URL || '';

const productId = new URLSearchParams(window.location.search).get('id');

const ProductState = {
    product: null,
    quantity: 0,
    maxQty: 0,
    inCart: false
};

if (!productId) {
    window.location.href = '/products-explore.html';
}

// ─────────────────────────────────────────────
// Safe helpers
// ─────────────────────────────────────────────

function getExternalFunction(name) {
    return typeof window[name] === 'function' ? window[name] : null;
}

function getStoredToken() {
    try {
        const tokenKeys = [
            'access_token',
            'token',
            'auth_token',
            'robokala_token',
            'jwt',
            'userToken'
        ];

        for (const key of tokenKeys) {
            const token = localStorage.getItem(key);
            if (token) return token;
        }
    } catch (_) {}

    return null;
}

function safeIsLoggedIn() {
    const external = getExternalFunction('isLoggedIn');
    if (external) return !!external();

    return !!getStoredToken();
}

function safeAuthFetch(url, options = {}) {
    const external = getExternalFunction('authFetch');
    if (external) return external(url, options);

    const headers = new Headers(options.headers || {});
    const hasBody = options.body !== undefined && options.body !== null;

    if (hasBody && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    if (!headers.has('Authorization')) {
        const token = getStoredToken();
        if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    const finalOptions = {
        credentials: 'include',
        ...options,
        headers
    };

    if (
        hasBody &&
        typeof finalOptions.body === 'object' &&
        !(finalOptions.body instanceof FormData)
    ) {
        finalOptions.body = JSON.stringify(finalOptions.body);
    }

    return fetch(url, finalOptions);
}

function ensureMessageStack() {
    let stack = document.querySelector('.message-stack');

    if (!stack) {
        stack = document.createElement('div');
        stack.className = 'message-stack';

        Object.assign(stack.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '9999',
            display: 'grid',
            gap: '8px',
            pointerEvents: 'none',
            maxWidth: 'min(360px, calc(100vw - 40px))'
        });

        document.body.appendChild(stack);
    }

    return stack;
}

function fallbackNotify(text, success = true) {
    const stack = ensureMessageStack();

    const el = document.createElement('div');
    el.textContent = text;

    Object.assign(el.style, {
        pointerEvents: 'none',
        padding: '12px 14px',
        borderRadius: '12px',
        color: '#fff',
        background: success ? 'rgba(34, 197, 94, 0.96)' : 'rgba(239, 68, 68, 0.96)',
        boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
        fontSize: '14px',
        lineHeight: '1.7',
        backdropFilter: 'blur(6px)',
        transition: 'opacity .2s ease, transform .2s ease'
    });

    stack.appendChild(el);

    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-4px)';
        setTimeout(() => el.remove(), 220);
    }, 2400);
}

function showNotification(text, success = true) {
    const external = getExternalFunction('showNotification');
    if (external) return external(text, success);

    return fallbackNotify(text, success);
}

function getElement(selectors) {
    for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) return el;
    }

    return null;
}

function setVisible(el, visible, displayType = '') {
    if (!el) return;

    el.hidden = !visible;
    el.style.display = visible ? displayType : 'none';
}

function normalizeProductsResponse(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.products)) return data.products;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.results)) return data.results;

    return [];
}

function normalizeCommentsResponse(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.comments)) return data.comments;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.results)) return data.results;

    return [];
}

function normalizeCartItemsResponse(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.cart_items)) return data.cart_items;
    if (Array.isArray(data?.cartItems)) return data.cartItems;
    if (Array.isArray(data?.data)) return data.data;

    return [];
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function toFaPrice(value) {
    return Number(value || 0).toLocaleString('fa-IR');
}

function getFinalPrice(product) {
    const price = Number(product?.price || 0);
    const discount = Number(product?.discount || 0);

    if (discount > 0) {
        return Math.round(price * (1 - discount / 100));
    }

    return price;
}

function getProductImages(product) {
    if (Array.isArray(product?.images) && product.images.length) {
        return product.images;
    }

    if (Array.isArray(product?.image_urls) && product.image_urls.length) {
        return product.image_urls;
    }

    if (product?.image_url) {
        return [product.image_url];
    }

    return ['img/product/prod1.jpeg'];
}

function getProductMainImage(product) {
    return getProductImages(product)[0] || 'img/product/prod1.jpeg';
}

// ─────────────────────────────────────────────
// Local cart helpers
// ─────────────────────────────────────────────

function readLocalCart() {
    const external = getExternalFunction('getLocalCart');

    if (external) {
        try {
            const cart = external();
            return Array.isArray(cart) ? cart : [];
        } catch (_) {}
    }

    try {
        const raw = localStorage.getItem('robokala_cart') || localStorage.getItem('cart') || '[]';
        const cart = JSON.parse(raw);
        return Array.isArray(cart) ? cart : [];
    } catch (_) {
        return [];
    }
}

function writeLocalCart(cart) {
    const external = getExternalFunction('setLocalCart');

    if (external) {
        try {
            external(cart);
            return;
        } catch (_) {}
    }

    localStorage.setItem('robokala_cart', JSON.stringify(cart));
}

function updateCartBadgeSafe() {
    const external = getExternalFunction('updateCartBadge');

    if (external) {
        try {
            external();
        } catch (_) {}
    }
}

function getCartQuantityInLocal(id) {
    const cart = readLocalCart();

    const item = cart.find(cartItem => {
        const cartProductId =
            cartItem.product_id ??
            cartItem.productId ??
            cartItem.product?.id ??
            cartItem.id;

        return String(cartProductId) === String(id);
    });

    return item ? Number(item.quantity ?? item.qty ?? item.count ?? 1) || 0 : 0;
}

async function getCartQuantityForLoggedUser(id) {
    const endpoints = [
        `${API}/api/cart`,
        `${API}/api/cart/items`
    ];

    for (const endpoint of endpoints) {
        try {
            const res = await safeAuthFetch(endpoint, { method: 'GET' });
            if (!res || !res.ok) continue;

            const data = await res.json();
            const items = normalizeCartItemsResponse(data);

            const match = items.find(item => {
                const itemProductId =
                    item.product_id ??
                    item.productId ??
                    item.product?.id ??
                    item.id;

                return String(itemProductId) === String(id);
            });

            if (match) {
                return Number(match.quantity ?? match.qty ?? match.count ?? 1) || 0;
            }
        } catch (_) {}
    }

    return 0;
}

async function getInitialCartQuantity(id) {
    if (safeIsLoggedIn()) {
        const remoteQuantity = await getCartQuantityForLoggedUser(id);
        if (remoteQuantity > 0) return remoteQuantity;
    }

    return getCartQuantityInLocal(id);
}

// ─────────────────────────────────────────────
// Product loading
// ─────────────────────────────────────────────

async function loadProduct() {
    try {
        const res = await fetch(`${API}/api/products/${encodeURIComponent(productId)}`);

        if (!res.ok) {
            throw new Error(`Product load failed: ${res.status}`);
        }

        const product = await res.json();

        ProductState.product = product;
        ProductState.maxQty = Math.max(0, Number(product.stock || 0));

        renderProduct(product);
        initGallery();
        await initCart(product);
        initWishlist(product);
        loadSimilar(product.category_id ?? product.categoryId, product.id);
        loadComments(product.id);
    } catch (err) {
        console.error('خطا در بارگذاری محصول:', err);

        const container = document.querySelector('.product-container') || document.querySelector('main');

        if (container) {
            container.insertAdjacentHTML(
                'afterbegin',
                '<p style="color:red;text-align:center;padding:40px">خطا در بارگذاری محصول</p>'
            );
        } else {
            showNotification('خطا در بارگذاری محصول', false);
        }
    }
}

// ─────────────────────────────────────────────
// Render product
// ─────────────────────────────────────────────

function renderProduct(product) {
    const finalPrice = getFinalPrice(product);
    const hasDiscount = Number(product.discount || 0) > 0;
    const images = getProductImages(product);
    const mainImageSrc = images[0] || 'img/product/prod1.jpeg';

    document.title = `${product.name || 'محصول'} — RoboKala`;

    const mainImage = getElement([
        '#mainProductImage',
        '.product-img img',
        '#productImg',
        '.product__img img',
        '.main-product-image'
    ]);

    if (mainImage) {
        mainImage.src = mainImageSrc;
        mainImage.alt = product.name || 'تصویر محصول';
        mainImage.onerror = function () {
            this.onerror = null;
            this.src = 'img/product/prod1.jpeg';
        };
    }

    const thumbImgs = [
        ...document.querySelectorAll('.thumb img, .product-thumb img, .gallery-thumb img')
    ];

    thumbImgs.forEach((img, index) => {
        const src = images[index] || images[0] || 'img/product/prod1.jpeg';

        img.src = src;
        img.alt = product.name || 'تصویر محصول';
        img.onerror = function () {
            this.onerror = null;
            this.src = 'img/product/prod1.jpeg';
        };
    });

    const nameEl = getElement([
        '.product-header h1',
        '.product-name',
        '#productName',
        '.product__name'
    ]);

    if (nameEl) nameEl.textContent = product.name || 'محصول بدون نام';

    const priceEl = getElement([
        '.current-price',
        '.product-price',
        '#productPrice',
        '.product__price'
    ]);

    if (priceEl) {
        priceEl.textContent = `${toFaPrice(finalPrice)} تومان`;
    }

    const oldPriceEl = getElement([
        '.old-price',
        '.product-old-price',
        '.product__old-price'
    ]);

    if (oldPriceEl) {
        if (hasDiscount) {
            oldPriceEl.textContent = `${toFaPrice(product.price)} تومان`;
            oldPriceEl.style.display = '';
        } else {
            oldPriceEl.textContent = '';
            oldPriceEl.style.display = 'none';
        }
    }

    const badgeEl = getElement([
        '.discount-badge',
        '.product-badge',
        '.product__badge'
    ]);

    if (badgeEl) {
        if (hasDiscount) {
            badgeEl.textContent = `${Number(product.discount)}٪ تخفیف`;
            badgeEl.style.display = '';
        } else {
            badgeEl.textContent = '';
            badgeEl.style.display = 'none';
        }
    }

    const descEl = getElement([
        '.description-box p',
        '.product-description',
        '#productDescription',
        '.product__description'
    ]);

    if (descEl) {
        descEl.textContent = product.description || 'توضیحاتی برای این محصول ثبت نشده است.';
    }

    const stockEl = getElement([
        '.product-stock',
        '.product__stock',
        '#productStock'
    ]);

    if (stockEl) {
        const stock = Number(product.stock || 0);
        stockEl.textContent = stock > 0 ? `موجود (${toFaPrice(stock)} عدد)` : 'ناموجود';
        stockEl.style.color = stock > 0 ? '#51cf66' : '#ff6b6b';
    }

    const brandEl = getElement([
        '.product-brand',
        '#productBrand',
        '.product__brand'
    ]);

    if (brandEl && product.brand) {
        brandEl.textContent = product.brand;
    }

    const categoryEl = getElement([
        '.product-category',
        '#productCategory',
        '.product__category'
    ]);

    if (categoryEl && (product.category_name || product.category)) {
        categoryEl.textContent = product.category_name || product.category;
    }

    const cartBtn = getElement([
        '#cartBtn',
        '#addToCartBtn',
        '.add-to-cart-btn',
        '.product-cart-btn'
    ]);

    if (cartBtn && Number(product.stock || 0) <= 0) {
        cartBtn.textContent = 'ناموجود';
        cartBtn.disabled = true;
        cartBtn.style.opacity = '0.5';
    }
}

// ─────────────────────────────────────────────
// Gallery
// ─────────────────────────────────────────────

function initGallery() {
    const mainImage = getElement([
        '#mainProductImage',
        '.product-img img',
        '#productImg',
        '.product__img img',
        '.main-product-image'
    ]);

    const thumbs = [
        ...document.querySelectorAll('.thumb, .product-thumb, .gallery-thumb')
    ].filter(thumb => thumb.querySelector('img'));

    const prevBtn = getElement([
        '.gallery-nav.prev',
        '.gallery-prev',
        '.thumb-prev'
    ]);

    const nextBtn = getElement([
        '.gallery-nav.next',
        '.gallery-next',
        '.thumb-next'
    ]);

    if (!mainImage || !thumbs.length) return;

    let currentIndex = 0;
    let startX = 0;

    function renderImage(index) {
        if (!thumbs[index]) return;

        currentIndex = index;

        const thumbImg = thumbs[index].querySelector('img');

        if (thumbImg) {
            mainImage.src = thumbImg.src;
            mainImage.alt = thumbImg.alt || ProductState.product?.name || 'تصویر محصول';
        }

        document
            .querySelector('.thumb.active, .product-thumb.active, .gallery-thumb.active')
            ?.classList.remove('active');

        thumbs[index].classList.add('active');
    }

    function nextImage() {
        renderImage((currentIndex + 1) % thumbs.length);
    }

    function prevImage() {
        renderImage((currentIndex - 1 + thumbs.length) % thumbs.length);
    }

    thumbs.forEach((thumb, index) => {
        if (thumb.dataset.bound === '1') return;
        thumb.dataset.bound = '1';

        thumb.addEventListener('click', () => renderImage(index));
    });

    if (prevBtn && prevBtn.dataset.bound !== '1') {
        prevBtn.dataset.bound = '1';
        prevBtn.addEventListener('click', prevImage);
    }

    if (nextBtn && nextBtn.dataset.bound !== '1') {
        nextBtn.dataset.bound = '1';
        nextBtn.addEventListener('click', nextImage);
    }

    if (mainImage.dataset.touchBound !== '1') {
        mainImage.dataset.touchBound = '1';

        mainImage.addEventListener('touchstart', event => {
            startX = event.touches[0].clientX;
        });

        mainImage.addEventListener('touchend', event => {
            const endX = event.changedTouches[0].clientX;
            const diff = startX - endX;

            if (Math.abs(diff) < 50) return;
            if (diff > 0) nextImage();
            else prevImage();
        });
    }

    if (document.body.dataset.productKeyNavBound !== '1') {
        document.body.dataset.productKeyNavBound = '1';

        document.addEventListener('keydown', event => {
            if (event.key === 'ArrowLeft') nextImage();
            if (event.key === 'ArrowRight') prevImage();
        });
    }

    renderImage(0);
}

// ─────────────────────────────────────────────
// Wishlist
// ─────────────────────────────────────────────

function initWishlist(product) {
    const wishBtn = document.getElementById('wishBtn');
    const wishIcon = document.getElementById('wishIcon');

    if (!wishBtn) return;

    let localWishlist = [];

    try {
        localWishlist = JSON.parse(localStorage.getItem('robokala_wishlist') || '[]');
    } catch (_) {
        localWishlist = [];
    }

    const isInWishlist = localWishlist.some(item => String(item.id) === String(product.id));

    setWishlistUi(wishBtn, wishIcon, isInWishlist);

    if (wishBtn.dataset.bound === '1') return;
    wishBtn.dataset.bound = '1';

    wishBtn.addEventListener('click', async () => {
        const nextActive = !wishBtn.classList.contains('active');

        setWishlistUi(wishBtn, wishIcon, nextActive);

        wishBtn.classList.remove('pop');
        void wishBtn.offsetWidth;
        wishBtn.classList.add('pop');

        if (safeIsLoggedIn()) {
            try {
                const res = await safeAuthFetch(`${API}/api/wishlist/toggle`, {
                    method: 'POST',
                    body: { product_id: product.id }
                });

                if (!res || !res.ok) {
                    throw new Error('Wishlist toggle failed');
                }

                showNotification(
                    nextActive ? 'به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها حذف شد',
                    true
                );
            } catch (err) {
                console.error('خطا در علاقه‌مندی:', err);
                setWishlistUi(wishBtn, wishIcon, !nextActive);
                showNotification('خطا در ثبت علاقه‌مندی', false);
            }

            return;
        }

        try {
            const wishlist = JSON.parse(localStorage.getItem('robokala_wishlist') || '[]');
            const index = wishlist.findIndex(item => String(item.id) === String(product.id));

            if (index >= 0) {
                wishlist.splice(index, 1);
            } else {
                wishlist.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    discount: product.discount || 0,
                    image_url: getProductMainImage(product)
                });
            }

            localStorage.setItem('robokala_wishlist', JSON.stringify(wishlist));

            showNotification(
                nextActive ? 'به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها حذف شد',
                true
            );
        } catch (err) {
            console.error('خطا در ذخیره علاقه‌مندی:', err);
            setWishlistUi(wishBtn, wishIcon, !nextActive);
            showNotification('خطا در ذخیره علاقه‌مندی', false);
        }
    });
}

function setWishlistUi(wishBtn, wishIcon, active) {
    wishBtn.classList.toggle('active', active);

    if (!wishIcon) return;

    wishIcon.classList.toggle('ti-heart', !active);
    wishIcon.classList.toggle('ti-heart-filled', active);
}

// ─────────────────────────────────────────────
// Cart
// ─────────────────────────────────────────────

async function initCart(product) {
    const cartBtn = getElement([
        '#cartBtn',
        '#addToCartBtn',
        '.add-to-cart-btn',
        '.product-cart-btn'
    ]);

    const cartCounter = getElement([
        '#cartCounter',
        '.cart-counter',
        '.product-cart-counter'
    ]);

    const counterNum = getElement([
        '#counterNum',
        '.counter-num',
        '.cart-counter__num'
    ]);

    const decreaseBtn = getElement([
        '#decreaseBtn',
        '.counter-decrease',
        '.qty-minus'
    ]);

    const increaseBtn = getElement([
        '#increaseBtn',
        '.counter-increase',
        '.qty-plus'
    ]);

    if (!cartBtn) return;

    if (Number(product.stock || 0) <= 0) {
        cartBtn.textContent = 'ناموجود';
        cartBtn.disabled = true;
        setVisible(cartCounter, false);
        return;
    }

    ProductState.maxQty = Number(product.stock || 0);

    const initialQty = await getInitialCartQuantity(product.id);

    ProductState.quantity = Math.max(0, Math.min(initialQty, ProductState.maxQty));
    ProductState.inCart = ProductState.quantity > 0;

    function renderCartUi() {
        if (ProductState.inCart) {
            cartBtn.classList.add('hidden');
            cartCounter?.classList.add('visible');

            setVisible(cartBtn, false);
            setVisible(cartCounter, true, 'flex');

            if (counterNum) {
                counterNum.textContent = String(ProductState.quantity);
            }

            if (decreaseBtn) decreaseBtn.disabled = false;
            if (increaseBtn) increaseBtn.disabled = ProductState.quantity >= ProductState.maxQty;
        } else {
            cartBtn.classList.remove('hidden');
            cartCounter?.classList.remove('visible');

            setVisible(cartBtn, true);
            setVisible(cartCounter, false);

            if (decreaseBtn) decreaseBtn.disabled = true;
            if (increaseBtn) increaseBtn.disabled = false;
        }
    }

    async function addOneToCart() {
        if (ProductState.inCart) return;

        ProductState.quantity = 1;
        ProductState.inCart = true;

        await syncCart(product, ProductState.quantity);
        renderCartUi();

        showNotification('✅ محصول به سبد اضافه شد');
    }

    async function increaseQty() {
        if (!ProductState.inCart) return;

        if (ProductState.quantity >= ProductState.maxQty) {
            showNotification(`حداکثر ${ProductState.maxQty} عدد قابل انتخاب است`, false);
            return;
        }

        ProductState.quantity += 1;

        await syncCart(product, ProductState.quantity);
        renderCartUi();
    }

    async function decreaseQty() {
        if (!ProductState.inCart) return;

        ProductState.quantity -= 1;

        if (ProductState.quantity <= 0) {
            ProductState.quantity = 0;
            ProductState.inCart = false;

            await syncCart(product, 0);
            renderCartUi();

            showNotification('محصول از سبد حذف شد');
            return;
        }

        await syncCart(product, ProductState.quantity);
        renderCartUi();
    }

    if (cartBtn.dataset.bound !== '1') {
        cartBtn.dataset.bound = '1';
        cartBtn.addEventListener('click', addOneToCart);
    }

    if (increaseBtn && increaseBtn.dataset.bound !== '1') {
        increaseBtn.dataset.bound = '1';
        increaseBtn.addEventListener('click', increaseQty);
    }

    if (decreaseBtn && decreaseBtn.dataset.bound !== '1') {
        decreaseBtn.dataset.bound = '1';
        decreaseBtn.addEventListener('click', decreaseQty);
    }

    renderCartUi();
}

async function syncCart(product, quantity) {
    if (safeIsLoggedIn()) {
        try {
            const endpoints = quantity <= 0
                ? [
                    {
                        url: `${API}/api/cart/items/${encodeURIComponent(product.id)}`,
                        options: { method: 'DELETE' }
                    },
                    {
                        url: `${API}/api/cart/items`,
                        options: {
                            method: 'POST',
                            body: { product_id: product.id, quantity: 0 }
                        }
                    }
                ]
                : [
                    {
                        url: `${API}/api/cart/items`,
                        options: {
                            method: 'POST',
                            body: { product_id: product.id, quantity }
                        }
                    }
                ];

            let success = false;

            for (const endpoint of endpoints) {
                try {
                    const res = await safeAuthFetch(endpoint.url, endpoint.options);

                    if (res && res.ok) {
                        success = true;
                        break;
                    }
                } catch (_) {}
            }

            if (!success) {
                throw new Error('Cart sync failed');
            }

            updateCartBadgeSafe();
        } catch (err) {
            console.error('خطا در همگام‌سازی سبد:', err);
            showNotification('خطا در ارتباط با سرور', false);
        }

        return;
    }

    const cart = readLocalCart();

    if (quantity <= 0) {
        const filtered = cart.filter(item => {
            const itemProductId =
                item.product_id ??
                item.productId ??
                item.product?.id ??
                item.id;

            return String(itemProductId) !== String(product.id);
        });

        writeLocalCart(filtered);
        updateCartBadgeSafe();

        return;
    }

    const existing = cart.find(item => {
        const itemProductId =
            item.product_id ??
            item.productId ??
            item.product?.id ??
            item.id;

        return String(itemProductId) === String(product.id);
    });

    if (existing) {
        existing.quantity = quantity;
    } else {
        cart.push({
            id: product.id,
            product_id: product.id,
            quantity,
            price: product.price,
            discount: product.discount || 0,
            name: product.name,
            image_url: getProductMainImage(product)
        });
    }

    writeLocalCart(cart);
    updateCartBadgeSafe();
}

// این تابع را global می‌کنیم تا اگر HTML یا کارت‌ها از آن استفاده کردند، خطا ندهد.
window.addToCartFromCard = async function addToCartFromCard(productData) {
    const product = typeof productData === 'object'
        ? productData
        : { id: productData };

    if (!product || !product.id) {
        showNotification('محصول معتبر نیست', false);
        return;
    }

    if (Number(product.stock ?? 1) <= 0) {
        showNotification('این محصول ناموجود است', false);
        return;
    }

    const normalizedProduct = {
        id: product.id,
        name: product.name || 'محصول',
        price: product.price || 0,
        discount: product.discount || 0,
        stock: product.stock || 1,
        image_url: product.image_url || getProductMainImage(product)
    };

    const currentQty = safeIsLoggedIn()
        ? await getCartQuantityForLoggedUser(normalizedProduct.id)
        : getCartQuantityInLocal(normalizedProduct.id);

    await syncCart(normalizedProduct, currentQty + 1);

    showNotification('✅ محصول به سبد اضافه شد');
};

// ─────────────────────────────────────────────
// Similar products
// ─────────────────────────────────────────────

async function loadSimilar(categoryId, currentId) {
    const container = getElement([
        '.bs-grid',
        '.similar-products',
        '.related-products',
        '#similarProducts'
    ]);

    if (!container) return;

    const requests = [];

    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
        requests.push(`${API}/api/products?category_id=${encodeURIComponent(categoryId)}&per_page=6`);
    }

    requests.push(`${API}/api/products?per_page=6`);

    for (const url of requests) {
        try {
            const res = await fetch(url);
            if (!res.ok) continue;

            const data = await res.json();

            const products = normalizeProductsResponse(data)
                .filter(product => String(product.id) !== String(currentId))
                .slice(0, 6);

            if (!products.length) continue;

            renderSimilarProducts(container, products);
            return;
        } catch (err) {
            console.error('خطا در دریافت محصولات مشابه:', err);
        }
    }

    container.innerHTML = '<p style="text-align:center;color:#888">محصول مشابهی یافت نشد.</p>';
}

function renderSimilarProducts(container, products) {
    container.innerHTML = products.map(product => {
        const finalPrice = getFinalPrice(product);
        const image = product.image_url || getProductMainImage(product);
        const hasDiscount = Number(product.discount || 0) > 0;

        return `
            <div class="product-card" data-product-id="${escapeHtml(product.id)}" style="cursor:pointer">
                ${hasDiscount ? `<div class="product-card__badge">${escapeHtml(product.discount)}٪</div>` : ''}

                <div class="product-card__img">
                    <img
                        src="${escapeHtml(image)}"
                        alt="${escapeHtml(product.name)}"
                        onerror="this.onerror=null;this.src='img/product/prod1.jpeg'"
                    >
                </div>

                <div class="product-card__name">
                    ${escapeHtml(product.name || 'محصول بدون نام')}
                </div>

                <div class="product-card__footer">
                    <div class="product-card__price-box">
                        ${hasDiscount ? `<div class="product-card__old-price">${toFaPrice(product.price)} تومان</div>` : ''}
                        <div class="product-card__price">${toFaPrice(finalPrice)} تومان</div>
                    </div>

                    <button class="product-card__cart" type="button" aria-label="افزودن به سبد">
                        +
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.product-card').forEach((card, index) => {
        const product = products[index];
        const cartBtn = card.querySelector('.product-card__cart');

        card.addEventListener('click', () => {
            window.location.href = `product-page.html?id=${encodeURIComponent(product.id)}`;
        });

        if (cartBtn) {
            cartBtn.addEventListener('click', async event => {
                event.preventDefault();
                event.stopPropagation();

                await window.addToCartFromCard({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    discount: product.discount || 0,
                    stock: product.stock || 1,
                    image_url: product.image_url || getProductMainImage(product)
                });
            });
        }
    });
}

// ─────────────────────────────────────────────
// Comments
// ─────────────────────────────────────────────

async function loadComments(id = productId) {
    const commentsContainer = getElement([
        '#commentsList',
        '.comments-list',
        '.product-comments'
    ]);

    if (!commentsContainer) {
        bindCommentForm(id);
        return;
    }

    try {
        const res = await fetch(`${API}/api/products/${encodeURIComponent(id)}/comments`);

        if (!res.ok) {
            commentsContainer.innerHTML = '<p style="color:#888">نظری برای این محصول ثبت نشده است.</p>';
            bindCommentForm(id);
            return;
        }

        const data = await res.json();
        const comments = normalizeCommentsResponse(data);

        if (!comments.length) {
            commentsContainer.innerHTML = '<p style="color:#888">نظری برای این محصول ثبت نشده است.</p>';
            bindCommentForm(id);
            return;
        }

        commentsContainer.innerHTML = comments.map(comment => renderComment(comment)).join('');
    } catch (err) {
        console.error('خطا در بارگذاری دیدگاه‌ها:', err);
        commentsContainer.innerHTML = '<p style="color:#888">خطا در بارگذاری دیدگاه‌ها.</p>';
    }

    bindCommentForm(id);
}

function renderComment(comment) {
    const author =
        comment.user_name ||
        comment.username ||
        comment.user?.name ||
        comment.name ||
        'کاربر';

    const body =
        comment.body ||
        comment.text ||
        comment.comment ||
        comment.content ||
        '';

    const rating = Number(comment.rating || comment.rate || 0);
    const createdAt = comment.created_at || comment.createdAt || '';

    return `
        <div class="comment-item">
            <div class="comment-item__header">
                <strong>${escapeHtml(author)}</strong>
                ${rating > 0 ? `<span>${'★'.repeat(Math.min(rating, 5))}</span>` : ''}
            </div>

            <p>${escapeHtml(body)}</p>

            ${createdAt ? `<small>${escapeHtml(createdAt)}</small>` : ''}
        </div>
    `;
}

function bindCommentForm(id) {
    const form = getElement([
        '#commentForm',
        '.comment-form'
    ]);

    if (!form || form.dataset.bound === '1') return;

    form.dataset.bound = '1';

    form.addEventListener('submit', async event => {
        event.preventDefault();

        if (!safeIsLoggedIn()) {
            showNotification('برای ثبت دیدگاه ابتدا وارد حساب کاربری شوید', false);
            return;
        }

        const textarea = form.querySelector('textarea[name="comment"], textarea[name="body"], textarea');
        const ratingInput = form.querySelector('[name="rating"], [name="rate"]');

        const body = textarea?.value?.trim() || '';
        const rating = ratingInput ? Number(ratingInput.value || 0) : undefined;

        if (!body) {
            showNotification('متن دیدگاه را وارد کنید', false);
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');

        try {
            if (submitBtn) submitBtn.disabled = true;

            const payload = { body };

            if (rating !== undefined && !Number.isNaN(rating)) {
                payload.rating = rating;
            }

            const res = await safeAuthFetch(`${API}/api/products/${encodeURIComponent(id)}/comments`, {
                method: 'POST',
                body: payload
            });

            if (!res || !res.ok) {
                const data = await res?.json?.().catch(() => ({}));
                throw new Error(data?.error || data?.message || 'Comment submit failed');
            }

            textarea.value = '';

            showNotification('دیدگاه شما ثبت شد');
            await loadComments(id);
        } catch (err) {
            console.error('خطا در ثبت دیدگاه:', err);
            showNotification('خطا در ثبت دیدگاه', false);
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

// ─────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    loadProduct();
});
