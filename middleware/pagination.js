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

  const searchObject = searchFunction(req)
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

function searchFunction(req){
  
  const searchValues = req.body.searchName || req.query.searchName || '';
  const priceRange = req.body.priceRange || req.query.priceRange || '';
  var searchObject = {}

  try{
    const priceRangeArray = priceRange.split('-').map(p=>{
      if (p === "min")
        return -Infinity
      if (p === "max")
        return Infinity
      return parseFloat(p)
    });
    const splitSearchValues = searchValues.split(' ');
    var finalPattern = '';
    splitSearchValues.forEach((value) => {
      finalPattern += `(?=.*\\b${value}\\b)`;
    });

    finalPattern = '^'+finalPattern+'.+';

    const updatetSearchValues = finalPattern
    const searcPattern = new RegExp(updatetSearchValues, 'i');
    if(searchValues !== ''){
      searchObject.title = {'$regex': searcPattern};
    }
    if(priceRangeArray.length === 2){
      searchObject.price = {'$gte': priceRangeArray[0], '$lte': priceRangeArray[1]};
    }
  }
  finally{
    return searchObject
  }

}