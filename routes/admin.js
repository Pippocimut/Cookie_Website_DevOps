const adminController = require('../controllers/admin');

const isAuth = require('../middleware/is-auth');
const isAdmin = require('../middleware/is-admin');

const { check } = require('express-validator')

const express = require('express');
const router = express.Router();

router.use(isAuth);
router.use(isAdmin);

router.delete('/product',adminController.DeleteProduct);
router.post('/product',[
    check('title').isString().isLength({min:3}).trim(),
    check('price').isFloat(),
    check('description').trim().isLength({max:200})], adminController.AddProduct);
router.put('/product',[
    check('title').isString().isLength({min:3}).trim(),
    check('price').isFloat(),
    check('description').trim().isLength({max:200})], adminController.EditProduct);


module.exports = router;
