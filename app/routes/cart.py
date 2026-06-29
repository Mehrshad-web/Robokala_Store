from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.models import CartItem, Product

cart_bp = Blueprint('cart', __name__)


# GET /api/cart
@cart_bp.route('', methods=['GET'])
@jwt_required()
def get_cart():
    user_id = int(get_jwt_identity())
    items = CartItem.query.filter_by(user_id=user_id).all()
    return jsonify([i.to_dict() for i in items])


# POST /api/cart/items
@cart_bp.route('/items', methods=['POST'])
@jwt_required()
def add_to_cart():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    product_id = data.get('product_id')
    quantity = data.get('quantity', 1)

    if not product_id:
        return jsonify({'error': 'product_id اجباریه'}), 400

    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'محصول پیدا نشد'}), 404
    if product.stock < quantity:
        return jsonify({'error': 'موجودی کافی نیست'}), 400

    existing = CartItem.query.filter_by(user_id=user_id, product_id=product_id).first()
    if existing:
        existing.quantity += quantity
    else:
        db.session.add(CartItem(user_id=user_id, product_id=product_id, quantity=quantity))

    db.session.commit()
    return jsonify({'message': 'به سبد اضافه شد'}), 201


# PUT /api/cart/items/<id>
@cart_bp.route('/items/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_item(item_id):
    user_id = int(get_jwt_identity())
    item = CartItem.query.filter_by(id=item_id, user_id=user_id).first()
    if not item:
        return jsonify({'error': 'آیتم پیدا نشد'}), 404

    quantity = request.get_json().get('quantity', 1)
    if quantity <= 0:
        db.session.delete(item)
    else:
        item.quantity = quantity

    db.session.commit()
    return jsonify({'message': 'بروزرسانی شد'})


# DELETE /api/cart/items/<id>
@cart_bp.route('/items/<int:item_id>', methods=['DELETE'])
@jwt_required()
def remove_item(item_id):
    user_id = int(get_jwt_identity())
    item = CartItem.query.filter_by(id=item_id, user_id=user_id).first()
    if not item:
        return jsonify({'error': 'آیتم پیدا نشد'}), 404

    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'حذف شد'})


# DELETE /api/cart
@cart_bp.route('', methods=['DELETE'])
@jwt_required()
def clear_cart():
    user_id = int(get_jwt_identity())
    CartItem.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({'message': 'سبد خالی شد'})