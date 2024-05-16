const Product = require('../models/product');
const {validationResult} = require('express-validator')
const s3Helper = require('../util/file-storage')

exports.EditProduct = async (req, res, next) => {

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

  const product = await Product.findById(prodId)
  if(product.userId.toString() !== req.user._id.toString()){
    return res.redirect('/')
  }
  product.title = updatedTitle;
  product.price = updatedPrice;
  product.description = updatedDesc;

  if(image){
    s3Helper.deleteImage(product.imageUrl);
    product.imageUrl = image.location
  }

  await product.save()

  res.json({message: 'Product updated successfully.'});
};

exports.DeleteProduct = async (req, res, next) => {

  const prodId = req.body.productId;
  const product = await Product.findById(prodId)
  if(!product){
    return next(new Error('Product not found.'))
  }
  s3Helper.deleteImage(product.imageUrl);
  await Product.deleteOne({ _id:prodId})
  res.json({message: 'Product deleted successfully.'});
  
};
exports.AddProduct = async (req, res, next) => {

  console.log("Entered Add Product")
  const newProduct = {
    title : req.body.title,
    price : req.body.price,
    description: req.body.description
  }

  image = req.file

  const errors = validationResult(req)

  if(!image){
    return res.status(422).json( {message: errors.array()[0].msg})
  }

  if(!errors.isEmpty()){
    return res.status(422).json( {message: errors.array()[0].msg})
  }
  console.log("Creating product")
  const product = new Product({
    ...newProduct,
    imageUrl: image.location,
    userId: req.user
  });

  await product.save()
  
  res.json({message: 'Product added successfully.'});
};
