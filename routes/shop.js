const express = require('express');

const shopController = require('../controllers/shop');

const isAuth = require('../middleware/is-auth');
const isAdmin = require('../middleware/is-admin');
const pagination = require('../middleware/pagination');
const router = express.Router();

router.get('/', pagination, shopController.getIndex);

router.get('/secret', isAuth, isAdmin, shopController.getSecret);
router.get('/contact', shopController.getContact);

router.get('/products', pagination, shopController.getProducts);
router.get('/products/:id', shopController.getProductDetails);

router.post('/cart', isAuth, shopController.postAddToCart);
router.get('/cart', isAuth, shopController.getCart);
router.post('/cart-update-quanity', shopController.updateCartQuantity);

router.post('/cart-delete-item', shopController.deleteCartItem);

router.get('/checkout/cart', shopController.getCheckoutCart);
router.get('/checkout/success', shopController.getCheckoutSuccess);
router.get('/checkout/cancel', shopController.getCheckoutCancel);
router.get('/checkout/:prodId', shopController.getCheckoutProduct);

module.exports = router;
