from flask import Blueprint, jsonify
from app.models.models import Slide, SocialLink, SiteSetting, FAQItem

content = Blueprint('content', __name__)

DEFAULT_SETTINGS = {
    'footer_about': 'مرجع فروش قطعات رباتیک و آموزش‌های تخصصی میکروکنترلر و الکترونیک',
    'footer_phone': '📞 0912xxxxxxx',
    'footer_email': '✉ info@robokala.ir',
    'footer_copyright': '© 2026 RoboKala - تمام حقوق محفوظ است',
}

@content.route('/site-content', methods=['GET'])
def get_site_content():
    # دریافت اطلاعات از دیتابیس به ترتیب مشخص شده (order_index)
    slides = Slide.query.order_by(Slide.order_index).all()
    socials = SocialLink.query.order_by(SocialLink.order_index).all()
    faqs = FAQItem.query.order_by(FAQItem.order_index).all()
    rows = SiteSetting.query.all()

    # جایگذاری تنظیمات دیتابیس روی تنظیمات پیش‌فرض
    settings = dict(DEFAULT_SETTINGS)
    for r in rows:
        settings[r.key] = r.value

    return jsonify({
        'slides': [s.to_dict() for s in slides],
        'social_links': [s.to_dict() for s in socials],
        'faqs': [f.to_dict() for f in faqs],
        'settings': settings
    })