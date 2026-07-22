from flask import Blueprint, send_from_directory, request, jsonify
import os

main = Blueprint('main', __name__)

# مسیر پوشه frontend
# main_routes.py: robot_store/app/routes/main_routes.py
# frontend:       robot_store/frontend/
BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(os.path.abspath(__file__))
    )
)
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

# ─────────────────────────────────────────────────────
# صفحه اصلی
# ─────────────────────────────────────────────────────
@main.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

# ─────────────────────────────────────────────────────
# بقیه صفحات و فایل‌ها (CSS، JS، تصاویر)
# ─────────────────────────────────────────────────────
@main.route('/<path:filename>')
def serve_frontend(filename):
    return send_from_directory(FRONTEND_DIR, filename)

# ─────────────────────────────────────────────────────
# مدیریت مسیر ناموجود (۴۰۴)
# اگه آدرس درخواستی مربوط به بک‌اند باشه → جواب JSON
# اگه صفحه‌ی فرانت باشه → صفحه‌ی زیبای 404.html
# ─────────────────────────────────────────────────────
@main.app_errorhandler(404)
def handle_not_found(e):
    # چک کردن اینکه آیا درخواست مربوط به API یا بخش‌های بک‌اند است یا خیر
    if request.path.startswith(('/api/', '/admin/', '/auth/', '/payment/')):
        return jsonify({'error': 'مسیر یا منبع درخواستی پیدا نشد'}), 404
    
    # در غیر این صورت (کاربر عادی)، صفحه خطای طراحی شده را برگردان
    return send_from_directory(FRONTEND_DIR, '404.html'), 404