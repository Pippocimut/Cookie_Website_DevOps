const express = require('express');
const { check, body } = require('express-validator');
const User = require('../models/user')
const authController = require('../controllers/auth');

const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login',
    [body('email').isEmail().withMessage("Please enter a valid email").normalizeEmail(),
     body('password','Please insert a valid password with numbers letters and minimum 8 characters').isLength({min:8}).matches(/^[A-Za-z0-9 .,'!&]+$/).trim()],  
    authController.postLogin);

router.post('/signup',[
    body('email').isEmail().withMessage("Please enter a valid email")
    .custom((value, { req }) => {
        return User.findOne({email:req.body.email})
        .then(userDoc => {
            if(userDoc){
                return Promise.reject('E-Mail exists already')
            }
        });
    }).normalizeEmail(), 
    body('password','Please insert a valid password with numbers letters and minimum 8 characters').isLength({min:8}).matches(/^[A-Za-z0-9 .,'!&]+$/).trim(),
    body('confirmPassword').trim().custom((value, {req})=>{
        if(value !== req.body.password )
            throw Error('Password need to match')
        return true
    })
], 
 authController.postSignup);

router.post('/logout', isAuth, authController.postLogout);

router.get('/account', isAuth, authController.getAccount);

router.get('/reset',authController.getReset);
router.post('/reset',authController.postReset);
router.get('/reset/:token', authController.getResetPassword);
router.get('/verification/:token/:email', authController.getVerification);
router.post('/new-password',authController.postResetPassword)

module.exports = router;