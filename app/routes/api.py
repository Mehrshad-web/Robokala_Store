from flask import Blueprint, jsonify, request
from app.extensions import db
from app.models.models import Product, Category

api = Blueprint('api', __name__)


@api.route('/products', methods=['GET'])
def get_products():
    query = Product.query

    # فیلتر دسته‌بندی
    category_name = request.args.get('category')
    if category_name:
        query = query.join(Category).filter(
            Category.name.ilike(f'%{category_name}%')
        )

    # جستجو
    search = request.args.get('search')
    if search:
        query = query.filter(Product.name.ilike(f'%{search}%'))

    # فیلتر قیمت
    price_min = request.args.get('price_min', type=float)
    price_max = request.args.get('price_max', type=float)

    if price_min is not None:
        query = query.filter(Product.price >= price_min)

    if price_max is not None:
        query = query.filter(Product.price <= price_max)

    # مرتب سازی
    sort = request.args.get('sort', '')

    if sort == 'price_asc':
        query = query.order_by(Product.price.asc())

    elif sort == 'price_desc':
        query = query.order_by(Product.price.desc())

    # صفحه بندی
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'products': [p.to_dict() for p in paginated.items],
        'total': paginated.total,
        'total_pages': paginated.pages,
        'current_page': page,
        'per_page': per_page
    })


@api.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.filter_by(id=product_id).first()

    if not product:
        return jsonify({'error': 'محصول پیدا نشد'}), 404

    return jsonify(product.to_dict())


@api.route('/categories', methods=['GET'])
def get_categories():
    categories = Category.query.all()

    if not categories:
        return jsonify([])

    return jsonify([c.to_dict() for c in categories])


# -------------------------
# Comments API
# -------------------------

# GET /api/products/<id>/comments
@api.route('/products/<int:product_id>/comments', methods=['GET'])
def get_comments(product_id):
    from app.models.models import Comment

    if not Product.query.get(product_id):
        return jsonify({'error': 'محصول پیدا نشد'}), 404

    comments = Comment.query.filter_by(product_id=product_id)\
        .order_by(Comment.created_at.desc()).all()

    return jsonify([c.to_dict() for c in comments])


# POST /api/products/<id>/comments
@api.route('/products/<int:product_id>/comments', methods=['POST'])
def add_comment(product_id):
    from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
    from app.models.models import Comment

    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception:
        return jsonify({'error': 'برای ثبت نظر باید وارد شوید'}), 401

    if not Product.query.get(product_id):
        return jsonify({'error': 'محصول پیدا نشد'}), 404

    data = request.get_json()
    text = data.get('text', '').strip()
    rating = int(data.get('rating', 5))

    if not text:
        return jsonify({'error': 'متن نظر اجباریه'}), 400

    if not (1 <= rating <= 5):
        return jsonify({'error': 'امتیاز باید بین ۱ تا ۵ باشه'}), 400

    comment = Comment(
        product_id=product_id,
        user_id=user_id,
        text=text,
        rating=rating
    )

    db.session.add(comment)
    db.session.commit()

    return jsonify(comment.to_dict()), 201
