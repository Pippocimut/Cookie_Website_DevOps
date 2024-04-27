const path = require('path');
const cookieParser = require('cookie-parser');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const flash = require('connect-flash');
const User = require('./models/user');
const dotenv = require('dotenv')
const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

dotenv.config()
const app = express();

aws.config.update({
    secretAccessKey: process.env.SECRET_S3_ACCESS_KEY,
    accessKeyId: process.env.S3_ACCESS_KEY,
    region: process.env.REGION
});

const s3 = new aws.S3();

const fileStorage = multerS3({
        s3: s3,
        bucket: process.env.BUCKET_NAME,
        acl: 'public-read',
        metadata: function (req, file, cb) {
            cb(null, {fieldName: file.fieldname});
        },
        key: function (req, file, cb) {
            cb(null, Date.now().toString()+file.originalname)
        }
    });

//Storing the session in the database
const store = new MongoDBStore({
  uri: process.env.MONGODB_URI,
  collection: 'sessions'
});

/* const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname);
  }
}); */

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
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);

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

const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'pages/public')));
app.use('/images',express.static(process.env.IMAGE_URL));

app.use(cookieParser())
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
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
    path: '/404',
    isAuthenticated: req.session.isLoggedIn
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
