import os
from datetime import timedelta


class Config:
    # ─── دیتابیس ─────────────────────────────────────────────
    # روی رندر: DATABASE_URL به صورت خودکار تنظیم میشه
    # روی لوکال: از SQLite استفاده میشه
    _db_url = os.environ.get('DATABASE_URL', '')

    # رندر (و هروکو) آدرس رو با postgres:// میفرستن
    # ولی SQLAlchemy 1.4+ فقط postgresql:// قبول میکنه
    if _db_url.startswith('postgres://'):
        _db_url = _db_url.replace('postgres://', 'postgresql://', 1)

    SQLALCHEMY_DATABASE_URI = _db_url or 'sqlite:///site.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ─── JWT (امنیت و احراز هویت) ──────────────────────────────
    # روی رندر: این متغیر رو تو Environment Variables بذار
    # روی لوکال: مقدار پیش‌فرض استفاده میشه
    JWT_SECRET_KEY = os.environ.get(
        'JWT_SECRET_KEY',
        'local-dev-secret-do-not-use-in-production'
    )
    
     # فقط fallback؛ مقدار واقعی از auth.py میاد
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7) 

    # ─── درگاه پرداخت زرین‌پال ─────────────────────────────────
    # روی رندر: این متغیر رو تو Environment Variables بذار
    # روی لوکال: به صورت پیش‌فرض از مرچنت تستی استفاده میشه
    ZARINPAL_MERCHANT_ID = os.environ.get(
        'ZARINPAL_MERCHANT_ID',
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    )
    
    # حالت تست (Sandbox): در محیط توسعه true و در سرور نهایی false تنظیم میشه
    ZARINPAL_SANDBOX = os.environ.get('ZARINPAL_SANDBOX', 'true').lower() == 'true'

    # ─── آدرس پایه سایت ──────────────────────────────────────
    # برای هدایت کاربر پس از پرداخت در درگاه بانکی به سایت
    # روی رندر: آدرس سرور (مثلاً https://robokala.onrender.com)
    # روی لوکال: آدرس لوکال‌هاست پورت ۵۰۰۰
    BASE_URL = os.environ.get('BASE_URL', 'http://127.0.0.1:5000')
