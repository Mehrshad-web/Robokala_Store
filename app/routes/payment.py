from flask import Blueprint, request, redirect, current_app
import requests as http_req
from app.extensions import db
from app.models.models import Order

payment = Blueprint('payment', __name__)

_ZP_VRF_SANDBOX = 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json'
_ZP_VRF_PROD    = 'https://api.zarinpal.com/pg/v4/payment/verify.json'


# ─────────────────────────────────────────────────────
# GET /payment/verify — زرین‌پال بعد از پرداخت کاربر
# رو اینجا ریدایرکت می‌کنه
# ─────────────────────────────────────────────────────
@payment.route('/verify', methods=['GET'])
def verify():
    authority = request.args.get('Authority', '')
    status    = request.args.get('Status', '')

    order = Order.query.filter_by(payment_authority=authority).first()

    if not order:
        return redirect('/payment-failed.html?reason=not_found')

    # کاربر پرداخت رو لغو کرد
    if status != 'OK':
        order.status         = 'cancelled'
        order.payment_status = 'cancelled'
        db.session.commit()
        return redirect(f'/payment-failed.html?order_id={order.id}&reason=cancelled')

    # تایید پرداخت از زرین‌پال
    merchant_id = current_app.config.get('ZARINPAL_MERCHANT_ID', '')
    is_sandbox  = current_app.config.get('ZARINPAL_SANDBOX', True)
    verify_url  = _ZP_VRF_SANDBOX if is_sandbox else _ZP_VRF_PROD

    try:
        resp = http_req.post(verify_url, json={
            'merchant_id': merchant_id,
            'amount':      int(order.total),
            'authority':   authority
        }, timeout=10)

        data = resp.json()
        code = data.get('data', {}).get('code')

        if code in [100, 101]:   # 100: موفق، 101: قبلاً تایید شده
            ref_id = data['data'].get('ref_id', '')
            order.status            = 'paid'
            order.payment_status    = 'paid'
            order.payment_ref_id    = str(ref_id)
            db.session.commit()
            return redirect(
                f'/payment-success.html?order_id={order.id}&ref_id={ref_id}'
            )
        else:
            order.status         = 'payment_failed'
            order.payment_status = 'failed'
            db.session.commit()
            return redirect(f'/payment-failed.html?order_id={order.id}')

    except Exception:
        return redirect(
            f'/payment-failed.html?order_id={order.id}&reason=server_error'
        )