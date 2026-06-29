# create_admin.py — Create Admin Account for Production/Test

from app import create_app
from app.extensions import db
from app.models.models import User
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    print("====================================")
    print("      CREATE ADMIN ACCOUNT          ")
    print("====================================")
    print()
    
    email    = input("Enter Email: ").strip()
    username = input("Enter Username: ").strip()
    password = input("Enter Password: ").strip()

    if len(password) < 6:
        print("❌ Error: Password must be at least 6 characters long.")
        exit()

    if User.query.filter_by(email=email).first():
        print("❌ Error: This email is already registered.")
        exit()

    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
        is_admin=True
    )
    db.session.add(user)
    db.session.commit()

    print()
    print("====================================")
    print("✅ Admin account created successfully!")
    print(f"👤 Username: {username}")
    print(f"📧 Email: {email}")
    print(f"🔑 Admin Panel Route: /admin.html")
    print("====================================")
