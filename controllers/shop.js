const Product = require('../models/product');
const User = require('../models/user');
const Order = require('../models/order');
const {sendEmail} = require('../util/email');
const stripe = require('stripe')('sk_test_51OcPrdELAWo6mDK5AEObHxeowolmbMUbJRXDKsJCMArPtH5UOWWFQMpS6LezR5fh0So702dDUKu5ZzsXbxo8wk7m00mL8YtjHQ');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs')
const crypto = require('crypto');

dotenv.config();

exports.getIndex = (req, res, next) => {
  Product.find().limit(3)
    .then(products => {
      res.render('index', {
        pageTitle : 'Shop',
        path : '/',
        prods: products,
        isAuthenticated: req.session.isLoggedIn
      });
    }) .catch(err => next(errorGet(500,err)));
  
};
exports.getSecret = (req, res, next) => {
  res.render('secret', {
    pageTitle : 'Secret',
    path : '/secret'
  });
};
exports.getCart = async (req, res, next) => {
  const cart = req.user.cart;
  if(cart == null){
    return next(errorGet(404,"Cart not found"));
  }
  
  const user = await User.findById(req.user._id).populate('cart.items.productId');
    const products = user.cart.items.map(i => {
      return { productData: i.productId, quantity: i.quantity };
    });
    console.log(products);
  res.render('shop/cart', {
    pageTitle : 'Your Cart',
    path : '/cart',
    products: products
  });

}
exports.postAddToCart = (req, res, next) => {
  const prodId = req.body.productId
  oldcart = req.user.cart;
  if(Product.findById(prodId) == null){
    return next(errorGet(404,"Product not found"));
  }

  if(oldcart == null){
    oldcart = {items:[]};
  }

  if(oldcart.items.length == 0){
    oldcart.items.push({productId:prodId,quantity:1});
  }
  else{
    const index = oldcart.items.findIndex(p => p.productId == prodId);
    if(index == -1){
      oldcart.items.push({productId:prodId,quantity:1});
    }
    else{
      oldcart.items[index].quantity += 1;
    }
  }
  req.user.cart = oldcart;
  req.user.save().then(result => {
    res.redirect('/');
  }).catch(err => next(errorGet(500,err)));
}
exports.deleteCartItem = (req, res, next) => {
  const prodId = req.body.productId;
  const cart = req.user.cart;
  const index = cart.items.findIndex(p => p.productId == prodId);
  if(index == -1){
    return next(errorGet(404,"Product not found in cart"));
  }
  cart.items.splice(index,1);
  req.user.cart = cart;
  req.user.save().then(result => {
    res.redirect('/cart');
  }).catch(err => next(errorGet(500,err)));
}
exports.postBuyNow = (req, res, next) => {
  const prodId = req.body.productId
}
exports.getProductDetails = (req, res, next) => {
  const prodId = req.params.id;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        pageTitle : product.title,
        path : '/products',
        product: product
      });
    }) .catch(err => next(errorGet(500,err)));
}
exports.getCheckoutCart = async (req, res, next) => {

  const user = await User.findById(req.user._id).populate('cart.items.productId');
  const products = user.cart.items.map(i => {
    return { productData: i.productId, quantity: i.quantity };
  });
  const order = new Order({
    user: {
      email: req.user.email,
      userId: req.user
    },
    products: products
  });
  req.session.items = products;
  const session = await setUpStripe(products);
  console.log(session.id)
  res.render('shop/checkout', {
    pageTitle : 'Checkout Cart',
    path : '/checkout',
    products: products,
    sessionId : session.id
  });
}
exports.getCheckoutProduct = async (req, res, next) => {
  const prodId = req.body.productId;
 
  Product.findById(prodId)
    .then(product => {
      
      item = {productData:product,quantity:1};
      req.session.items = [items];
      return setUpStripe([item])})
    .then(session => {
      res.render('shop/checkout', {
        pageTitle : 'Checkout Product',
        path : '/checkout',
        products: [item],
        sessionId : session.id
      });
    }) .catch(err => next(errorGet(500,err)));
}
exports.getCheckoutSuccess = (req, res, next) => {

  req.user.cart = {items:[]};
  req.session.items = {items:[]};

  req.user.save().then(result => {
    res.redirect('/');}).catch(err => next(errorGet(500,err)));
}
exports.getCheckoutCancel = (req, res, next) => {

}

exports.getOrderCookie = (req, res, next) => {
  res.render('shop/order-cookie', {
    pageTitle : 'Order Cookie',
    path : '/order-cookie'
  });
}
exports.postOrderCookie = (req, res, next) => {
  const cookieName = req.body.cookieName;
  const cookieAmount = req.body.cookieAmount;
  const cookiePrice = req.body.cookiePrice;

  const cookieOrder = {
    cookieName : cookieName,
    cookieAmount : cookieAmount,
    cookiePrice : cookiePrice
  };

  sendOrder(cookieOrder);
  res.redirect('/');
}
function sendOrder (cookieOrder){
  cookieOrder.cookieAddress = "1234 Fake Street";
  sendEmail(
    'teokappa02@gmail.com', 
    'Order Request', 
    `You have successfully ordered ${cookieOrder.cookieAmount} ${cookieOrder.cookieName} cookies. The total price is ${cookieOrder.cookiePrice} at address ${cookieOrder.cookieAddress}`
  )
}
async function setUpStripe(items){

  const lineItems = items.map(item => {
    return {
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.productData.title,
          description: item.productData.description
        },
        unit_amount: 0
      },
      quantity: item.quantity
    };
  });

  return await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: process.env.SERVER_URL+'/checkout/success',//?orderId='+orderId,
    cancel_url: process.env.SERVER_URL+'/checkout/failed',
  });
}
const errorGet = (status_code,err)=>{
  console.log("Error from ErrorGet function")
  const error = new Error(err);
  error.httpStatusCode = status_code;
  return error;
};