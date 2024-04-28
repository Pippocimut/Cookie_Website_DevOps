const Product = require('../models/product');
const {validationResult} = require('express-validator')
const fileHelper = require('../util/file')

const errorGet = (status_code,err)=>{
  console.log("Error from ErrorGet function")
  const error = new Error(err);
  error.httpStatusCode = status_code;
  return error;
};
const errorLocals = (errors) =>{
  return {
    hasError : true,
    errorMessage : errors.array()[0].msg,
    validationErrors : errors.array()
  }
}

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
  });
};
exports.getEditProduct = (req, res, next) => {

  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }

  const prodId = req.params.productId;

  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
      });
    })
    .catch(err =>{
      console.log("Editing")
      return next(errorGet(500,err));
    });
};
exports.getProducts = async (req, res, next) => {

  const products = await Product.find({userId : req.user._id})
  res.render('admin/products', {
    prods: products,
    pageTitle: 'Admin Products',
    path: '/admin/products',
  });
};
exports.postEditProduct = (req, res, next) => {

  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req)
  if(!errors.isEmpty()){
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id : prodId
      },
      ...errorLocals(errors)
    });
  }
  Product.findById(prodId)
    .then(product => {
      console.log(product.userId.toString())
      console.log(req.user._id.toString())
      if(product.userId.toString() !== req.user._id.toString()){
        return res.redirect('/')
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if(image){
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path
      }
      
      return product.save().then(result => {
        console.log('UPDATED PRODUCT!');
        res.redirect('/admin/products');
      })
    })
    .catch(err => {
      return next(errorGet(500,err))
    });
};
exports.postDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
  .then(product => {
    if(!product){
      return next(new Error('Product not found.'))
    }
    fileHelper.deleteFile(product.imageUrl);
    return Product.deleteOne({ _id:prodId, userId:req.user._id })
  }).then(() => {
      res.redirect('/admin/products');
    })
    .catch(err =>{return  next(errorGet(500,err))});
};
exports.postAddProduct = async (req, res, next) => {

  const newProduct = {
    title : req.body.title,
    price : req.body.price,
    description: req.body.description
  }

  image = req.file

  const errors = validationResult(req)

  if(!image){
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      product: newProduct,
      ...errorLocals(errors)
    });
  }

  if(!errors.isEmpty()){
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      product: newProduct,
      ...errorLocals(errors)
    });
  }
  console.log(image)
  const product = new Product({
    ...newProduct,
    imageUrl: image.location,
    userId: req.user
  });

  await product.save()
    .then(result => {
      res.redirect('/');
    }).catch(err => {
      return next(errorGet(500,err))
    });
};