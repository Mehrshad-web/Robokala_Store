from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests as http_req

from app.extensions import db
from app.models.models import Order, OrderItem, CartItem, Product

orders_bp = Blueprint('orders', __name__)

_ZP_REQ_SANDBOX = 'https://sandbox.zarinpal.com/pg/v4/payment/request.json'
_ZP_REQ_PROD = 'https://api.zarinpal.com/pg/v4/payment/request.json'
_ZP_PAY_SANDBOX = 'https://sandbox.zarinpal.com/pg/StartPay/'
_ZP_PAY_PROD = 'https://www.zarinpal.com/pg/StartPay/'
_TEST_MERCHANT = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'


@orders_bp.route('', methods=['POST'])
@jwt_required()
def create_order():
    user_id = int(get_jwt_identity())
    cart_items = CartItem.query.filter_by(user_id=user_id).all()

    if not cart_items:
        return jsonify({'error': 'سبد خرید خالی است'}), 400

    data = request.get_json() or {}

    # اعتبارسنجی فیلدهای اجباری آدرس
    required_fields = {
        'recipient_name': 'نام گیرنده',
        'recipient_phone': 'شماره موبایل',
        'province': 'استان',
        'city': 'شهر',
        'address': 'آدرس',
    }

    for field, label in required_fields.items():
        if not str(data.get(field, '')).strip():
            return jsonify({'error': f'{label} اجباریه'}), 400

    # محاسبه مبلغ و بررسی موجودی
    total = 0
    order_data = []

    for item in cart_items:
        product = db.session.get(Product, item.product_id)

        if not product:
            continue

        if product.stock < item.quantity:
            return jsonify({
                'error': f'موجودی محصول «{product.name}» کافی نیست'
            }), 400

        final_price = round(product.price * (1 - product.discount / 100))
        total += final_price * item.quantity

        order_data.append({
            'product': product,
            'quantity': item.quantity,
            'price': final_price
        })

    if not order_data:
        return jsonify({'error': 'محصول معتبری در سبد خرید وجود ندارد'}), 400

    total = round(total)

    # ساخت سفارش
    order = Order(
        user_id=user_id,
        total=total,
        status='pending_payment',
        payment_status='pending',
        recipient_name=str(data['recipient_name']).strip(),
        recipient_phone=str(data['recipient_phone']).strip(),
        province=str(data['province']).strip(),
        city=str(data['city']).strip(),
        address=str(data['address']).strip(),
        postal_code=str(data.get('postal_code', '')).strip()
    )
    db.session.add(order)
    db.session.flush()  # برای گرفتن order.id قبل از commit

    for od in order_data:
        db.session.add(OrderItem(
            order_id=order.id,
            product_id=od['product'].id,
            quantity=od['quantity'],
            price=od['price']
        ))
        od['product'].stock = max(0, od['product'].stock - od['quantity'])

    # حالت تست: بدون درگاه واقعی
    merchant_id = current_app.config.get('ZARINPAL_MERCHANT_ID', '')
    if not merchant_id or merchant_id == _TEST_MERCHANT:
        CartItem.query.filter_by(user_id=user_id).delete()

        order.status = 'paid'
        order.payment_status = 'paid'
        order.payment_ref_id = 'TEST-MODE'

        db.session.commit()
        return jsonify({
            'order': order.to_dict(),
            'payment_url': None,
            'test_mode': True
        }), 201

    # زرین‌پال
    is_sandbox = current_app.config.get('ZARINPAL_SANDBOX', True)
    base_url = current_app.config.get('BASE_URL', 'http://127.0.0.1:5000')

    req_url = _ZP_REQ_SANDBOX if is_sandbox else _ZP_REQ_PROD

    try:
        resp = http_req.post(req_url, json={
            'merchant_id': merchant_id,
            'amount': total,
            'callback_url': f'{base_url}/payment/verify',  # اگر مسیر verify فرق دارد، این را تغییر بده
            'description': f'خرید از RoboKala — سفارش #{order.id}',
            'metadata': {
                'mobile': str(data['recipient_phone']).strip()
            }
        }, timeout=10)

        zp = resp.json()
        code = zp.get('data', {}).get('code')

        if code == 100:
            authority = zp['data']['authority']
            order.payment_authority = authority

            CartItem.query.filter_by(user_id=user_id).delete()
            db.session.commit()

            pay_url = (_ZP_PAY_SANDBOX if is_sandbox else _ZP_PAY_PROD) + authority
            return jsonify({
                'order': order.to_dict(),
                'payment_url': pay_url
            }), 201

        order.status = 'payment_error'
        order.payment_status = 'failed'
        db.session.commit()

        return jsonify({
            'error': 'خطا در اتصال به زرین‌پال'
        }), 500

    except Exception as e:
        current_app.logger.exception(e)
        order.status = 'payment_error'
        order.payment_status = 'failed'
        db.session.commit()

        return jsonify({
            'error': 'خطا در ارتباط با درگاه پرداخت'
        }), 500


@orders_bp.route('', methods=['GET'])
@jwt_required()
def get_orders():
    user_id = int(get_jwt_identity())
    orders = (
        Order.query
        .filter_by(user_id=user_id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return jsonify([o.to_dict() for o in orders])
