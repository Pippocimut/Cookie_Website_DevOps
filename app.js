const path = require('path');
const cookieParser = require('cookie-parser');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const flash = require('connect-flash');

const User = require('./models/user');

const s3Helper = require('./util/file-storage');
const multer = require('multer');

const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const dotenv = require('dotenv');

dotenv.config()
const app = express();

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(
  multer({ storage: s3Helper.getImageFileStorage(), fileFilter: fileFilter }).single('image')
);

const store = new MongoDBStore({
  uri: process.env.MONGODB_URI,
  collection: 'sessions'
});

app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);

app.set('view engine', 'ejs');
app.set('views', 'pages/views');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'pages/public')));
app.use('/images',express.static(process.env.IMAGE_URL));

app.use(cookieParser())
app.use(flash());

//All local variables setting up
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.hasError = false,
  res.locals.errorMessage = null,
  res.locals.validationErrors = []
  next();
});

app.use((req, res, next) => {
  
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
      res.locals.isAdmin = user.role === 'admin';
      next();
    })
    .catch(err => {
      next(new Error(err));
    });
});

app.use(shopRoutes);
app.use('/admin', require('./routes/admin'));
app.use(authRoutes);

app.use((req, res, next) => {
  res.status(404).render('404', {
    pageTitle: 'Page Not Found',
    path: '/404'
  });
});

app.use((error, req, res, next) => {
  //Add isLoggedIn later on 
  console.log(error)
  res.status(500).render('500', {
    pageTitle: 'Server Error',
    path: '/500',
    isAuthenticated: null,
    error : error
  });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(result => {
    app.listen(process.env.PORT);
  })
  .catch(err => {
    console.log(err);
  });
