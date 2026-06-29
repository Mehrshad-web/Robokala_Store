// ============================================================
// products-explore.js — نسخه نهایی ادغام‌شده (RoboKala)
// ============================================================

const CART_KEY  = 'robokala_cart';
const TOKEN_KEY = 'robokala_token';
const API_BASE  = ''; // Flask same domain

// ════════════════════════════════════════════════════════════
// تابع نمایش نوتیفیکیشن (برگرفته از popup شما)
// ════════════════════════════════════════════════════════════
function showNotification(msg, ok = true) {
    document.querySelectorAll('.rk-popup').forEach(n => n.remove());
    const n = document.createElement('div');
    n.className = 'rk-popup';
    n.textContent = msg;
    Object.assign(n.style, {
        position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)',
        background: ok ? '#51cf66' : '#ff6b6b', color:'white',
        padding:'12px 28px', borderRadius:'10px', zIndex:'99999',
        fontSize:'14px', boxShadow:'0 4px 20px rgba(0,0,0,.3)',
        transition:'opacity .3s', whiteSpace:'nowrap'
    });
    document.body.appendChild(n);
    setTimeout(() => { n.style.opacity = '0'; setTimeout(() => n.remove(), 300); }, 2500);
}

// ════════════════════════════════════════════════════════════
// افزودن به سبد خرید (نسخه همکار - ادغام‌شده با showNotification و KEY ها)
// ════════════════════════════════════════════════════════════
async function addToCartFromCard(product, event) {
    // جلوگیری از رفتن به صفحه product
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    try {
        if (typeof isLoggedIn === 'function' && isLoggedIn()) {
            const res = await authFetch('/api/cart/items', {
                method: 'POST',
                body: JSON.stringify({
                    product_id: product.id,
                    quantity: 1
                })
            });

            if (res && res.ok) {
                showNotification('✅ به سبد اضافه شد');
            } else if (res) {
                const d = await res.json();
                showNotification(d.error || 'خطا', false);
            }
        } else {
            const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
            const existing = cart.find(i => i.id === product.id);

            if (existing) {
                existing.quantity++;
            } else {
                cart.push({
                    id: product.id,
                    quantity: 1,
                    price: product.price,
                    discount: product.discount || 0,
                    name: product.name,
                    image_url: product.image_url || ''
                });
            }

            localStorage.setItem(CART_KEY, JSON.stringify(cart));
            showNotification('✅ محصول به سبد اضافه شد');
        }
    } catch (err) {
        console.error(err);
        showNotification('خطا در ارتباط با سرور', false);
    }
}

// ════════════════════════════════════════════════════════════
// ساخت HTML کارت محصول (نسخه همکار)
// ════════════════════════════════════════════════════════════
function renderProductCard(p) {
    const hasDiscount = p.discount > 0;
    const finalPrice = hasDiscount
        ? Math.round(p.price * (1 - p.discount / 100))
        : p.price;
    const img = p.image_url || 'img/product/prod1.jpeg';
    const badge = hasDiscount
        ? `<div class="product-card__badge">${p.discount}%</div>`
        : '';
    const oldPrice = hasDiscount
        ? `<div class="product-card__old">${p.price.toLocaleString('fa-IR')}</div>`
        : '';

    return `
        <a href="product.html?id=${p.id}" style="text-decoration:none;color:inherit;">
            <div class="product-card">
                ${badge}
                <div class="product-card__img">
                    <img src="${img}" alt="${p.name}"
                         onerror="this.onerror=null;this.src='img/product/prod1.jpeg'">
                </div>
                <div class="product-card__name">${p.name}</div>
                <div class="product-card__footer">
                    <div class="product-card__price-box">
                        ${oldPrice}
                        <div class="product-card__price">
                            ${finalPrice.toLocaleString('fa-IR')}
                            <span class="product-card__unit">تومان</span>
                        </div>
                    </div>
                    <div class="product-card__cart"
                        onclick='addToCartFromCard(${JSON.stringify(p)}, event)'
                        style="cursor:pointer">
                        <i class="ti ti-shopping-cart"></i>
                    </div>
                </div>
            </div>
        </a>`;
}

// ════════════════════════════════════════════════════════════
// لود محصولات از API (ادغام‌شده)
// ════════════════════════════════════════════════════════════
async function loadProducts(params = {}) {
    const grid = document.querySelector('.products-grid');
    const countEl = document.querySelector('.products-count');
    if (!grid) return;

    grid.innerHTML = '<p style="text-align:center;padding:40px;opacity:0.6">در حال بارگذاری محصولات...</p>';

    const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== '' && v != null)
    );

    const query = new URLSearchParams(cleanParams).toString();
    const url = `${API_BASE}/api/products${query ? '?' + query : ''}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('خطای سرور');
        const data = await res.json();
        const products = Array.isArray(data) ? data : (data.products ?? []);
        const total = data.total ?? products.length;

        if (countEl) countEl.textContent = `${total} محصول`;

        if (!products.length) {
            grid.innerHTML = '<p style="text-align:center;padding:40px;opacity:0.6">محصولی یافت نشد</p>';
            return;
        }

        grid.innerHTML = products.map(renderProductCard).join('');

    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p style="text-align:center;padding:40px;color:red">خطا در ارتباط با سرور — مطمئن شو Flask اجرا شده</p>';
    }
}

// ════════════════════════════════════════════════════════════
// لود دسته‌بندی‌ها از API (ادغام‌شده)
// ════════════════════════════════════════════════════════════
async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        if (!res.ok) return;
        const categories = await res.json();

        document.querySelectorAll('.filter-group').forEach(group => {
            const title = group.querySelector('h4')?.textContent?.trim();
            if (title !== 'دسته‌بندی') return;

            group.querySelectorAll('.filter-check').forEach(c => c.remove());
            const btn = group.querySelector('.show-more-btn');
            if (btn) btn.remove();

            categories.forEach(cat => {
                const div = document.createElement('div');
                div.className = 'filter-check';
                div.innerHTML = `
                    <input type="checkbox" id="cat_${cat.id}">
                    <label for="cat_${cat.id}">${cat.name}</label>
                `;
                group.appendChild(div);
                div.querySelector('input').addEventListener('change', updateClearBtn);
            });
        });
    } catch (err) {
        console.error('خطا در لود دسته‌بندی‌ها:', err);
    }
}

// ════════════════════════════════════════════════════════════
// اعمال فیلترها (ادغام‌شده)
// ════════════════════════════════════════════════════════════
async function applyFilters() {
    const params = {};

    document.querySelectorAll('.filter-group').forEach(group => {
        const title = group.querySelector('h4')?.textContent?.trim();
        if (title === 'دسته‌بندی') {
            const checked = group.querySelector('.filter-check input:checked');
            if (checked) {
                params.category = checked.closest('.filter-check').querySelector('label').textContent.trim();
            }
        }
    });

    const priceMin = document.getElementById('priceMin')?.value;
    const priceMax = document.getElementById('priceMax')?.value;

    if (priceMin) params.price_min = priceMin;
    if (priceMax) params.price_max = priceMax;

    await loadProducts(params);
}

// ════════════════════════════════════════════════════════════
// نمایش بیشتر / بستن فیلترها (نسخه همکار)
// ════════════════════════════════════════════════════════════
document.querySelectorAll('.filter-group').forEach(group => {
    const checks = group.querySelectorAll('.filter-check');
    if (checks.length <= 2) return;

    checks.forEach((check, i) => {
        if (i >= 2) check.style.display = 'none';
    });

    const btn = document.createElement('button');
    btn.className = 'show-more-btn';
    btn.textContent = `+ ${checks.length - 2} مورد بیشتر`;
    let isOpen = false;

    btn.addEventListener('click', () => {
        isOpen = !isOpen;
        checks.forEach((check, i) => {
            if (i >= 2) check.style.display = isOpen ? 'flex' : 'none';
        });
        btn.textContent = isOpen ? 'بستن' : `+ ${checks.length - 2} مورد بیشتر`;
    });
    group.appendChild(btn);
});

// ════════════════════════════════════════════════════════════
// دکمه‌های Clear / Apply (ادغام‌شده)
// ════════════════════════════════════════════════════════════
function updateClearBtn() {
    const clearBtn = document.querySelector('.filter-clear');
    const applyBtn = document.getElementById('applyBtn');

    const priceMin = document.getElementById('priceMin');
    const priceMax = document.getElementById('priceMax');

    const hasChecked = [...document.querySelectorAll('.filter-check input')]
        .some(i => i.checked);

    const hasPrice = priceMin?.value !== '' || priceMax?.value !== '';

    const hasActive = hasChecked || hasPrice;

    if (clearBtn) {
        clearBtn.style.opacity = hasActive ? '1' : '0';
        clearBtn.style.pointerEvents = hasActive ? 'all' : 'none';
    }
    if (applyBtn) {
        applyBtn.style.opacity = hasActive ? '1' : '0';
        applyBtn.style.pointerEvents = hasActive ? 'all' : 'none';
    }
}

// ════════════════════════════════════════════════════════════
// Event Listeners برای فیلترها (ادغام‌شده)
// ════════════════════════════════════════════════════════════
document.querySelectorAll('.filter-check input').forEach(input => {
    input.addEventListener('change', updateClearBtn);
});

document.getElementById('priceMin')?.addEventListener('input', updateClearBtn);
document.getElementById('priceMax')?.addEventListener('input', updateClearBtn);

document.getElementById('applyBtn')?.addEventListener('click', applyFilters);

updateClearBtn();

// ════════════════════════════════════════════════════════════
// Filter Reset (ادغام‌شده)
// ════════════════════════════════════════════════════════════
document.querySelector('.filter-clear')?.addEventListener('click', () => {
    document.querySelectorAll('.filter-check input')
        .forEach(input => input.checked = false);

    if (document.getElementById('priceMin')) document.getElementById('priceMin').value = '';
    if (document.getElementById('priceMax')) document.getElementById('priceMax').value = '';

    updateClearBtn();
    loadProducts();
});

// ════════════════════════════════════════════════════════════
// Mobile Filter Toggle (ادغام‌شده)
// ════════════════════════════════════════════════════════════
const filterSidebar = document.querySelector('.filter-sidebar');
const filterToggle = document.querySelector('.filter-mobile-toggle');

filterToggle?.addEventListener('click', () => {
    filterSidebar?.classList.toggle('mobile-open');

    const span = filterToggle?.querySelector('span');
    if (span) {
        span.textContent =
            filterSidebar?.classList.contains('mobile-open')
                ? 'بستن فیلترها'
                : 'فیلترها';
    }
});

// ════════════════════════════════════════════════════════════
// Custom Select (مرتب‌سازی) (ادغام‌شده)
// ════════════════════════════════════════════════════════════
const customSelect = document.getElementById('customSelect');
const selectedOption = document.getElementById('selectedOption');

if (customSelect && selectedOption) {
    const optionsEl = customSelect.querySelector('.custom-select__options');

    if (optionsEl) {
        document.body.appendChild(optionsEl);

        function positionOptions() {
            const rect = customSelect.getBoundingClientRect();
            Object.assign(optionsEl.style, {
                position: 'fixed',
                top: (rect.bottom + 8) + 'px',
                left: rect.left + 'px',
                width: rect.width + 'px'
            });
        }

        customSelect.addEventListener('click', (e) => {
            const isOpen = customSelect.classList.toggle('open');
            if (isOpen) {
                positionOptions();
                optionsEl.style.opacity = '1';
                optionsEl.style.pointerEvents = 'all';
                optionsEl.style.transform = 'translateY(0)';
            } else {
                optionsEl.style.opacity = '0';
                optionsEl.style.pointerEvents = 'none';
                optionsEl.style.transform = 'translateY(-8px)';
            }
            e.stopPropagation();
        });

        const sortMap = {
            'جدیدترین': '',
            'ارزان‌ترین': 'price_asc',
            'گران‌ترین': 'price_desc'
        };

        optionsEl.querySelectorAll('.custom-select__option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedOption.textContent = option.textContent;
                optionsEl.querySelectorAll('.custom-select__option')
                    .forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                customSelect.classList.remove('open');
                optionsEl.style.opacity = '0';
                optionsEl.style.pointerEvents = 'none';
                const sort = sortMap[option.textContent.trim()] ?? '';
                loadProducts(sort ? { sort } : {});
            });
        });

        document.addEventListener('click', () => {
            customSelect.classList.remove('open');
            optionsEl.style.opacity = '0';
            optionsEl.style.pointerEvents = 'none';
        });
    }
}

// ════════════════════════════════════════════════════════════
// INITIALIZATION (بارگذاری اولیه)
// ════════════════════════════════════════════════════════════
// خواندن پارامترها از URL
const urlSearchParams = new URLSearchParams(window.location.search);
const urlSearch = urlSearchParams.get('search');
const urlCat = urlSearchParams.get('category'); // اضافه شدن از کد شما

// لود دسته‌بندی‌ها
loadCategories();

// لود محصولات با پارامترهای URL
loadProducts(
    urlSearch ? { search: urlSearch } :
    urlCat ? { category: urlCat } :
    {}
);
