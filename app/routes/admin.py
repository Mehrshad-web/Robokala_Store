import os
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models.models import Product, Category, User, Order, Slide, SocialLink, SiteSetting, FAQItem

admin = Blueprint('admin', __name__)

# ─────────────────────────────────────────────────────
# Helper: Admin Check
# ─────────────────────────────────────────────────────
def check_admin():
    """بررسی می‌کنه آیا کاربر ادمین هست یا نه"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    return user and user.is_admin

# ─────────────────────────────────────────────────────
# Image Upload
# ─────────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@admin.route('/upload', methods=['POST'])
@jwt_required()
def upload_image():
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    if 'file' not in request.files: return jsonify({'error': 'فایلی انتخاب نشده'}), 400
    file = request.files['file']
    if not file or file.filename == '': return jsonify({'error': 'فایلی انتخاب نشده'}), 400
    if not allowed_file(file.filename): return jsonify({'error': 'فقط عکس قبوله'}), 400
    
    filename = secure_filename(file.filename)
    base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    folder = os.path.join(base, 'frontend', 'img', 'product')
    os.makedirs(folder, exist_ok=True)
    file.save(os.path.join(folder, filename))
    return jsonify({'url': f'img/product/{filename}', 'message': 'آپلود شد'})

# ─────────────────────────────────────────────────────
# Stats
# ─────────────────────────────────────────────────────
@admin.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    return jsonify({
        'products': Product.query.count(),
        'categories': Category.query.count(),
        'orders': Order.query.count(),
    })

# ─────────────────────────────────────────────────────
# Products
# ─────────────────────────────────────────────────────
@admin.route('/products', methods=['GET'])
@jwt_required()
def get_all_products():
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    return jsonify([p.to_dict() for p in Product.query.order_by(Product.id.desc()).all()])

@admin.route('/products', methods=['POST'])
@jwt_required()
def add_product():
    if not check_admin(): 
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    
    data = request.get_json()
    if not data or not data.get('name') or data.get('price') is None: 
        return jsonify({'error': 'اسم و قیمت اجباریه'}), 400
    
    product = Product(
        name=data['name'], 
        price=data['price'], 
        discount=data.get('discount', 0), 
        stock=data.get('stock', 0), 
        image_url=data.get('image_url', ''), 
        description=data.get('description', ''), 
        category_id=data.get('category_id'),
        brand=data.get('brand', ''), 
        sku=data.get('sku', ''),
        weight_grams=data.get('weight_grams'),
        warranty_months=data.get('warranty_months', 0)
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201

@admin.route('/products/<int:pid>', methods=['PUT'])
@jwt_required()
def update_product(pid):
    if not check_admin(): 
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    
    p = Product.query.get(pid)
    if not p: 
        return jsonify({'error': 'محصول پیدا نشد'}), 404
    
    data = request.get_json()
    for field in ['name', 'price', 'discount', 'stock', 'image_url', 'description', 'category_id', 'brand', 'sku', 'weight_grams', 'warranty_months']:
        if field in data: 
            setattr(p, field, data[field])
            
    db.session.commit()
    return jsonify(p.to_dict())

@admin.route('/products/<int:pid>', methods=['DELETE'])
@jwt_required()
def delete_product(pid):
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    p = Product.query.get(pid)
    if not p: return jsonify({'error': 'محصول پیدا نشد'}), 404
    db.session.delete(p)
    db.session.commit()
    return jsonify({'message': 'حذف شد'})

# ─────────────────────────────────────────────────────
# Categories
# ─────────────────────────────────────────────────────
@admin.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    return jsonify([c.to_dict() for c in Category.query.all()])

@admin.route('/categories', methods=['POST'])
@jwt_required()
def add_category():
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    data = request.get_json()
    if not data or not data.get('name'): return jsonify({'error': 'اسم دسته‌بندی اجباریه'}), 400
    c = Category(name=data['name'])
    db.session.add(c)
    db.session.commit()
    return jsonify(c.to_dict()), 201

@admin.route('/categories/<int:cid>', methods=['DELETE'])
@jwt_required()
def delete_category(cid):
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    c = Category.query.get(cid)
    if not c: return jsonify({'error': 'دسته‌بندی پیدا نشد'}), 404
    db.session.delete(c)
    db.session.commit()
    return jsonify({'message': 'حذف شد'})

# ─────────────────────────────────────────────────────
# Orders
# ─────────────────────────────────────────────────────
@admin.route('/orders', methods=['GET'])
@jwt_required()
def get_all_orders():
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    orders = Order.query.order_by(Order.created_at.desc()).all()
    result = [{'username': o.user.username if o.user else 'ناشناس', **o.to_dict()} for o in orders]
    return jsonify(result)

@admin.route('/orders/<int:oid>/status', methods=['PUT'])
@jwt_required()
def update_order_status(oid):
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    o = Order.query.get(oid)
    if not o: return jsonify({'error': 'سفارش پیدا نشد'}), 404
    status = request.get_json().get('status')
    if status not in ['pending', 'processing', 'shipping', 'delivered', 'cancelled']: return jsonify({'error': 'وضعیت نامعتبر'}), 400
    o.status = status
    db.session.commit()
    return jsonify(o.to_dict())

# ─────────────────────────────────────────────────────
# Slides
# ─────────────────────────────────────────────────────
@admin.route('/slides', methods=['GET'])
@jwt_required()
def get_slides():
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    return jsonify([s.to_dict() for s in Slide.query.order_by(Slide.order_index).all()])

@admin.route('/slides', methods=['POST'])
@jwt_required()
def add_slide():
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    data = request.get_json()
    if not data or not data.get('image_url'): return jsonify({'error': 'تصویر اجباریه'}), 400
    s = Slide(image_url=data['image_url'], title=data.get('title', ''), description=data.get('description', ''), link_url=data.get('link_url', ''), order_index=data.get('order_index', 0))
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201

@admin.route('/slides/<int:sid>', methods=['PUT'])
@jwt_required()
def update_slide(sid):
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    s = Slide.query.get(sid)
    if not s: return jsonify({'error': 'اسلاید پیدا نشد'}), 404
    data = request.get_json()
    for f in ['image_url', 'title', 'description', 'link_url', 'order_index']:
        if f in data: setattr(s, f, data[f])
    db.session.commit()
    return jsonify(s.to_dict())

@admin.route('/slides/<int:sid>', methods=['DELETE'])
@jwt_required()
def delete_slide(sid):
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    s = Slide.query.get(sid)
    if not s: return jsonify({'error': 'اسلاید پیدا نشد'}), 404
    db.session.delete(s)
    db.session.commit()
    return jsonify({'message': 'حذف شد'})

# ─────────────────────────────────────────────────────
# Social Links
# ─────────────────────────────────────────────────────
@admin.route('/social-links', methods=['GET'])
@jwt_required()
def get_social_links():
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    return jsonify([s.to_dict() for s in SocialLink.query.order_by(SocialLink.order_index).all()])

@admin.route('/social-links', methods=['POST'])
@jwt_required()
def add_social_link():
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    data = request.get_json()
    if not data or not data.get('platform') or not data.get('url'): return jsonify({'error': 'نام پلتفرم و آدرس اجباریه'}), 400
    s = SocialLink(platform=data['platform'], url=data['url'], icon_class=data.get('icon_class', 'ti ti-link'), order_index=data.get('order_index', 0))
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201

@admin.route('/social-links/<int:sid>', methods=['DELETE'])
@jwt_required()
def delete_social_link(sid):
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    s = SocialLink.query.get(sid)
    if not s: return jsonify({'error': 'پیدا نشد'}), 404
    db.session.delete(s)
    db.session.commit()
    return jsonify({'message': 'حذف شد'})

# ─────────────────────────────────────────────────────
# Site Settings
# ─────────────────────────────────────────────────────
@admin.route('/settings', methods=['GET'])
@jwt_required()
def get_settings():
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    return jsonify({r.key: r.value for r in SiteSetting.query.all()})

@admin.route('/settings', methods=['PUT'])
@jwt_required()
def update_settings():
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    for key, value in (request.get_json() or {}).items():
        row = SiteSetting.query.get(key)
        if row: row.value = value
        else: db.session.add(SiteSetting(key=key, value=value))
    db.session.commit()
    return jsonify({'message': 'تنظیمات ذخیره شد'})

# ═══════════════════ FAQ ═══════════════════
@admin.route('/faqs', methods=['GET'])
@jwt_required()
def get_faqs():
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    items = FAQItem.query.order_by(FAQItem.order_index).all()
    return jsonify([f.to_dict() for f in items])

@admin.route('/faqs', methods=['POST'])
@jwt_required()
def add_faq():
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    data = request.get_json()
    if not data or not data.get('question') or not data.get('answer'):
        return jsonify({'error': 'سوال و جواب اجباریه'}), 400
    f = FAQItem(
        question=data['question'], answer=data['answer'],
        order_index=data.get('order_index', 0)
    )
    db.session.add(f)
    db.session.commit()
    return jsonify(f.to_dict()), 201

@admin.route('/faqs/<int:fid>', methods=['PUT'])
@jwt_required()
def update_faq(fid):
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    f = FAQItem.query.get(fid)
    if not f: return jsonify({'error': 'پیدا نشد'}), 404
    data = request.get_json()
    if 'question' in data: f.question = data['question']
    if 'answer' in data: f.answer = data['answer']
    if 'order_index' in data: f.order_index = data['order_index']
    db.session.commit()
    return jsonify(f.to_dict())

@admin.route('/faqs/<int:fid>', methods=['DELETE'])
@jwt_required()
def delete_faq(fid):
    if not check_admin(): return jsonify({'error': 'دسترسی غیرمجاز'}), 403
    f = FAQItem.query.get(fid)
    if not f: return jsonify({'error': 'پیدا نشد'}), 404
    db.session.delete(f)
    db.session.commit()
    return jsonify({'message': 'حذف شد'})