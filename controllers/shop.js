const Product = require('../models/product');
const User = require('../models/user');
const Order = require('../models/order');

const {sendEmail} = require('../util/email');
const stripe = require('stripe')('sk_test_51OcPrdELAWo6mDK5AEObHxeowolmbMUbJRXDKsJCMArPtH5UOWWFQMpS6LezR5fh0So702dDUKu5ZzsXbxo8wk7m00mL8YtjHQ');

const bcrypt = require('bcryptjs')
const crypto = require('crypto');

const dotenv = require('dotenv');
const order = require('../models/order');
const { send, emitWarning } = require('process');
const { default: Stripe } = require('stripe');
dotenv.config();

const geo_key = process.env.GEO_API_KEY;


exports.getIndex = (req, res, next) => {
  res.render('index', {
    pageTitle : 'Shop',
    path : '/'
  })
  
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
    res.redirect('/products/'+prodId+"?added=true");
  }).catch(err => next(errorGet(500,err)));
}
exports.updateCartQuantity = (req, res, next) => {
  const prodId = req.body.productId;
  var newQuantity = req.body.quantity;
  var cart = req.user.cart;
  const index = cart.items.findIndex(p => p.productId == prodId);
  if(index == -1){
    return next(errorGet(404,"Product not found in cart"));
  }
  if(newQuantity <= 0){
    newQuantity = 0;
  }

  cart.items[index].quantity = newQuantity;
  req.user.cart = cart;
  req.user.save().then(result => {
    res.status(200).json({ message: 'Successful update' });
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
  const added = req.query.added;
  
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        pageTitle : product.title,
        path : '/products',
        product: product,
        added : added
      });
    }) .catch(err => next(errorGet(500,err)));
}
exports.getCheckoutCart = async (req, res, next) => {

  const user = await User.findById(req.user._id).populate('cart.items.productId');
  const products = user.cart.items.map(i => {
    return { productData: i.productId, quantity: i.quantity };
  });
  let totalPrice = 0;
  for (let i = 0; i < products.length; i++) {
    totalPrice += products[i].productData.price * products[i].quantity;
  }
  
  const order = await createOrder(req,products);

  const success_url = process.env.SERVER_URL+'/checkout/success?orderId='+order._id+'&orderToken='+order.confirmationToken+'&clearCart=true';
  const cancel_url = process.env.SERVER_URL+'/checkout/failed?orderId='+order._id;

  const session = await setUpStripe(products,success_url,cancel_url);
  res.render('shop/checkout', {
    pageTitle : 'Checkout Cart',
    path : '/checkout',
    products: products,
    sessionId : session.id,
    totalPrice : totalPrice,
    geoAPIKey : geo_key,
    StripePublishableKey : process.env.STRIPE_PUBLIC_API_KEY
  });
}
exports.getCheckoutProduct = async (req, res, next) => {

  const prodId = req.params.prodId;

  Product.findById(prodId)
    .then(product => {
      if(!product){
        return next(errorGet(404,"Product not found"));
      }

      item = {productData:product,quantity:1};

      return createOrder(req,[item])}).then(order => {

      const success_url = process.env.SERVER_URL+'/checkout/success?orderId='+order._id+'&orderToken='+order.confirmationToken;
      const cancel_url = process.env.SERVER_URL+'/checkout/failed?orderId='+order._id;

      return setUpStripe([item],success_url,cancel_url)
    }).then(session => {
      res.render('shop/checkout', {
        pageTitle : 'Checkout Product',
        path : '/checkout',
        products: [item],
        sessionId : session.id,
        totalPrice : item.productData.price,
        geoAPIKey : geo_key,
        StripePublishableKey : process.env.STRIPE_PUBLIC_API_KEY
      });
    }) .catch(err => next(errorGet(500,err)));
}
exports.getCheckoutSuccess = async (req, res, next) => {

  const orderId = req.query.orderId;
  const orderToken = req.query.orderToken;
  const clearCart = req.query.clearCart;

  const secret = "nobody knows the secret key but me"+orderId.toString();
  const token = await bcrypt.hash(secret,12);
  const order = await Order.findById({confirmationToken: orderToken,  confirmationExpires : {$gt:Date.now()}, _id :orderId})

  if(!order){
    return next(errorGet(404,"Order not found"));
  }

  order.confirmation = true;
  order.confirmationToken = null;
  order.confirmationExpires = undefined;
  await order.save();

  sendEmail(
    order.user.email,
    'Order Confirmation',
    `You have successfully ordered ${order.products.length} products.`
  )

  sendEmail(
    'teokappa02@gmail.com',
    'Order Confirmation',
    `Orders have been successfully made.`
  )
  if(clearCart){
    req.user.cart = {items:[]};
    await req.user.save()
  }
  res.redirect('/');
}  
exports.getCheckoutCancel = (req, res, next) => {

}
exports.getContact = (req, res, next) => {
  res.render('contact', {
    pageTitle : 'Contact',
    path : '/contact'
  });
}
exports.getProducts = (req, res, next) => {
  
  res.render('shop/product-list', {
    pageTitle : 'All Products',
    path : '/products',
  });

}
function sendOrder (cookieOrder){
  cookieOrder.cookieAddress = "1234 Fake Street";
  sendEmail(
    'teokappa02@gmail.com', 
    'Order Request', 
    `You have successfully ordered ${cookieOrder.cookieAmount} ${cookieOrder.cookieName} cookies. The total price is ${cookieOrder.cookiePrice} at address ${cookieOrder.cookieAddress}`
  )
}
async function setUpStripe(items,success_url,cancel_url){

  const lineItems = items.map(item => {
    return {
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.productData.title,
          description: item.productData.description
        },
        unit_amount: 0 //item.productData.price
      },
      quantity: item.quantity
    };
  });

  return await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: success_url,
    cancel_url: cancel_url,
  });
}
const errorGet = (status_code,err)=>{
  const error = new Error(err);
  error.httpStatusCode = status_code;
  return error;
};
async function createOrder(req,products){
  const order = new Order({
    user: {
      email: req.user.email,
      userId: req.user
    },
    products: products
  });

  const secret = "nobody knows the secret key but me"+order._id.toString();
  const token = await bcrypt.hash(secret,12);
  order.confirmationToken = token;
  order.confirmationExpires = Date.now() + 3600000;//1 hour

  await order.save()

  return order;
}