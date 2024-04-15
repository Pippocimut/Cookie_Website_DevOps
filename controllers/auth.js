const User = require('../models/user');
const bcrypt = require('bcryptjs')
const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport');
const crypto = require('crypto');
const { validationResult} = require('express-validator')

const dotenv = require('dotenv')
dotenv.config()

const transporter = nodemailer.createTransport(sendgridTransport({
  auth: {
    api_key: process.env.SenGrid
  }
}));

exports.getLogin = (req, res, next) => {
  
  var message = req.flash('error')
  if(message.length>0){
    message = message[0];
  }else
  {
    message = null;
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message,
    oldInput : {
      email: '',
      password: ''
    },
    validationErrors: []
  });
};

exports.getSignup = (req, res, next) => {
  console.log("Entered get signup")
  var message = req.flash('error')
  if(message.length>0){
    message = message[0];
  }else
  {
    message = null;
  }
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage : message,
    oldInput: { email : '', 
      password  : '',
      confirmPassword: ''
    },
    validationErrors:[]
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password =  req.body.password;

  const errors = validationResult(req)
  if(!errors.isEmpty()){
    return res.status(422).render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage: errors.array()[0].msg,
      oldInput : {
        email: email,
        password: password
      },
      validationErrors: errors.array()
    });
  }

  User.findOne({email: email})
    .then(user => {
      if(!user){
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: 'Invalid email or password.',
          oldInput : {
            email: email,
            password: password
          },
          validationErrors: []
        });
      }
      if(!user.active){
        return res.status(402).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: 'Verify your email before loggin in.',
          oldInput : {
            email: email,
            password: password
          },
          validationErrors: []
        });
      }
      bcrypt.compare(password, user.password)
      .then(doMatch =>{
        if(doMatch){
          req.session.isLoggedIn = true;
          req.session.user = user;
          return req.session.save(err => {
            console.log(err);
            res.redirect('/');
          });
          
        }
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: 'Invalid email or password.',
          oldInput : {
            email: email,
            password: password
          },
          validationErrors: []
        });
      })
      .catch(err =>{
        console.log(err);
        res.redirect('/login');
      })
    }).catch(err => next(err));
};


exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  console.log(email)
  const password = req.body.password;
  const errors = validationResult(req)
  if(!errors.isEmpty()){
    console.log("Errors found in validation")
    console.log(errors.array());
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage : errors.array()[0].msg,
      oldInput: { email:email, 
        password:password,
        confirmPassword: req.body.confirmPassword
      },
      validationErrors: errors.array()
    });
  }
  crypto.randomBytes(32,(err,buffer) => {
      if(err){
        console.log(err)
        return res.redirect('/singup')
      }
      token =  buffer.toString('hex')
    bcrypt.hash(password, 12).then(hashedPassword =>{
      const user = new User({
        email: email,
        password : hashedPassword,
        emailVeriificationToken: token,
        emailVerificationTokenExpiration: Date.now() +(60*60*1000),
      })
      return user.save();
    })
    .then(result => {
      res.redirect('/login')
      return transporter.sendMail({
        to: email,
        from: 'teokappa02@gmail.com',
        subject: 'Email Verification',
        html: `<h1> Verify your email here </h1><br><p> Click this <a href="http://localhost:3002/verification/${token}/${email}">link</a> to verify your email<p>`
      })
    }).catch(err => {
      next(err);
    })
  })

};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    res.redirect('/')
  });
};

exports.getReset = ((req,res,next) => {

  var message = req.flash('error')
  if(message.length>0){
    message = message[0];
  }else
  {
    message = null;
  }

  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage : message
  })
  
});

exports.postReset = (req,res,next)=>{
  crypto.randomBytes(32,(err,buffer) => {
    if(err){
      console.log(err)
      return res.redirect('/reset')
    }
    const token = buffer.toString('hex');
    User.findOne({email: req.body.email})
      .then(user => {
        if(!user){
          req.flash('error','No account with that email found')
          return res.redirect('/reset');
        }

        user.resetToken = token;
        user.resetTokenExpiration = Date.now() +(60*60*1000);
        return user.save();

      }).then( result => {
        res.redirect('/')
        transporter.sendMail({
          to: req.body.email,
          from: 'teokappa02@gmail.com',
          subject: 'Password reset',
          html:  `
            <p> You requested a password reset <p>
            <p> Click this <a href="http://localhost:3002/reset/${token}">link</a> to set a new password <p>
          `
        })
      })
      .catch(err => {
        console.log(err);
      })
  })
};
exports.getResetPassword = (req,res,next)=>{

  const token = req.params.token;

  User.findOne({resetToken: token, resetTokenExpiration : {$gt:Date.now()}})
  .then(user => {
    var message = req.flash('error')
    if(message.length>0){
      message = message[0];
    }else{
      message = null;
    }

    res.render('auth/new-password', {
      path: '/new-password',
      pageTitle: 'New Password',
      errorMessage : message,
      userId : user._id.toString(),
      passwordToken: token
    })
  })
  .catch(err =>{
    next(err);
  });
}

exports.postResetPassword = (req,res,next) =>{
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({resetToken: passwordToken, resetTokenExpiration : {$gt:Date.now()}, _id :userId})
  .then(user => {
    resetUser = user
    return bcrypt.hash(newPassword,12)
  }).then(hashedPassword => {
    resetUser.password = hashedPassword;
    resetUser.resetToken = null;
    resetUser.resetTokenExpiration = undefined;
    return resetUser.save();
  }).then(result => {
    res.redirect('/login');
  })
  .catch(error=>{
    next(error);
  })

};

exports.getVerification = (req,res,next) => {
  const token = req.params.token;
  const email = req.params.email;
  console.log("Entered get verification")
  User.findOne({email: email, emailVeriificationToken: token, emailVerificationTokenExpiration : {$gt:Date.now()}})
  .then(user => {
    user.active = true;
    user.emailVeriificationToken = null;
    user.emailVerificationTokenExpiration = undefined;
    return user.save();
  })
  .then(result => {
    res.redirect('/login');
  })
  .catch(err => {
    next(err);
  })
}


exports.getAccount = (req, res, next) => {
  res.render('auth/account', {
    path: '/account',
    pageTitle: 'Account',
    user : req.user
  });
}