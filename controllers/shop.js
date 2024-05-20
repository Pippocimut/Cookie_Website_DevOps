const Product = require('../models/product');
const User = require('../models/user');
const Order = require('../models/order');
const dotenv = require('dotenv');
const { sendEmail } = require('../util/email');
const stripe = require('stripe')(process.env.STRIPE_API_KEY);
const bcrypt = require('bcryptjs');

dotenv.config();

const geo_key = process.env.GEO_API_KEY;

exports.getCart = async (req, res, next) => {
  const cart = req.user.cart;
  if (cart == null) {
    return next(errorGet(404, 'Cart not found'));
  }

  const user = await User.findById(req.user._id).populate('cart.items.productId');
  const products = await user.populate('cart.items.productId').execPopulate().then(user => {
    console.log(user.cart.items);
    return user.cart.items.map(i => {
      if(i.productId) {
        return { productData: i.productId._id, quantity: i.quantity, price: i.productId.price, title: i.productId.title};
      }
    }).filter(p => p != undefined);
  })

  console.log(products);

  res.json(products);
};
exports.postAddToCart = (req, res, next) => {
  const prodId = req.body.productId;
  oldcart = req.user.cart;
  if (Product.findById(prodId) == null) {
    return next(errorGet(404, 'Product not found'));
  }

  if (oldcart == null) {
    oldcart = { items: [] };
  }

  if (oldcart.items.length == 0) {
    oldcart.items.push({ productId: prodId, quantity: 1 });
  } else {
    const index = oldcart.items.findIndex(p => p.productId == prodId);
    if (index == -1) {
      oldcart.items.push({ productId: prodId, quantity: 1 });
    } else {
      oldcart.items[index].quantity += 1;
    }
  }
  req.user.cart = oldcart;

  req.user
    .save()
    .then(result => {
      res.json({ message: 'Product added to cart' });
    })
    .catch(err => next(errorGet(500, err)));
};
exports.updateCartQuantity = (req, res, next) => {
  const prodId = req.body.productId;
  var newQuantity = req.body.quantity;
  var cart = req.user.cart;
  const index = cart.items.findIndex(p => p.productId == prodId);
  if (index == -1) {
    return next(errorGet(404, 'Product not found in cart'));
  }
  if (newQuantity <= 0) {
    newQuantity = 0;
  }

  cart.items[index].quantity = newQuantity;
  req.user.cart = cart;
  req.user
    .save()
    .then(result => {
      res.status(200).json({ message: 'Successful update' });
    })
    .catch(err => next(errorGet(500, err)));
};
exports.deleteCartItem = (req, res, next) => {
  const prodId = req.body.productId;
  const cart = req.user.cart;
  const index = cart.items.findIndex(p => p.productId == prodId);

  if (index == -1) {
    return next(errorGet(404, 'Product not found in cart'));
  }
  cart.items.splice(index, 1);
  req.user.cart = cart;

  req.user
    .save()
    .then(result => {
      res.status(200).json({ message: 'Cart item deleted successfully' });
    })
    .catch(err => next(errorGet(500, err)));
};
exports.postBuyNow = (req, res, next) => {
  const prodId = req.body.productId;
  // TODO: Implement the logic for buying a product
};
exports.getProductDetails = (req, res, next) => {
  const prodId = req.params.id;

  Product.findById(prodId)
    .then(product => {
      res.json(product);
    })
    .catch(err => next(errorGet(500, err)));
};
exports.getCheckoutCart = async (req, res, next) => {
  const user = await User.findById(req.user._id).populate('cart.items.productId');
  const products = user.cart.items.map(i => {
    if(i.productId) {
      return { productData: i.productId, quantity: i.quantity };
    }
  }).filter(p => p != undefined);
  let totalPrice = 0;
  console.log(products)
  for (let i = 0; i < products.length; i++) {
    totalPrice += products[i].productData.price * products[i].quantity;
  }

  const order = await createOrder(req, products);

  const success_url =
    process.env.SERVER_URL +
    '/checkout/success?orderId=' +
    order._id +
    '&orderToken=' +
    order.confirmationToken +
    '&clearCart=true';
  const cancel_url = process.env.SERVER_URL + '/checkout/failed?orderId=' + order._id;

  const session = await setUpStripe(products, success_url, cancel_url);
  res.json(session.id);
};
exports.getCheckoutProduct = async (req, res, next) => {
  const prodId = req.params.prodId;

  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return next(errorGet(404, 'Product not found'));
      }

      item = { productData: product, quantity: 1 };

      return createOrder(req, [item]);
    })
    .then(order => {
      const success_url =
        process.env.SERVER_URL +
        '/checkout/success?orderId=' +
        order._id +
        '&orderToken=' +
        order.confirmationToken;
      const cancel_url = process.env.SERVER_URL + '/checkout/failed?orderId=' + order._id;

      return setUpStripe([item], success_url, cancel_url);
    })
    .then(session => {
      res.json({
        pageTitle: 'Checkout Product',
        path: '/checkout',
        products: [item],
        sessionId: session.id,
        totalPrice: item.productData.price,
        geoAPIKey: geo_key,
        StripePublishableKey: process.env.STRIPE_PUBLIC_API_KEY
      });
    })
    .catch(err => next(errorGet(500, err)));
};
exports.getCheckoutSuccess = async (req, res, next) => {
  const orderId = req.query.orderId;
  const orderToken = req.query.orderToken;
  const clearCart = req.query.clearCart;

  const secret = 'nobody knows the secret key but me' + orderId.toString();
  const token = await bcrypt.hash(secret, 12);
  const order = await Order.findById({
    confirmationToken: orderToken,
    confirmationExpires: { $gt: Date.now() },
    _id: orderId
  });

  if (!order) {
    return next(errorGet(404, 'Order not found'));
  }

  order.confirmation = true;
  order.confirmationToken = null;
  order.confirmationExpires = undefined;
  await order.save();

  sendEmail(order.user.email, 'Order Confirmation', `You have successfully ordered ${order.products.length} products.`);

  sendEmail('teokappa02@gmail.com', 'Order Confirmation', `Orders have been successfully made.`);

  if (clearCart) {
    req.user.cart = { items: [] };
    await req.user.save();
  }
  res.json({ message: 'Checkout success' });
};
exports.getCheckoutCancel = (req, res, next) => {
  // TODO: Implement the logic for handling checkout cancellation
};
exports.getContact = (req, res, next) => {
  res.json({
    pageTitle: 'Contact',
    path: '/contact'
  });
};

exports.getProducts = (req, res, next) => {
  res.json(res.locals.products);
};


async function setUpStripe(items, success_url, cancel_url) {
  const lineItems = items.map(item => {
    if (item.quantity <= 0) {
      return;
    }
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
    cancel_url: cancel_url
  });
}

const errorGet = (status_code, err) => {
  const error = new Error(err);
  error.httpStatusCode = status_code;
  return error;
};

async function createOrder(req, products) {
  const order = new Order({
    user: {
      email: req.user.email,
      userId: req.user
    },
    products: products
  });

  const secret = 'nobody knows the secret key but me' + order._id.toString();
  const token = await bcrypt.hash(secret, 12);
  order.confirmationToken = token;
  order.confirmationExpires = Date.now() + 3600000; //1 hour

  await order.save();

  return order;
}