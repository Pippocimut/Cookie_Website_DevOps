const fs = require("fs");
const path = require('path');

exports.getIndex = (req, res, next) => {
  res.render('index', {
    pageTitle : 'Shop',
    path : '/'
  });
};

exports.getSecret = (req, res, next) => {
  res.render('secret', {
    pageTitle : 'Secret',
    path : '/secret'
  });
};
