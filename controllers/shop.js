const Product = require('../models/product');
const Order = require('../models/order');
const fs = require("fs");
const path = require('path');
const PDFDocument =  require('pdfkit');
const stripe = require('stripe')('sk_test_51OcPrdELAWo6mDK5AEObHxeowolmbMUbJRXDKsJCMArPtH5UOWWFQMpS6LezR5fh0So702dDUKu5ZzsXbxo8wk7m00mL8YtjHQ');

const errorGet = (status_code,err)=>{
  console.log("Error from ErrorGet function")
  console.log(err)
  const error = new Error(err);
  error.httpStatusCode = status_code;
  return error;
};

exports.getProducts = (req, res, next) => {
  res.render('shop/product-list', {
    prods: res.locals.products,
    pageTitle: 'All Products',
    path: '/products',
    isAuthenticated: req.session.isLoggedIn
  });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => console.log(err));
};

exports.getIndex = (req, res, next) => {
  
  res.render('shop/index', {
    pageTitle : 'Shop',
    path : '/'
  });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => console.log(err));
};

exports.getCheckout = (req,res,next) => {
  let products;
  let total = 0;
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      products = user.cart.items;
      total = 0;
      products.forEach(prod=> {
        total += prod.quantity * prod.productId.price;
      });
      return stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: products.map(p => {
          return {
            price_data: {
              product_data: {
                name:         p.productId.title,
                description:  p.productId.description,
              },
              unit_amount: p.productId.price*100,
              currency:     'gbp',
            },
            quantity:     p.quantity
          }
        }),
        mode: 'payment',
        success_url: req.protocol + "://" + req.get('host') + '/checkout/success',
        cancel_url:  req.protocol + "://" + req.get('host') + '/checkout/cancel'
      });

    }).then(sessionKey => {
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Checkout',
        products: products,
        totalSum:  total,
        isAuthenticated: req.session.isLoggedIn,
        sessionId: sessionKey.id
      });
    })
    .catch(err => errorGet(500,err));
}

exports.getCheckoutSuccess = (req,res,enxt) =>{
  req.user
  .populate('cart.items.productId')
  .execPopulate()
  .then(user => {
    const products = user.cart.items.map(i => {
      return { quantity: i.quantity, product: { ...i.productId._doc } };
    });
    const order = new Order({
      user: {
        email: req.user.email,
        userId: req.user
      },
      products: products
    });
    return order.save();
  })
  .then(result => {
    return req.user.clearCart();
  })
  .then(() => {
    res.redirect('/orders');
  })
  .catch(err => console.log(err));
}


exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      console.log(result);
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => console.log(err));
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders,
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => console.log(err));
};


exports.getInvoice = (req,res,next)=>{
  const orderId = req.params.orderId;
  const invoiceName = 'invoice-'+orderId+".pdf"
  const invoicePath = path.join('data','invoices',invoiceName)
  Order.findById(orderId).then(order =>{

    if(!order){
      return next(new Error('No order found.'))
    }
    if(order.user.userId.toString() !== req.user._id.toString()){
      return next(new Error('Unauthorized'))
    }

    const pdfDoc= new PDFDocument();
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','inlines;filename="'+invoiceName+'"')
    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    
    pdfDoc.pipe(res);

    pdfDoc.fontSize(26).text('Invoice')
    pdfDoc.text('-----------------------------------')
    let totalPrice = 0;
    order.products.forEach(prod =>{
      totalPrice += totalPrice + prod.quantity * prod.product.price
      pdfDoc.text(
        prod.product.title +
        " - "+ 
        prod.quantity + 
        " x $" + 
        prod.product.price);
    })
    pdfDoc.text('-----------')
    pdfDoc.text('Total Price $'+totalPrice);
    pdfDoc.end()


  }).catch(err =>{
    return next(err)
  });
  
};