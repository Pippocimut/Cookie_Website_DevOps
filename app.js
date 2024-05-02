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

const imageStorage = s3Helper.getImageFileStorage()

app.use(multer({ storage: imageStorage, fileFilter: fileFilter }).single('image'))

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
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'pages/public')));
app.use('/images',express.static(process.env.IMAGE_URL));

//Not sure what this does, csrf protection and error displaying is something I'll do later
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


//Give request user data if user is logged in
app.use((req, res, next) => {
  res.locals.isAdmin = false;
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


//Routing section
app.use(shopRoutes);
app.use('/admin', require('./routes/admin'));
app.use('/auth',authRoutes);

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

console.log("Trying to start server")
//Start server
mongoose
  .connect(process.env.MONGODB_URI, { useUnifiedTopology: true, useNewUrlParser: true })
  .then(result => {
    console.log("Server started no issue")
    app.listen(process.env.PORT);
  })
  .catch(err => {
    console.log(err);
  });