from flask import Flask
from config import Config
from app.extensions import db, cors, jwt
from app.routes.api import api
from app.routes.main_routes import main
from app.routes.admin import admin
from app.routes.auth import auth
from app.routes.cart import cart_bp
from app.routes.orders import orders_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    cors.init_app(app)  # همه مسیرها
    jwt.init_app(app)

    app.register_blueprint(api, url_prefix='/api')
    app.register_blueprint(main)
    app.register_blueprint(admin, url_prefix='/admin')
    app.register_blueprint(auth, url_prefix='/auth')
    app.register_blueprint(cart_bp, url_prefix='/api/cart')
    app.register_blueprint(orders_bp, url_prefix='/api/orders')

    with app.app_context():
        from app.models.models import (
            User, Product, Category,
            CartItem, Order, OrderItem, Comment
        )
        db.create_all()

    return app