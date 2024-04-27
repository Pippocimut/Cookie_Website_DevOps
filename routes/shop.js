const path = require('path');

const express = require('express');

const shopController = require('../controllers/shop');

const isAuth = require('../middleware/is-auth');
const isAdmin = require('../middleware/is-admin');
const router = express.Router();

router.get('/', shopController.getIndex);

router.get('/secret', isAuth, isAdmin, shopController.getSecret);
router.get('/products/:id', shopController.getProductDetails);
router.post('/cart', shopController.postAddToCart);
router.get('/cart', shopController.getCart);
router.post('/cart-delete-item', shopController.deleteCartItem);

router.get('/checkout/cart', shopController.getCheckoutCart);

router.get('/checkout', shopController.getCheckoutProduct);
router.get('/checkout/success', shopController.getCheckoutSuccess);
router.get('/checkout/cancel', shopController.getCheckoutCancel);

router.get('/order-cookie', shopController.getOrderCookie);
router.post('/order-cookie', shopController.postOrderCookie);





module.exports = router;
