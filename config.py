import os

class Config:
    # آدرس ذخیره شدن فایل دیتابیس
    SQLALCHEMY_DATABASE_URI = 'sqlite:///site.db'
    # برای اینکه سرعت برنامه کم نشه این رو False می‌ذاریم
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # یه کلید امنیتی برای فرم‌ها (بعدا لازم میشه)
    SECRET_KEY = 'my_secret_key_12345'
    JWT_SECRET_KEY = 'robot-store-super-secret-2024'
    