import os


class Config:
    # ─── دیتابیس ────────────────────────────────────────────
    # روی رندر: DATABASE_URL به صورت خودکار تنظیم میشه
    # روی لوکال: از SQLite استفاده میشه
    _db_url = os.environ.get('DATABASE_URL', '')

    # رندر (و هرویی) آدرس رو با postgres:// میفرسته
    # ولی SQLAlchemy 1.4+ فقط postgresql:// قبول میکنه
    if _db_url.startswith('postgres://'):
        _db_url = _db_url.replace('postgres://', 'postgresql://', 1)

    SQLALCHEMY_DATABASE_URI = _db_url or 'sqlite:///site.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ─── JWT ─────────────────────────────────────────────────
    # روی رندر: این متغیر رو تو Environment Variables بذار
    # روی لوکال: مقدار پیش‌فرض استفاده میشه
    JWT_SECRET_KEY = os.environ.get(
        'JWT_SECRET_KEY',
        'local-dev-secret-do-not-use-in-production'
    )