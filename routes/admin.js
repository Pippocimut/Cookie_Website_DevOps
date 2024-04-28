const path = require('path');
const express = require('express');
const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');
const { body } = require('express-validator')
const isAdmin = require('../middleware/is-admin');
const router = express.Router();

router.use(isAuth);
router.use(isAdmin);
router.get('/add-product',adminController.getAddProduct);

router.get('/products', adminController.getProducts);

// /admin/add-product => POST
router.post('/add-product',[
    body('title').isString().isLength({min:3}).trim(),
    body('price').isFloat(),
    body('description').trim().isLength({max:200})
], adminController.postAddProduct);

router.get('/edit-product/:productId', adminController.getEditProduct);

router.post('/edit-product',[
    body('title').isString().isLength({min:3}).trim(),
    body('price').isFloat(),
    body('description').trim().isLength({max:200})
], adminController.postEditProduct);

router.post('/delete-product', adminController.postDeleteProduct);

module.exports = router;
