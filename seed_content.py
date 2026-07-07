from app import create_app
from app.extensions import db
from app.models.models import Slide, SocialLink, SiteSetting

app = create_app()

with app.app_context():
    Slide.query.delete()
    SocialLink.query.delete()
    db.session.commit()

    slides = [
        Slide(image_url='img/chipset-slide-1.jpeg', title='جدیدترین قطعات رباتیک',
              description='بهترین قیمت برای آردوینو، رزبری‌پای و سنسورها',
              link_url='/products-explore.html', order_index=1),
        Slide(image_url='img/chipset-slide-2.jpeg', title='تخفیف ویژه استارتر کیت',
              description='تا ۱۵٪ تخفیف روی کیت‌های آموزشی',
              link_url='/products-explore.html?category=آموزشی', order_index=2),
        Slide(image_url='img/chipset-slide-3.jpeg', title='ارسال سریع به سراسر کشور',
              description='تحویل اکسپرس در کمتر از ۴۸ ساعت',
              link_url='/products-explore.html', order_index=3),
    ]
    db.session.add_all(slides)

    socials = [
        SocialLink(platform='اینستاگرام', icon_class='ti ti-brand-instagram',
                    url='https://instagram.com/robokala', order_index=1),
        SocialLink(platform='تلگرام', icon_class='ti ti-brand-telegram',
                    url='https://t.me/robokala', order_index=2),
        SocialLink(platform='واتساپ', icon_class='ti ti-brand-whatsapp',
                    url='https://wa.me/989120000000', order_index=3),
    ]
    db.session.add_all(socials)

    defaults = {
        'footer_about': 'مرجع فروش قطعات رباتیک و آموزش‌های تخصصی میکروکنترلر و الکترونیک',
        'footer_phone': '📞 0912xxxxxxx',
        'footer_email': '✉ info@robokala.ir',
        'footer_copyright': '© 2026 RoboKala - تمام حقوق محفوظ است',
    }
    for k, v in defaults.items():
        if not SiteSetting.query.get(k):
            db.session.add(SiteSetting(key=k, value=v))

    db.session.commit()
    print('✅ اسلایدر، شبکه‌های اجتماعی و تنظیمات فوتر اضافه شد')

    