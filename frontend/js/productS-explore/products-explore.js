// ============================================================
// products-explore.js — RoboKala (Optimized & Integrated)
// ============================================================

// کش محلی برای نگهداری اطلاعات محصولات (جلوگیری از باگ کوتیشن در HTML)
let productsCache = {};

// ════════════════════════════════════════════════════════════
// لود محصولات از API
// ════════════════════════════════════════════════════════════
async function loadProducts(params = {}) {
    const grid = document.querySelector('.products-grid');
    const countEl = document.querySelector('.products-count');
    if (!grid) return;

    grid.innerHTML = '<div style="text-align:center;padding:60px;opacity:.6;grid-column:1/-1">در حال بارگذاری محصولات...</div>';

    // فیلتر کردن پارامترهای خالی
    const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== '' && v != null)
    );
    const qs = new URLSearchParams(cleanParams).toString();

    try {
        const res = await fetch(`/api/products${qs ? '?' + qs : ''}`);
        if (!res.ok) throw new Error('Network response was not ok');
        
        const data = await res.json();
        const products = Array.isArray(data) ? data : (data.products || []);
        const total = data.total ?? products.length;

        if (countEl) countEl.textContent = `${total} محصول`;

        if (!products.length) {
            grid.innerHTML = '<div style="text-align:center;padding:60px;opacity:.6;grid-column:1/-1">محصولی با این مشخصات یافت نشد</div>';
            return;
        }

        // پر کردن کش محصولات برای استفاده در کلیک‌ها
        productsCache = {};
        products.forEach(p => { productsCache[p.id] = p; });

        // رندر کارت‌ها
        grid.innerHTML = products.map(renderCard).join('');

    } catch (err) {
        console.error('Fetch error:', err);
        grid.innerHTML = '<div style="text-align:center;padding:60px;color:#ff6b6b;grid-column:1/-1">⚠️ خطا در ارتباط با سرور — مطمئن شو Flask اجرا شده باشه</div>';
    }
}

// ════════════════════════════════════════════════════════════
// ساخت HTML کارت محصول (بدون onclick درون‌خطی و ایمن)
// ════════════════════════════════════════════════════════════
function renderCard(p) {
    const hasDisc = p.discount > 0;
    const finalPrice = hasDisc ? Math.round(p.price * (1 - p.discount / 100)) : p.price;
    const img = p.image_url || 'img/product/prod1.jpeg';
    
    return `
        <div class="product-card" data-pid="${p.id}" style="cursor:pointer">
            ${hasDisc ? `<div class="product-card__badge">${p.discount}%</div>` : ''}
            <div class="product-card__img">
                <img src="${img}" alt="${p.name}"
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
                <div class="product-card__cart" data-cart-pid="${p.id}" style="cursor:pointer" title="افزودن به سبد خرید">
                    <i class="ti ti-shopping-cart"></i>
                </div>
            </div>
        </div>`;
}

// ════════════════════════════════════════════════════════════
// رویدادها و Event Delegation (یکپارچه و پرفورمنس بالا)
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

    // هندل کردن کلیک‌های روی کل گرید (سبد خرید یا رفتن به صفحه محصول)
    const grid = document.querySelector('.products-grid');
    if (grid) {
        grid.addEventListener('click', (e) => {
            // آیا روی دکمه سبد خرید کلیک شده؟
            const cartBtn = e.target.closest('[data-cart-pid]');
            if (cartBtn) {
                e.stopPropagation(); // جلوگیری از رفتن به صفحه محصول
                const product = productsCache[cartBtn.dataset.cartPid];
                if (product) addToCartFromCard(product, 1); // استفاده از تابع ایمن auth-helper.js
                return;
            }
            
            // آیا روی بدنه کارت کلیک شده؟
            const card = e.target.closest('[data-pid]');
            if (card) {
                window.location.href = `/product.html?id=${card.dataset.pid}`;
            }
        });
    }

    // خواندن پارامترهای URL
    const sp = new URLSearchParams(window.location.search);
    const urlSearch = sp.get('search');
    const urlCat = sp.get('category');

    loadCategories();
    loadProducts(
        urlSearch ? { search: urlSearch } :
        urlCat ? { category: urlCat } :
        {}
    );
});

// ════════════════════════════════════════════════════════════
// لود دسته‌بندی‌ها از API
// ════════════════════════════════════════════════════════════
async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        if (!res.ok) return;
        const cats = await res.json();

        document.querySelectorAll('.filter-group').forEach(group => {
            if (group.querySelector('h4')?.textContent?.trim() !== 'دسته‌بندی') return;
            
            group.querySelectorAll('.filter-check').forEach(c => c.remove());
            group.querySelector('.show-more-btn')?.remove();

            cats.forEach(cat => {
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
        console.error('Categories load error:', err);
    }
}

// ════════════════════════════════════════════════════════════
// اعمال فیلترها
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

    const pMin = document.getElementById('priceMin')?.value;
    const pMax = document.getElementById('priceMax')?.value;
    if (pMin) params.price_min = pMin;
    if (pMax) params.price_max = pMax;

    // استخراج وضعیت Sort فعلی
    const selectedText = document.getElementById('selectedOption')?.textContent.trim();
    const sortMap = { 'جدیدترین': '', 'ارزان‌ترین': 'price_asc', 'گران‌ترین': 'price_desc' };
    if (selectedText && sortMap[selectedText]) {
        params.sort = sortMap[selectedText];
    }

    await loadProducts(params);
}

// ════════════════════════════════════════════════════════════
// نمایش بیشتر / کمتر در فیلترها
// ════════════════════════════════════════════════════════════
document.querySelectorAll('.filter-group').forEach(group => {
    const checks = group.querySelectorAll('.filter-check');
    if (checks.length <= 2) return;

    checks.forEach((c, i) => { if (i >= 2) c.style.display = 'none'; });

    const btn = document.createElement('button');
    btn.className = 'show-more-btn';
    btn.textContent = `+ ${checks.length - 2} مورد بیشتر`;
    let open = false;

    btn.addEventListener('click', () => {
        open = !open;
        checks.forEach((c, i) => { if (i >= 2) c.style.display = open ? 'flex' : 'none'; });
        btn.textContent = open ? 'بستن' : `+ ${checks.length - 2} مورد بیشتر`;
    });
    group.appendChild(btn);
});

// ════════════════════════════════════════════════════════════
// دکمه‌های پاک کردن و اعمال فیلتر
// ════════════════════════════════════════════════════════════
function updateClearBtn() {
    const clearBtn = document.querySelector('.filter-clear');
    const applyBtn = document.getElementById('applyBtn');
    
    const hasChecked = [...document.querySelectorAll('.filter-check input')].some(i => i.checked);
    const hasPrice = document.getElementById('priceMin')?.value !== '' || document.getElementById('priceMax')?.value !== '';
    const active = hasChecked || hasPrice;

    [clearBtn, applyBtn].forEach(el => {
        if (!el) return;
        el.style.opacity = active ? '1' : '0';
        el.style.pointerEvents = active ? 'all' : 'none';
    });
}

document.querySelectorAll('.filter-check input').forEach(i => i.addEventListener('change', updateClearBtn));
document.getElementById('priceMin')?.addEventListener('input', updateClearBtn);
document.getElementById('priceMax')?.addEventListener('input', updateClearBtn);
document.getElementById('applyBtn')?.addEventListener('click', applyFilters);

document.querySelector('.filter-clear')?.addEventListener('click', () => {
    document.querySelectorAll('.filter-check input').forEach(i => i.checked = false);
    if (document.getElementById('priceMin')) document.getElementById('priceMin').value = '';
    if (document.getElementById('priceMax')) document.getElementById('priceMax').value = '';
    updateClearBtn();
    applyFilters(); // فراخوانی به جای loadProducts خالی تا با Sort ترکیب شود
});

updateClearBtn();

// ════════════════════════════════════════════════════════════
// منوی فیلتر موبایل
// ════════════════════════════════════════════════════════════
document.querySelector('.filter-mobile-toggle')?.addEventListener('click', () => {
    const sidebar = document.querySelector('.filter-sidebar');
    sidebar?.classList.toggle('mobile-open');
    const span = document.querySelector('.filter-mobile-toggle span');
    if (span) span.textContent = sidebar?.classList.contains('mobile-open') ? 'بستن فیلترها' : 'فیلترها';
});

// ════════════════════════════════════════════════════════════
// منوی کرکره‌ای سفارشی (مرتب‌سازی)
// ════════════════════════════════════════════════════════════
const customSelect = document.getElementById('customSelect');
const selectedOption = document.getElementById('selectedOption');

if (customSelect) {
    const optionsEl = customSelect.querySelector('.custom-select__options');
    if (optionsEl) {
        document.body.appendChild(optionsEl);

        const pos = () => {
            const r = customSelect.getBoundingClientRect();
            Object.assign(optionsEl.style, {
                position:'fixed', top:(r.bottom+8)+'px',
                left:r.left+'px', width:r.width+'px',
                zIndex: '9999'
            });
        };

        customSelect.addEventListener('click', e => {
            const open = customSelect.classList.toggle('open');
            if (open) pos();
            optionsEl.style.opacity = open ? '1' : '0';
            optionsEl.style.pointerEvents = open ? 'all' : 'none';
            optionsEl.style.transform = open ? 'translateY(0)' : 'translateY(-8px)';
            e.stopPropagation();
        });

        optionsEl.querySelectorAll('.custom-select__option').forEach(opt => {
            opt.addEventListener('click', e => {
                e.stopPropagation();
                if (selectedOption) selectedOption.textContent = opt.textContent;
                
                optionsEl.querySelectorAll('.custom-select__option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                customSelect.classList.remove('open');
                optionsEl.style.opacity = '0';
                optionsEl.style.pointerEvents = 'none';
                
                applyFilters(); // فراخوانی این تابع تا هم فیلترها و هم سورت باهم اعمال شوند
            });
        });

        document.addEventListener('click', () => {
            customSelect.classList.remove('open');
            optionsEl.style.opacity = '0';
            optionsEl.style.pointerEvents = 'none';
        });
        
        window.addEventListener('scroll', () => {
            if (customSelect.classList.contains('open')) pos();
        });
    }
}