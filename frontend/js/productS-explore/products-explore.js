// ============================================================
// products-explore.js — نسخه نهایی (ترکیب صفحه‌بندی، برند و بهینه‌سازی)
// ============================================================

const PER_PAGE = 12;
let productsCache = {};

// نگهداری وضعیت فعلی فیلترها و صفحه‌بندی
let currentFilters = {
    category: '', search: '', brand: '',
    price_min: '', price_max: '', discount_only: '',
    sort: '', page: 1
};

// ════════════════════════════════════════════════════════════
// لود محصولات از API
// ════════════════════════════════════════════════════════════
async function loadProducts() {
    const grid    = document.querySelector('.products-grid');
    const countEl = document.querySelector('.products-count');
    if (!grid) return;

    grid.innerHTML = '<div style="text-align:center;padding:60px;opacity:.6;grid-column:1/-1">در حال بارگذاری محصولات...</div>';

    // فیلتر کردن پارامترهای خالی
    const cleanParams = Object.fromEntries(
        Object.entries({ ...currentFilters, per_page: PER_PAGE })
              .filter(([_, v]) => v !== '' && v != null)
    );
    const qs = new URLSearchParams(cleanParams).toString();

    try {
        const res  = await fetch(`/api/products${qs ? '?' + qs : ''}`);
        if (!res.ok) throw new Error('Network response was not ok');
        
        const data = await res.json();
        const products   = data.products || [];
        const total      = data.total ?? products.length;
        const totalPages = data.total_pages ?? 1;

        if (countEl) countEl.textContent = `${total.toLocaleString('fa-IR')} محصول`;

        if (!products.length) {
            grid.innerHTML = '<div style="text-align:center;padding:60px;opacity:.6;grid-column:1/-1">محصولی با این مشخصات یافت نشد</div>';
            renderPagination(0, 1);
            return;
        }

        // پر کردن کش محصولات برای استفاده در کلیک‌ها
        productsCache = {};
        products.forEach(p => { productsCache[p.id] = p; });

        // رندر کارت‌ها و صفحه‌بندی
        grid.innerHTML = products.map(renderCard).join('');
        renderPagination(totalPages, currentFilters.page);

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
// صفحه‌بندی واقعی — متصل به بک‌اند
// ════════════════════════════════════════════════════════════
function getPaginationContainer() {
    let el = document.querySelector('.pagination, .pg-list, .page-numbers, #pagination, .pager, .paging');
    if (el) { el.innerHTML = ''; return el; }

    el = document.createElement('div');
    el.id = 'rkPagination';
    document.querySelector('.products-grid')?.insertAdjacentElement('afterend', el);
    return el;
}

function buildPageList(total, current) {
    const delta = 1;
    const range = [];
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
        range.push(i);
    }
    const pages = [1];
    if (range[0] > 2) pages.push('...');
    pages.push(...range);
    if (range[range.length - 1] < total - 1) pages.push('...');
    if (total > 1) pages.push(total);
    return pages;
}

function renderPagination(totalPages, current) {
    const container = getPaginationContainer();
    if (!container) return;

    container.style.cssText = `
        display:flex; justify-content:center; align-items:center;
        gap:8px; margin:32px 0; flex-wrap:wrap; direction:ltr;
    `;

    if (totalPages <= 1) { container.innerHTML = ''; return; }

    const pages = buildPageList(totalPages, current);
    const btnStyle = (active, disabled) => `
        min-width:40px; height:40px; padding:0 10px; border-radius:10px;
        border:none; cursor:${disabled ? 'not-allowed' : 'pointer'}; font-size:14px; font-weight:600;
        display:inline-flex; align-items:center; justify-content:center;
        background:${active ? 'linear-gradient(135deg,#6d5bff,#4f3bd6)' : 'rgba(109,91,255,.08)'};
        color:${active ? '#fff' : '#4b3fae'};
        opacity:${disabled ? '.35' : '1'};
    `;

    let html = `<button class="rk-pg-nav" data-page="${current - 1}" ${current <= 1 ? 'disabled' : ''}
                    style="${btnStyle(false, current <= 1)}">‹</button>`;

    pages.forEach(p => {
        if (p === '...') {
            html += `<span style="padding:0 6px;color:#8b8bb0">...</span>`;
        } else {
            html += `<button class="rk-pg-num" data-page="${p}" style="${btnStyle(p === current, false)}">${p.toLocaleString('fa-IR')}</button>`;
        }
    });

    html += `<button class="rk-pg-nav" data-page="${current + 1}" ${current >= totalPages ? 'disabled' : ''}
                style="${btnStyle(false, current >= totalPages)}">›</button>`;

    container.innerHTML = html;

    container.querySelectorAll('[data-page]').forEach(btn => {
        if (btn.disabled) return;
        btn.addEventListener('click', () => {
            const p = parseInt(btn.dataset.page);
            if (!p || p < 1 || p > totalPages || p === current) return;
            currentFilters.page = p;
            loadProducts();
            document.querySelector('.products-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

// ════════════════════════════════════════════════════════════
// رویدادها و Event Delegation (یکپارچه و پرفورمنس بالا)
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

    const grid = document.querySelector('.products-grid');
    if (grid) {
        grid.addEventListener('click', (e) => {
            const cartBtn = e.target.closest('[data-cart-pid]');
            if (cartBtn) {
                e.stopPropagation();
                const product = productsCache[parseInt(cartBtn.dataset.cartPid)];
                if (product) addToCartFromCard(product, 1);
                return;
            }
            const card = e.target.closest('[data-pid]');
            if (card) window.location.href = `/product.html?id=${card.dataset.pid}`;
        });
    }

    const sp = new URLSearchParams(window.location.search);
    currentFilters.search   = sp.get('search')   || '';
    currentFilters.category = sp.get('category') || '';

    loadCategories();
    loadBrands();
    loadProducts();
});

// ════════════════════════════════════════════════════════════
// لود دسته‌بندی‌ها و برندها از API
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
    } catch (err) { console.error('Categories load error:', err); }
}

async function loadBrands() {
    try {
        const res = await fetch('/api/brands');
        if (!res.ok) return;
        const brands = await res.json();

        document.querySelectorAll('.filter-group').forEach(group => {
            if (group.querySelector('h4')?.textContent?.trim() !== 'برند') return;
            
            group.querySelectorAll('.filter-check').forEach(c => c.remove());
            group.querySelector('.show-more-btn')?.remove();

            if (!brands.length) return;

            brands.forEach((brand, i) => {
                const div = document.createElement('div');
                div.className = 'filter-check';
                div.innerHTML = `
                    <input type="checkbox" id="brand_${i}">
                    <label for="brand_${i}">${brand}</label>
                `;
                group.appendChild(div);
                div.querySelector('input').addEventListener('change', updateClearBtn);
            });
        });
    } catch (err) { console.error('Brands load error:', err); }
}

// ════════════════════════════════════════════════════════════
// اعمال فیلترها
// ════════════════════════════════════════════════════════════
function getDiscountCheckbox() {
    const all = document.querySelectorAll('input[type="checkbox"]');
    for (const input of all) {
        const wrapper = input.closest('label') || input.parentElement;
        if (wrapper && wrapper.textContent.includes('تخفیف‌دار')) return input;
    }
    return null;
}

async function applyFilters() {
    document.querySelectorAll('.filter-group').forEach(group => {
        const title = group.querySelector('h4')?.textContent?.trim();

        if (title === 'دسته‌بندی') {
            const checked = group.querySelector('.filter-check input:checked');
            currentFilters.category = checked ? checked.closest('.filter-check').querySelector('label').textContent.trim() : '';
        }
        if (title === 'برند') {
            const checked = group.querySelector('.filter-check input:checked');
            currentFilters.brand = checked ? checked.closest('.filter-check').querySelector('label').textContent.trim() : '';
        }
    });

    currentFilters.price_min = document.getElementById('priceMin')?.value || '';
    currentFilters.price_max = document.getElementById('priceMax')?.value || '';

    const discountCb = getDiscountCheckbox();
    currentFilters.discount_only = discountCb?.checked ? 'true' : '';

    currentFilters.page = 1; // ریست شدن صفحه هنگام اعمال فیلتر جدید
    await loadProducts();
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
    
    const hasChecked  = [...document.querySelectorAll('.filter-check input')].some(i => i.checked);
    const discountCb  = getDiscountCheckbox();
    const hasDiscount = discountCb?.checked || false;
    const hasPrice    = document.getElementById('priceMin')?.value !== '' || document.getElementById('priceMax')?.value !== '';
    const active      = hasChecked || hasPrice || hasDiscount;

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
getDiscountCheckbox()?.addEventListener('change', updateClearBtn);

document.querySelector('.filter-clear')?.addEventListener('click', () => {
    document.querySelectorAll('.filter-check input').forEach(i => i.checked = false);
    const discountCb = getDiscountCheckbox();
    if (discountCb) discountCb.checked = false;
    if (document.getElementById('priceMin')) document.getElementById('priceMin').value = '';
    if (document.getElementById('priceMax')) document.getElementById('priceMax').value = '';

    currentFilters = { category:'', search:'', brand:'', price_min:'', price_max:'', discount_only:'', sort: currentFilters.sort, page: 1 };
    updateClearBtn();
    loadProducts();
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

        const sortMap = { 'جدیدترین': '', 'ارزان‌ترین': 'price_asc', 'گران‌ترین': 'price_desc' };

        optionsEl.querySelectorAll('.custom-select__option').forEach(opt => {
            opt.addEventListener('click', e => {
                e.stopPropagation();
                if (selectedOption) selectedOption.textContent = opt.textContent;
                
                optionsEl.querySelectorAll('.custom-select__option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                customSelect.classList.remove('open');
                optionsEl.style.opacity = '0';
                optionsEl.style.pointerEvents = 'none';
                
                currentFilters.sort = sortMap[opt.textContent.trim()] ?? '';
                currentFilters.page = 1;
                loadProducts();
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