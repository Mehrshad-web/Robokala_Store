from werkzeug.security import generate_password_hash
from app import create_app
from app.extensions import db
from app.models.models import User, Category, Product

app = create_app()

with app.app_context():
    # پاک کردن داده‌های قبلی
    Product.query.delete()
    Category.query.delete()
    User.query.delete()
    db.session.commit()

    # ساخت دسته‌بندی‌ها
    cat_robotics = Category(name='رباتیک')
    cat_electronics = Category(name='قطعات الکترونیک')
    cat_educational = Category(name='آموزشی')
    db.session.add_all([cat_robotics, cat_electronics, cat_educational])
    db.session.commit()

    # ساخت محصولات
    products = [
        Product(
            name='Arduino Uno',
            price=350000,
            discount=0,
            stock=10,
            image_url='img/product/prod1.jpeg',
            description='برد آردوینو اونو مناسب برای شروع پروژه‌های الکترونیک و رباتیک',
            category_id=cat_electronics.id
        ),
        Product(
            name='Raspberry Pi 4',
            price=1200000,
            discount=10,
            stock=5,
            image_url='img/product/prod2.jpeg',
            description='میکروکامپیوتر قدرتمند برای پروژه‌های IoT و یادگیری ماشین',
            category_id=cat_electronics.id
        ),
        Product(
            name='Servo Motor SG90',
            price=180000,
            discount=0,
            stock=20,
            image_url='img/product/prod3.jpeg',
            description='موتور سروو مینیاتوری برای کنترل دقیق زاویه در رباتیک',
            category_id=cat_robotics.id
        ),
        Product(
            name='Breadboard 830',
            price=75000,
            discount=5,
            stock=50,
            image_url='img/product/prod4.jpeg',
            description='برد آزمایشگاهی ۸۳۰ سوراخه برای ساخت مدارات بدون لحیم',
            category_id=cat_electronics.id
        ),
        Product(
            name='Starter Kit Arduino',
            price=850000,
            discount=15,
            stock=8,
            image_url='img/product/prod5.jpeg',
            description='کیت جامع شروع با آردوینو شامل قطعات ضروری برای مبتدیان',
            category_id=cat_educational.id
        ),
        Product(
            name='ربات آموزشی پایه',
            price=2500000,
            discount=0,
            stock=3,
            image_url='img/product/prod7.jpeg',
            description='ربات آموزشی کامل برای یادگیری اصول رباتیک و برنامه‌نویسی',
            category_id=cat_robotics.id
        ),
        Product(
            name='کیت سنسور ۳۷ در ۱',
            price=450000,
            discount=20,
            stock=15,
            image_url='img/product/prod8.jpeg',
            description='مجموعه ۳۷ سنسور مختلف برای پروژه‌های آردوینو و رزبری‌پای',
            category_id=cat_educational.id
        ),
    ]
    db.session.add_all(products)

    # ساخت کاربر ادمین
    admin = User(
        username='admin',
        email='admin@robokala.ir',
        password_hash=generate_password_hash('admin123'),
        is_admin=True
    )
    db.session.add(admin)
    db.session.commit()

    print('✅ داده‌های تست با موفقیت اضافه شدن')
    print('👤 ادمین: admin@robokala.ir / admin123')