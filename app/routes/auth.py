from datetime import timedelta
from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db
from app.models.models import User

auth = Blueprint('auth', __name__)


def make_token(user):
    """تنظیم داینامیک زمان انقضا: ۷ روز برای کاربر عادی، ۱۰ ساعت برای ادمین"""
    expires = timedelta(hours=10) if user.is_admin else timedelta(days=7)
    return create_access_token(identity=str(user.id), expires_delta=expires)


# POST /auth/register
@auth.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'اطلاعات ارسال نشد'}), 400

    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not username or not email or not password:
        return jsonify({'error': 'تمام فیلدها اجباریه'}), 400
    if len(password) < 6:
        return jsonify({'error': 'رمز باید حداقل ۶ کاراکتر باشه'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'این ایمیل قبلاً ثبت شده'}), 409
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'این نام کاربری قبلاً ثبت شده'}), 409

    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password)
    )
    db.session.add(user)
    db.session.commit()

    # استفاده از تابع کمکی برای اعمال زمان انقضای درست
    token = make_token(user)
    return jsonify({'access_token': token, 'user': user.to_dict()}), 201


# POST /auth/login
@auth.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'اطلاعات ارسال نشد'}), 400

    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'ایمیل و رمز اجباریه'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'ایمیل یا رمز اشتباهه'}), 401

    # استفاده از تابع کمکی برای اعمال زمان انقضای درست
    token = make_token(user)
    return jsonify({'access_token': token, 'user': user.to_dict()})


# GET /auth/me
@auth.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'کاربر پیدا نشد'}), 404
    return jsonify(user.to_dict())