const path = require('path');

const express = require('express');

const shopController = require('../controllers/shop');

const isAuth = require('../middleware/is-auth');
const router = express.Router();

router.get('/', shopController.getIndex);

router.get('/secret', isAuth, shopController.getSecret);

module.exports = router;
