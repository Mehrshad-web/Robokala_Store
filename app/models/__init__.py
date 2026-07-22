from flask import Flask
from config import Config

from app.extensions import db, cors, jwt

from app.routes.api import api
from app.routes.main_routes import main
from app.routes.admin import admin
from app.routes.auth import auth
from app.routes.cart import cart_bp
from app.routes.orders import orders_bp
from app.routes.content import content
from app.routes.payment import payment


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Extensions
    db.init_app(app)
    cors.init_app(app)
    jwt.init_app(app)

    # Blueprints
    app.register_blueprint(api, url_prefix='/api')
    app.register_blueprint(main)
    app.register_blueprint(admin, url_prefix='/admin')
    app.register_blueprint(auth, url_prefix='/auth')
    app.register_blueprint(cart_bp, url_prefix='/api/cart')
    app.register_blueprint(orders_bp, url_prefix='/api/orders')
    app.register_blueprint(content, url_prefix='/api')
    app.register_blueprint(payment, url_prefix='/payment')

    # Database tables
    with app.app_context():
        from app.models.models import (
            User, Product, Category,
            CartItem, Order, OrderItem, Comment,
            Slide, SocialLink, SiteSetting, FAQItem
        )

    with app.app_context():
        db.create_all()

    return app
