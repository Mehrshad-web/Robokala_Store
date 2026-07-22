// ══════════════════════════════════════════════
// ADMIN.JS - VERSION INTEGRATED
// ══════════════════════════════════════════════

let allProducts = [];
const modal = document.getElementById('productModal');
const uploadArea = document.getElementById('uploadArea');
const fileInput  = document.getElementById('fileInput');
const imgPreview = document.getElementById('imgPreview');
const uploadHint = document.getElementById('uploadHint');

// ─── ACCESS CHECK ─────────────────
(function () {
    const user = getUser();
    if (!isLoggedIn() || !user?.is_admin) {
        alert('فقط ادمین می‌تواند وارد این صفحه شود');
        window.location.href = '/authentication.html';
    }
})();

// ─── NAVIGATION & CONFIG ─────────────────
const sections = {};
const titles = {};

document.querySelectorAll('.side-btn[data-section]').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.side-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        
        btn.classList.add('active');
        const sectionId = 'section-' + btn.dataset.section;
        const targetSection = document.getElementById(sectionId);
        
        if (targetSection) targetSection.classList.add('active');

        // اجرای تابع لود مربوط به بخش
        if (btn.dataset.section === 'dashboard') loadDashboard();
        else if (btn.dataset.section === 'products') loadProducts();
        else if (btn.dataset.section === 'categories') loadCategories(); // فرض بر موجود بودن
        else if (btn.dataset.section === 'orders') loadOrders();
        else if (btn.dataset.section === 'content') loadContentSection();
    };
});

// ─── NOTIFY ─────────────────
function notify(msg, ok = true) {
    const el = document.createElement('div');
    el.className = 'admin-notif';
    el.textContent = msg;
    el.style.background = ok ? '#51cf66' : '#ff6b6b';
    el.style.color = 'white';
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
    }, 2500);
}

// ─── DASHBOARD ─────────────────
async function loadDashboard() {
    const res = await authFetch('/admin/stats');
    if (!res) return;
    const data = await res.json();
    document.getElementById('statProducts').textContent = data.products ?? '—';
    document.getElementById('statCategories').textContent = data.categories ?? '—';
    document.getElementById('statOrders').textContent = data.orders ?? '—';
}

// ─── PRODUCTS ─────────────────
async function loadProducts() {
    const res = await authFetch('/admin/products');
    if (!res) return;
    allProducts = await res.json();
    renderProducts(allProducts);
}

function renderProducts(list) {
    const tbody = document.getElementById('productsTbl');
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="7">محصولی وجود ندارد</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(p => `
        <tr>
            <td>
                <img class="product-thumb" src="${p.image_url || 'img/product/prod1.jpeg'}" onerror="this.src='img/product/prod1.jpeg'">
            </td>
            <td>${p.name}</td>
            <td>${(p.price || 0).toLocaleString('fa-IR')}</td>
            <td>${p.discount || 0}%</td>
            <td>${p.stock}</td>
            <td>${p.category_name || '—'}</td>
            <td>
                <button class="btn-sm btn-edit" onclick="openEditProduct(${p.id})">ویرایش</button>
                <button class="btn-sm btn-delete" onclick="deleteProduct(${p.id})">حذف</button>
            </td>
        </tr>
    `).join('');
}

// ─── OPEN MODAL ─────────────────
async function openAddProduct() {
    document.getElementById('editProductId').value = '';
    document.getElementById('pName').value = '';
    document.getElementById('pPrice').value = '';
    document.getElementById('pDiscount').value = '0';
    document.getElementById('pStock').value = '0';
    document.getElementById('pDesc').value = '';
    document.getElementById('pImage').value = '';
    clearPreview();
    // await fillCategorySelect(); // اگر تابعش موجود است
    modal.classList.add('open');
}

async function openEditProduct(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    document.getElementById('editProductId').value = p.id;
    document.getElementById('pName').value = p.name;
    document.getElementById('pPrice').value = p.price;
    document.getElementById('pDiscount').value = p.discount || 0;
    document.getElementById('pStock').value = p.stock;
    document.getElementById('pDesc').value = p.description || '';
    document.getElementById('pImage').value = p.image_url || '';
    showPreview(p.image_url);
    // await fillCategorySelect(p.category_id);
    modal.classList.add('open');
}

function closeModal() { modal.classList.remove('open'); }

document.getElementById('openAddProduct').onclick = openAddProduct;
document.getElementById('closeModal').onclick = closeModal;
// فرض بر اینکه دکمه cancelModal در HTML موجود باشد
// document.getElementById('cancelModal').onclick = closeModal; 

// ─── SAVE PRODUCT ─────────────────
document.getElementById('saveProductBtn').onclick = async () => {
    const id = document.getElementById('editProductId').value;
    const name = document.getElementById('pName').value.trim();
    const price = parseFloat(document.getElementById('pPrice').value);
    if (!name || isNaN(price)) { notify('نام و قیمت اجباریه', false); return; }
    
    const body = {
        name, price,
        discount: parseFloat(document.getElementById('pDiscount').value) || 0,
        stock: parseInt(document.getElementById('pStock').value) || 0,
        image_url: document.getElementById('pImage').value,
        description: document.getElementById('pDesc').value,
        category_id: document.getElementById('pCategory')?.value || null
    };
    const url = id ? `/admin/products/${id}` : '/admin/products';
    const method = id ? 'PUT' : 'POST';
    const res = await authFetch(url, { method, body: JSON.stringify(body) });
    if (!res) return;
    if (res.ok) { notify('✅ ذخیره شد'); closeModal(); loadProducts(); }
    else { notify('خطا', false); }
};

// ─── DELETE PRODUCT ─────────────────
async function deleteProduct(id) {
    if (!confirm('حذف شود؟')) return;
    const res = await authFetch(`/admin/products/${id}`, { method: 'DELETE' });
    if (res?.ok) { notify('✅ حذف شد'); loadProducts(); }
}

// ─── IMAGE UPLOAD (PRODUCTS) ──
uploadArea.onclick = () => fileInput.click();
fileInput.onchange = () => { if (fileInput.files[0]) uploadFile(fileInput.files[0]); };

async function uploadFile(file) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form
    });
    const data = await res.json();
    if (res.ok) { document.getElementById('pImage').value = data.url; showPreview(data.url); notify('✅ تصویر آپلود شد'); }
    else { notify('خطا در آپلود', false); }
}

function showPreview(url) { imgPreview.src = url; imgPreview.style.display = 'block'; uploadHint.style.display = 'none'; }
function clearPreview() { imgPreview.src = ''; imgPreview.style.display = 'none'; uploadHint.style.display = 'block'; }

// ─── SITE CONTENT SECTION ─────────────────────
// (این بخش از کد ارسالی دوم شما اضافه شد)
let slidesCache = [];
async function loadContentSection() {
    await Promise.all([loadSlides(), loadSocialLinks(), loadSettings(), loadFaqs()]);
}

// ─── Slides ───────────────────────────────────
async function loadSlides() {
    const res = await authFetch('/admin/slides');
    if (!res) return;
    slidesCache = await res.json();
    const tb = document.getElementById('slides-body');
    if (!slidesCache.length) {
        tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:10px">اسلایدی وجود ندارد</td></tr>';
        return;
    }
    tb.innerHTML = slidesCache.map(s => `
        <tr>
            <td><img class="product-thumb" src="${s.image_url}" onerror="this.src='img/product/prod1.jpeg'"></td>
            <td>${s.title || '—'}</td>
            <td style="max-width:200px;white-space:normal">${s.description || '—'}</td>
            <td>${s.order_index}</td>
            <td style="display:flex;gap:6px">
                <button class="btn-sm btn-edit" onclick="openEditSlide(${s.id})"><i class="ti ti-pencil"></i></button>
                <button class="btn-sm btn-delete" onclick="delSlide(${s.id})"><i class="ti ti-trash"></i></button>
            </td>
        </tr>`).join('');
}

function openAddSlide() {
    document.getElementById('editSlideId').value = '';
    document.getElementById('slideModalTitle').textContent = 'اسلاید جدید';
    ['slideTitle','slideDesc','slideLink','slideImageUrl'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('slideOrder').value = slidesCache.length;
    clearSlidePreview();
    document.getElementById('slideModal').classList.add('open');
}

function openEditSlide(id) {
    const s = slidesCache.find(x => x.id === id);
    if (!s) return;
    document.getElementById('editSlideId').value        = s.id;
    document.getElementById('slideModalTitle').textContent = 'ویرایش اسلاید';
    document.getElementById('slideTitle').value     = s.title || '';
    document.getElementById('slideDesc').value      = s.description || '';
    document.getElementById('slideLink').value      = s.link_url || '';
    document.getElementById('slideOrder').value     = s.order_index || 0;
    document.getElementById('slideImageUrl').value  = s.image_url || '';
    if (s.image_url) showSlidePreview(s.image_url); else clearSlidePreview();
    document.getElementById('slideModal').classList.add('open');
}

function closeSlideModal() { document.getElementById('slideModal').classList.remove('open'); }
document.getElementById('openAddSlideBtn').onclick  = openAddSlide;
document.getElementById('closeSlideModal').onclick  = closeSlideModal;
document.getElementById('cancelSlideModal').onclick = closeSlideModal;

document.getElementById('slideModal').addEventListener('click', e => {
    if (e.target.id === 'slideModal') closeSlideModal();
});

document.getElementById('saveSlideBtn').onclick = async () => {
    const id  = document.getElementById('editSlideId').value;
    const img = document.getElementById('slideImageUrl').value.trim();
    if (!img) { notify('❌ تصویر اسلاید اجباریه', false); return; }

    const body = {
        image_url: img,
        title: document.getElementById('slideTitle').value.trim(),
        description: document.getElementById('slideDesc').value.trim(),
        link_url: document.getElementById('slideLink').value.trim(),
        order_index: parseInt(document.getElementById('slideOrder').value) || 0
    };
    const url = id ? `/admin/slides/${id}` : '/admin/slides';
    const res = await authFetch(url, { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) });
    if (!res) return;
    if (res.ok) { notify(id ? '✅ ویرایش شد' : '✅ اضافه شد'); closeSlideModal(); loadSlides(); }
    else { const d = await res.json(); notify(d.error || '❌ خطا', false); }
};

async function delSlide(id) {
    if (!confirm('این اسلاید حذف بشه؟')) return;
    const res = await authFetch(`/admin/slides/${id}`, { method: 'DELETE' });
    if (res?.ok) { notify('✅ حذف شد'); loadSlides(); }
}

// ─── آپلود تصویر اسلاید ──
const slideUploadArea = document.getElementById('slideUploadArea');
const slideFileInput  = document.getElementById('slideFileInput');
slideUploadArea.addEventListener('click', () => slideFileInput.click());
slideUploadArea.addEventListener('dragover', e => { e.preventDefault(); slideUploadArea.classList.add('active'); });
slideUploadArea.addEventListener('dragleave', () => slideUploadArea.classList.remove('active'));
slideUploadArea.addEventListener('drop', e => {
    e.preventDefault(); slideUploadArea.classList.remove('active');
    if (e.dataTransfer.files[0]) uploadSlideFile(e.dataTransfer.files[0]);
});
slideFileInput.addEventListener('change', () => {
    if (slideFileInput.files[0]) uploadSlideFile(slideFileInput.files[0]);
});

async function uploadSlideFile(file) {
    if (file.size > 5 * 1024 * 1024) { notify('❌ حجم بیشتر از ۵ مگابایته', false); return; }
    const form = new FormData();
    form.append('file', file);
    try {
        const res  = await fetch('/admin/upload', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form });
        const data = await res.json();
        if (res.ok) { document.getElementById('slideImageUrl').value = data.url; showSlidePreview(data.url); notify('✅ آپلود شد'); }
        else notify(data.error || '❌ خطا در آپلود', false);
    } catch { notify('❌ خطا در ارتباط با سرور', false); }
}

function showSlidePreview(url) {
    const img = document.getElementById('slideImgPreview');
    img.src = url; img.classList.add('show');
    document.getElementById('slideUploadHint').style.display = 'none';
}
function clearSlidePreview() {
    const img = document.getElementById('slideImgPreview');
    img.src = ''; img.classList.remove('show');
    document.getElementById('slideUploadHint').style.display = '';
}
document.getElementById('slideImageUrl').addEventListener('input', function () {
    if (this.value) showSlidePreview(this.value); else clearSlidePreview();
});

// ─── Social Links ─────────────────────────────
async function loadSocialLinks() {
    const res = await authFetch('/admin/social-links');
    if (!res) return;
    const items = await res.json();
    const el = document.getElementById('socList');
    if (!items.length) { el.innerHTML = '<span style="color:var(--muted);font-size:13px">شبکه اجتماعی‌ای ثبت نشده</span>'; return; }
    el.innerHTML = items.map(s => `
        <div class="cat-tag">
            <i class="${s.icon_class}" style="color:#00d4ff;font-size:14px"></i> ${s.platform}
            <button onclick="delSocialLink(${s.id})">×</button>
        </div>`).join('');
}

document.getElementById('addSocBtn').onclick = async () => {
    const platform = document.getElementById('socPlatform').value.trim();
    const icon     = document.getElementById('socIcon').value.trim() || 'ti ti-link';
    const url      = document.getElementById('socUrl').value.trim();
    if (!platform || !url) { notify('❌ نام پلتفرم و آدرس اجباریه', false); return; }

    const res = await authFetch('/admin/social-links', { method: 'POST', body: JSON.stringify({ platform, icon_class: icon, url }) });
    if (!res) return;
    if (res.ok) {
        notify('✅ اضافه شد');
        document.getElementById('socPlatform').value = '';
        document.getElementById('socIcon').value = '';
        document.getElementById('socUrl').value = '';
        loadSocialLinks();
    } else { const d = await res.json(); notify(d.error || '❌ خطا', false); }
};

async function delSocialLink(id) {
    if (!confirm('حذف بشه؟')) return;
    const res = await authFetch(`/admin/social-links/${id}`, { method: 'DELETE' });
    if (res?.ok) { notify('✅ حذف شد'); loadSocialLinks(); }
}

// ─── Settings ─────────────────────────────────
async function loadSettings() {
    const res = await authFetch('/admin/settings');
    if (!res) return;
    const s = await res.json();
    // چک کردن وجود المان‌ها قبل از مقداردهی (برای جلوگیری از خطا)
    if(document.getElementById('setAbout')) document.getElementById('setAbout').value = s.footer_about || '';
    if(document.getElementById('setPhone')) document.getElementById('setPhone').value = s.footer_phone || '';
    if(document.getElementById('setEmail')) document.getElementById('setEmail').value = s.footer_email || '';
}

document.getElementById('saveSettingsBtn').onclick = async () => {
    const body = {
        footer_about:     document.getElementById('setAbout').value.trim(),
        footer_phone:     document.getElementById('setPhone').value.trim(),
        footer_email:     document.getElementById('setEmail').value.trim()
    };
    const res = await authFetch('/admin/settings', { method: 'PUT', body: JSON.stringify(body) });
    if (res?.ok) notify('✅ تنظیمات ذخیره شد');
    else notify('❌ خطا', false);
};

// ══════════════════════════════════════════════
// FAQ (سوالات متداول)
// ══════════════════════════════════════════════
let faqsCache = [];

async function loadFaqs() {
    const res = await authFetch('/admin/faqs');
    if (!res) return;
    faqsCache = await res.json();
    const box = document.getElementById('faqListBox');
    if (!box) return;
    if (!faqsCache.length) { box.innerHTML = '<span style="color:var(--muted);font-size:13px">سوالی ثبت نشده</span>'; return; }
    
    box.innerHTML = faqsCache.map(f => `
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);
                     border-radius:10px;padding:12px 16px;display:flex;
                     justify-content:space-between;align-items:flex-start;gap:15px">
            <div style="display:flex; flex-direction:column; gap:6px; flex:1">
                <span style="font-size:14px; font-weight:600; color:#00d4ff">${f.question}</span>
                <span style="font-size:12.5px; color:#aaa; line-height:1.5">${f.answer}</span>
            </div>
            <div style="display:flex; gap:6px; margin-top:2px">
                <button onclick="editFaq(${f.id})" style="background:rgba(0,212,255,.15);border:none;
                        color:#00d4ff;cursor:pointer;font-size:15px;padding:6px;border-radius:6px" title="ویرایش"><i class="ti ti-pencil"></i></button>
                <button onclick="delFaq(${f.id})" style="background:rgba(255,107,107,.15);border:none;
                        color:#ff6b6b;cursor:pointer;font-size:15px;padding:6px;border-radius:6px" title="حذف"><i class="ti ti-trash"></i></button>
            </div>
        </div>`).join('');
}

// آماده‌سازی فرم برای ویرایش
function editFaq(id) {
    const f = faqsCache.find(x => x.id === id);
    if (!f) return;
    
    document.getElementById('editFaqId').value = f.id;
    document.getElementById('newFaqQ').value = f.question;
    document.getElementById('newFaqA').value = f.answer;
    
    document.getElementById('faqFormTitle').textContent = 'ویرایش سوال متداول';
    document.getElementById('cancelEditFaqBtn').style.display = 'inline-block';
    
    // اسکرول به بالا برای راحتی ادمین
    document.getElementById('newFaqQ').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// لغو ویرایش و برگشت به حالت افزودن
document.getElementById('cancelEditFaqBtn')?.addEventListener('click', () => {
    document.getElementById('editFaqId').value = '';
    document.getElementById('newFaqQ').value = '';
    document.getElementById('newFaqA').value = '';
    
    document.getElementById('faqFormTitle').textContent = 'سوال جدید';
    document.getElementById('cancelEditFaqBtn').style.display = 'none';
});

// ذخیره (افزودن یا ویرایش)
document.getElementById('addFaqBtn')?.addEventListener('click', async () => {
    const id = document.getElementById('editFaqId').value;
    const q = document.getElementById('newFaqQ').value.trim();
    const a = document.getElementById('newFaqA').value.trim();
    
    if (!q || !a) { notify('❌ سوال و جواب اجباریه', false); return; }

    const url = id ? `/admin/faqs/${id}` : '/admin/faqs';
    const method = id ? 'PUT' : 'POST';
    
    const res = await authFetch(url, { 
        method: method, 
        body: JSON.stringify({ question: q, answer: a }) 
    });
    
    if (!res) return;
    if (res.ok) {
        notify(id ? '✅ سوال ویرایش شد' : '✅ سوال اضافه شد');
        document.getElementById('cancelEditFaqBtn').click(); // ریست فرم
        loadFaqs();
    } else {
        const d = await res.json();
        notify(d.error || '❌ خطا در ذخیره‌سازی', false);
    }
});

async function delFaq(id) {
    if (!confirm('این سوال حذف بشه؟')) return;
    const res = await authFetch(`/admin/faqs/${id}`, { method: 'DELETE' });
    if (res?.ok) { notify('✅ سوال حذف شد'); loadFaqs(); }
}

// ─── INIT ─────────────────
loadDashboard();