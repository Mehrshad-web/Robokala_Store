import os
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models.models import Product, Category, User, Order

admin = Blueprint('admin', __name__)

# ─────────────────────────────────────────────────────
# Image Upload Config
# ─────────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ─────────────────────────────────────────────────────
# Admin Check
# ─────────────────────────────────────────────────────
def check_admin():
    """بررسی می‌کنه آیا کاربر ادمین هست یا نه"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    return user and user.is_admin


# ─────────────────────────────────────────────────────
# POST /admin/upload
# ─────────────────────────────────────────────────────
@admin.route('/upload', methods=['POST'])
@jwt_required()
def upload_image():

    if not check_admin():
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403

    if 'file' not in request.files:
        return jsonify({'error': 'فایلی انتخاب نشده'}), 400

    file = request.files['file']

    if not file or file.filename == '':
        return jsonify({'error': 'فایلی انتخاب نشده'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'فقط عکس (jpg, png, gif, webp) قبوله'}), 400

    filename = secure_filename(file.filename)

    # مسیر پروژه
    base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    folder = os.path.join(base, 'frontend', 'img', 'product')

    os.makedirs(folder, exist_ok=True)

    filepath = os.path.join(folder, filename)
    file.save(filepath)

    return jsonify({
        'url': f'img/product/{filename}',
        'message': 'آپلود شد'
    })


# ─────────────────────────────────────────────────────
# GET /admin/stats
# ─────────────────────────────────────────────────────
@admin.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():

    if not check_admin():
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403

    return jsonify({
        'products': Product.query.count(),
        'categories': Category.query.count(),
        'orders': Order.query.count(),
    })


# ─────────────────────────────────────────────────────
# GET /admin/products
# ─────────────────────────────────────────────────────
@admin.route('/products', methods=['GET'])
@jwt_required()
def get_all_products():

    if not check_admin():
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403

    products = Product.query.order_by(Product.id.desc()).all()

    return jsonify([p.to_dict() for p in products])


# ─────────────────────────────────────────────────────
# POST /admin/products
# ─────────────────────────────────────────────────────
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
        category_id=data.get('category_id')
    )

    db.session.add(product)
    db.session.commit()

    return jsonify(product.to_dict()), 201


# ─────────────────────────────────────────────────────
# PUT /admin/products/<id>
# ─────────────────────────────────────────────────────
@admin.route('/products/<int:pid>', methods=['PUT'])
@jwt_required()
def update_product(pid):

    if not check_admin():
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403

    p = Product.query.get(pid)

    if not p:
        return jsonify({'error': 'محصول پیدا نشد'}), 404

    data = request.get_json()

    for field in ['name', 'price', 'discount', 'stock', 'image_url', 'description', 'category_id']:
        if field in data:
            setattr(p, field, data[field])

    db.session.commit()

    return jsonify(p.to_dict())


# ─────────────────────────────────────────────────────
# DELETE /admin/products/<id>
# ─────────────────────────────────────────────────────
@admin.route('/products/<int:pid>', methods=['DELETE'])
@jwt_required()
def delete_product(pid):

    if not check_admin():
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403

    p = Product.query.get(pid)

    if not p:
        return jsonify({'error': 'محصول پیدا نشد'}), 404

    db.session.delete(p)
    db.session.commit()

    return jsonify({'message': 'حذف شد'})


# ─────────────────────────────────────────────────────
# GET /admin/categories
# ─────────────────────────────────────────────────────
@admin.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():

    if not check_admin():
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403

    return jsonify([c.to_dict() for c in Category.query.all()])


# ─────────────────────────────────────────────────────
# POST /admin/categories
# ─────────────────────────────────────────────────────
@admin.route('/categories', methods=['POST'])
@jwt_required()
def add_category():

    if not check_admin():
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403

    data = request.get_json()

    if not data or not data.get('name'):
        return jsonify({'error': 'اسم دسته‌بندی اجباریه'}), 400

    c = Category(name=data['name'])

    db.session.add(c)
    db.session.commit()

    return jsonify(c.to_dict()), 201


# ─────────────────────────────────────────────────────
# DELETE /admin/categories/<id>
# ─────────────────────────────────────────────────────
@admin.route('/categories/<int:cid>', methods=['DELETE'])
@jwt_required()
def delete_category(cid):

    if not check_admin():
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403

    c = Category.query.get(cid)

    if not c:
        return jsonify({'error': 'دسته‌بندی پیدا نشد'}), 404

    db.session.delete(c)
    db.session.commit()

    return jsonify({'message': 'حذف شد'})


# ─────────────────────────────────────────────────────
# GET /admin/orders
# ─────────────────────────────────────────────────────
@admin.route('/orders', methods=['GET'])
@jwt_required()
def get_all_orders():

    if not check_admin():
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403

    orders = Order.query.order_by(Order.created_at.desc()).all()

    result = []

    for o in orders:
        d = o.to_dict()
        d['username'] = o.user.username if o.user else 'ناشناس'
        result.append(d)

    return jsonify(result)


# ─────────────────────────────────────────────────────
# PUT /admin/orders/<id>/status
# ─────────────────────────────────────────────────────
@admin.route('/orders/<int:oid>/status', methods=['PUT'])
@jwt_required()
def update_order_status(oid):

    if not check_admin():
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403

    o = Order.query.get(oid)

    if not o:
        return jsonify({'error': 'سفارش پیدا نشد'}), 404

    data = request.get_json()
    status = data.get('status')

    valid = ['pending', 'processing', 'shipping', 'delivered', 'cancelled']

    if status not in valid:
        return jsonify({'error': f'وضعیت باید یکی از {valid} باشه'}), 400

    o.status = status
    db.session.commit()

    return jsonify(o.to_dict())
