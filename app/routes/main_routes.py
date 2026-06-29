from flask import Blueprint, send_from_directory
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


# صفحه اصلی
@main.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')


# بقیه صفحات و فایل‌ها (CSS، JS، تصاویر)
@main.route('/<path:filename>')
def serve_frontend(filename):
    return send_from_directory(FRONTEND_DIR, filename)