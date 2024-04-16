const path = require('path');

const express = require('express');

const shopController = require('../controllers/shop');

const isAuth = require('../middleware/is-auth');
const isAdmin = require('../middleware/is-admin');
const router = express.Router();

router.get('/', shopController.getIndex);

router.get('/secret', isAuth, isAdmin, shopController.getSecret);



module.exports = router;
