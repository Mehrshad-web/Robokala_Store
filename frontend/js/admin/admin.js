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


// ─── NAVIGATION ─────────────────

document.querySelectorAll('.side-btn[data-section]').forEach(btn=>{

btn.onclick=()=>{

document.querySelectorAll('.side-btn').forEach(b=>b.classList.remove('active'));

document.querySelectorAll('.admin-section').forEach(s=>s.classList.remove('active'));

btn.classList.add('active');

document.getElementById('section-'+btn.dataset.section).classList.add('active');

if(btn.dataset.section==='dashboard')loadDashboard();

if(btn.dataset.section==='products')loadProducts();

if(btn.dataset.section==='categories')loadCategories();

if(btn.dataset.section==='orders')loadOrders();

};

});


// ─── NOTIFY ─────────────────

function notify(msg,ok=true){

const el=document.createElement('div');

el.className='admin-notif';

el.textContent=msg;

el.style.background=ok?'#51cf66':'#ff6b6b';

el.style.color='white';

document.body.appendChild(el);

setTimeout(()=>{

el.style.opacity='0';

setTimeout(()=>el.remove(),300);

},2500);

}


// ─── DASHBOARD ─────────────────

async function loadDashboard(){

const res=await authFetch('/admin/stats');

if(!res)return;

const data=await res.json();

document.getElementById('statProducts').textContent=data.products??'—';

document.getElementById('statCategories').textContent=data.categories??'—';

document.getElementById('statOrders').textContent=data.orders??'—';

}


// ─── PRODUCTS ─────────────────

async function loadProducts(){

const res=await authFetch('/admin/products');

if(!res)return;

allProducts=await res.json();

renderProducts(allProducts);

}


function renderProducts(list){

const tbody=document.getElementById('productsTbl');

if(!list.length){

tbody.innerHTML='<tr><td colspan="7">محصولی وجود ندارد</td></tr>';

return;

}

tbody.innerHTML=list.map(p=>`

<tr>

<td>

<img class="product-thumb"

src="${p.image_url||'img/product/prod1.jpeg'}"

onerror="this.src='img/product/prod1.jpeg'">

</td>

<td>${p.name}</td>

<td>${(p.price||0).toLocaleString('fa-IR')}</td>

<td>${p.discount||0}%</td>

<td>${p.stock}</td>

<td>${p.category_name||'—'}</td>

<td>

<button class="btn-sm btn-edit" onclick="openEditProduct(${p.id})">ویرایش</button>

<button class="btn-sm btn-delete" onclick="deleteProduct(${p.id})">حذف</button>

</td>

</tr>

`).join('');

}


// ─── OPEN MODAL ─────────────────

async function openAddProduct(){

document.getElementById('editProductId').value='';

document.getElementById('pName').value='';

document.getElementById('pPrice').value='';

document.getElementById('pDiscount').value='0';

document.getElementById('pStock').value='0';

document.getElementById('pDesc').value='';

document.getElementById('pImage').value='';

clearPreview();

await fillCategorySelect();

modal.classList.add('open');

}


async function openEditProduct(id){

const p=allProducts.find(x=>x.id===id);

if(!p)return;

document.getElementById('editProductId').value=p.id;

document.getElementById('pName').value=p.name;

document.getElementById('pPrice').value=p.price;

document.getElementById('pDiscount').value=p.discount||0;

document.getElementById('pStock').value=p.stock;

document.getElementById('pDesc').value=p.description||'';

document.getElementById('pImage').value=p.image_url||'';

showPreview(p.image_url);

await fillCategorySelect(p.category_id);

modal.classList.add('open');

}


function closeModal(){

modal.classList.remove('open');

}


document.getElementById('openAddProduct').onclick=openAddProduct;

document.getElementById('closeModal').onclick=closeModal;

document.getElementById('cancelModal').onclick=closeModal;


// ─── SAVE PRODUCT ─────────────────

document.getElementById('saveProductBtn').onclick=async()=>{

const id=document.getElementById('editProductId').value;

const name=document.getElementById('pName').value.trim();

const price=parseFloat(document.getElementById('pPrice').value);

if(!name||isNaN(price)){

notify('نام و قیمت اجباریه',false);

return;

}

const body={

name,

price,

discount:parseFloat(document.getElementById('pDiscount').value)||0,

stock:parseInt(document.getElementById('pStock').value)||0,

image_url:document.getElementById('pImage').value,

description:document.getElementById('pDesc').value,

category_id:document.getElementById('pCategory').value||null

};

const url=id?`/admin/products/${id}`:'/admin/products';

const method=id?'PUT':'POST';

const res=await authFetch(url,{method,body:JSON.stringify(body)});

if(!res)return;

if(res.ok){

notify('✅ ذخیره شد');

closeModal();

loadProducts();

}else{

notify('خطا',false);

}

};


// ─── DELETE ─────────────────

async function deleteProduct(id){

if(!confirm('حذف شود؟'))return;

const res=await authFetch(`/admin/products/${id}`,{method:'DELETE'});

if(res?.ok){

notify('✅ حذف شد');

loadProducts();

}

}


// ─── IMAGE UPLOAD ─────────────────

uploadArea.onclick=()=>fileInput.click();

fileInput.onchange=()=>{

if(fileInput.files[0])uploadFile(fileInput.files[0]);

};

async function uploadFile(file){

const form=new FormData();

form.append('file',file);

const res=await fetch('/admin/upload',{

method:'POST',

headers:{Authorization:`Bearer ${getToken()}`},

body:form

});

const data=await res.json();

if(res.ok){

document.getElementById('pImage').value=data.url;

showPreview(data.url);

notify('✅ تصویر آپلود شد');

}else{

notify('خطا در آپلود',false);

}

}


function showPreview(url){

imgPreview.src=url;

imgPreview.style.display='block';

uploadHint.style.display='none';

}


function clearPreview(){

imgPreview.src='';

imgPreview.style.display='none';

uploadHint.style.display='block';

}


// ─── INIT ─────────────────

loadDashboard();
