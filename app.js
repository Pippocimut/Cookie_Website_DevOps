const path = require('path');
const { doubleCsrf } = require("csrf-csrf");
const cookieParser = require('cookie-parser');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const flash = require('connect-flash');
const multer = require('multer');
const errorController = require('./controllers/error');
const User = require('./models/user');
const compression = require('compression');

const MONGODB_URI = process.env.MONGODB_URI

const app = express();

const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});

const { doubleCsrfProtection} = doubleCsrf({
  getSecret: () => "Secret", 
  getTokenFromRequest: (req) => {return req.body._csrf}
});

const fileStorageImages = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    const newFilename = new Date().getMilliseconds()+"-"+file.originalname
    try {
      cb(null, newFilename);
    } catch (error) {
      console.log(error);
    }
  }
});

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
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);


app.set('view engine', 'ejs');
app.set('views', 'pages/views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(compression());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  multer({ storage: fileStorageImages, fileFilter: fileFilter }).single('image')
);
app.use(express.static(path.join(__dirname, 'pages/public')));
app.use('/images',express.static(path.join(__dirname, 'images')));

app.use(cookieParser())
app.use(doubleCsrfProtection);
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
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
      next();
    })
    .catch(err => {
      next(new Error(err));
    });
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
  // res.status(error.httpStatusCode).render(...);
  // res.redirect('/500');
  console.log(error)
  res.status(500).render('500', {
    pageTitle: 'Error!',
    path: '/500',
    isAuthenticated : req.session.isLoggedIn
  });
});

mongoose
  .connect(MONGODB_URI)
  .then(result => {
    app.listen(process.env.PORT || 3000);
  })
  .catch(err => {
    console.log(err);
  });
