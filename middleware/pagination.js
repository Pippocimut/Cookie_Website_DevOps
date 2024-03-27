const MAX_ITEM_PAGE = 1;
const Product = require('../models/product');

const paginationFunction = (totalItems,page) => {
    return {
      totalProducts : totalItems,
      currentPage : page,
      hasNextPage : (MAX_ITEM_PAGE*page<totalItems),
      hasPreviousPage : page>1,
      nextPage : page+1,
      previousPage : page-1,
      lastPage : Math.ceil(totalItems/MAX_ITEM_PAGE)
    }
  }

module.exports = ((req,res,next) => {

    const page = parseInt(req.query.page) || 1;

    Product.find()
    .countDocuments()
    .then(count => {
        res.locals.totalItems = count;
      return Product.find()
      .skip((page-1) * MAX_ITEM_PAGE)
      .limit(MAX_ITEM_PAGE)
    })
    .then(products => {
        res.locals.products = products
        console.log(res.locals.products)
        res.locals.pagination = paginationFunction(res.locals.totalItems,page)
        return next()
    }).catch( err => {
        return next(err)
    })

    
    
});