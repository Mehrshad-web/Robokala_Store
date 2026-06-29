from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.models import Order, OrderItem, CartItem, Product

orders_bp = Blueprint('orders', __name__)


# POST /api/orders — ثبت سفارش از سبد خرید
@orders_bp.route('', methods=['POST'])
@jwt_required()
def create_order():
    user_id = int(get_jwt_identity())
    cart_items = CartItem.query.filter_by(user_id=user_id).all()

    if not cart_items:
        return jsonify({'error': 'سبد خرید خالی است'}), 400

    total = 0
    order_data = []
    for item in cart_items:
        product = Product.query.get(item.product_id)
        if not product:
            continue
        final_price = product.price * (1 - product.discount / 100)
        total += final_price * item.quantity
        order_data.append({'product': product, 'quantity': item.quantity, 'price': final_price})

    order = Order(user_id=user_id, total=round(total), status='pending')
    db.session.add(order)
    db.session.flush()

    for od in order_data:
        db.session.add(OrderItem(
            order_id=order.id,
            product_id=od['product'].id,
            quantity=od['quantity'],
            price=od['price']
        ))
        od['product'].stock = max(0, od['product'].stock - od['quantity'])

    CartItem.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify(order.to_dict()), 201


# GET /api/orders
@orders_bp.route('', methods=['GET'])
@jwt_required()
def get_orders():
    user_id = int(get_jwt_identity())
    orders = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])