const MAX_ITEM_PAGE = 4;
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

module.exports = async function (req,res,next) {

  const page = parseInt(req.query.page) || 1;
  const searchValues = req.body.searchName || req.query.searchName || '';

  const searchObject = searchFunction(searchValues)
  const products = await Product.find(searchObject)
    .countDocuments()
    .then(count => {
      res.locals.totalItems = count;
      return Product.find(searchObject)
      .skip((page-1) * MAX_ITEM_PAGE)
      .limit(MAX_ITEM_PAGE)
    })
  res.locals.products = products
  res.locals.pagination = paginationFunction(res.locals.totalItems,page)
  next()
};

function searchFunction(searchValues){

  const splitSearchValues = searchValues.split(' ');
  var finalPattern = '';
  splitSearchValues.forEach((value) => {
    finalPattern += `(?=.*\\b${value}\\b)`;
  });

  finalPattern = '^'+finalPattern+'.+';

  const updatetSearchValues = finalPattern
  const searcPattern = new RegExp(updatetSearchValues, 'i');
  const searchObject  = searchValues ? {'title': {'$regex': searcPattern}} : {}

  return searchObject
}