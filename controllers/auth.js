const User = require('../models/user');

const bcrypt = require('bcryptjs')
const crypto = require('crypto');

const {sendEmail} = require('../util/email');
const { validationResult} = require('express-validator')
const ejs = require('ejs');
const path = require('path');

const emailsPath = path.join(__dirname, '..', 'pages', 'email');

const dotenv = require('dotenv');
dotenv.config()

exports.getVerifyUser = (req, res, next) => {
  return res.status(200).json({ isLoggedIn: req.session.isLoggedIn });
}

exports.postLogin = async (req, res, next) => {

  const email = req.body.email;
  const password =  req.body.password;
  const errors = validationResult(req)
  res.locals.oldInput = { email: email, password: password};

  if(!errors.isEmpty()){
    return res.status(422).json({
      message: "Validation Error"+errors.array()[0].msg,
    });
  }

  const user = await User.findOne({email: email})

  if(!user){
    return res.status(422).json({ errorMessage: 'Invalid email or password.'});
  }
  if(!user.active){
    if(Date.now() > user.emailVerificationTokenExpiration){

      user.emailVeriificationToken = null;
      user.emailVerificationTokenExpiration = undefined;
      await user.save()

      return res.status(422).json({ errorMessage: 'Invalid email or password.'});
    }

    return res.status(402).json({errorMessage: 'Verify your email before loggin in.'});
  }

  if (await bcrypt.compare(password, user.password)){
    req.session.isLoggedIn = true;
    req.session.user = user;
    await req.session.save();
    return res.status(200).json({ message: 'Login successful.' });
  } else {
    return res.status(422).json({ errorMessage: 'Invalid email or password.'});
  }
};


exports.postSignup = async (req, res, next) => {

  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  res.locals.oldInput = { email: email, password: password, confirmPassword: confirmPassword};

  const errors = validationResult(req)
  if(!errors.isEmpty()){
    return res.status(422).json({
      message : errors.array()[0].msg,
      email: email
    });
  }

  const token = crypto.randomBytes(32).toString('hex');
  
  const hashedPassword = await bcrypt.hash(password, 12)

  const user = new User({
    email: email,
    password : hashedPassword,
    emailVeriificationToken: token,
    emailVerificationTokenExpiration: Date.now() +(60*60*1000),//1 hour
  })

  await user.save()
  sendEmail(
        email,
        'Email Verification',
        `<h1> Verify your email here </h1><br><p> Click this <a href="${process.env.SERVER_URL}/auth/verification/${token}/${email}">link</a> to verify your email<p>`
      )
  res.status(200).json({ message: 'Signup successful.' });
};

exports.getLogout = (req, res, next) => {
  req.session.destroy(err => {
    res.status(200).json({ message: 'Logout successful.' });
  });
};
exports.getReset = (req,res,next) => {
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password'
  })
};
exports.postReset = async (req,res,next)=>{

  res.locals.path = '/reset';
  res.locals.pageTitle = 'Reset Password';

  const token = crypto.randomBytes(32).toString('hex');
  const user = await User.findOne({email: req.body.email})
  if(!user){
    return res.render('auth/reset', {
      errorMessage : 'No account with that email found'
    })
  }
  //Setup token
  user.resetToken = token;
  user.resetTokenExpiration = Date.now() +(60*60*1000);//1 hour
  await user.save();

  sendEmail(
    req.body.email,
    'Password reset',
    `
      <p> You requested a password reset <p>
      <p> Click this <a href="${process.env.SERVER_URL}/auth/reset/${token}">link</a> to set a new password <p>
    `
  )

  res.redirect('/auth/login')
};
exports.getResetPassword = async (req,res,next)=>{

  const token = req.params.token;
  const user = await User.findOne({resetToken: token, resetTokenExpiration : {$gt:Date.now()}})

  if(!user){
    return res.redirect('/auth/login');
  }

  res.render('auth/new-password', {
    path: '/new-password',
    pageTitle: 'New Password',
    userId : user._id.toString(),
    passwordToken: token
  })

}
exports.postResetPassword = async (req,res,next) =>{

  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;

  const user = await User.findOne({resetToken: passwordToken, resetTokenExpiration : {$gt:Date.now()}, _id :userId})
  if(!user){
    return res.redirect('/auth/login');
  }
  const hashedPassword = await bcrypt.hash(newPassword,12)
  user.password = hashedPassword;
  user.resetToken = null;
  user.resetTokenExpiration = undefined;
  await user.save();
  res.redirect('/auth/login');

};
exports.getVerification = async (req,res,next) => {
  const token = req.params.token;
  const email = req.params.email;
  const user = await User.findOne({email: email, emailVeriificationToken: token, emailVerificationTokenExpiration : {$gt:Date.now()}})

  if(!user){
    return res.redirect('/auth/login');
  }

  user.active = true;
  user.emailVeriificationToken = null;
  user.emailVerificationTokenExpiration = undefined;
  await user.save();

  sendEmail(
    email,
    'Email Verification',
    await ejs.renderFile(path.join(emailsPath, "welcome-email.ejs"), {
        userName: email
      })
    )

  res.redirect('/auth/login');

}
exports.getAccount = (req, res, next) => {
  res.render('auth/account', {
    path: '/account',
    pageTitle: 'Account',
    user : req.user
  });
}