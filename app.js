const cookieParser = require('cookie-parser');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const flash = require('connect-flash');
const cors = require('cors');

const User = require('./models/user');

const s3Helper = require('./util/file-storage');
const multer = require('multer');
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
    name: 'session',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);
//app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json());
app.use('/images',express.static(process.env.IMAGE_URL));

app.use(cors({
  origin: process.env.CORS_ORIGIN, // replace with your client's domain
  methods:['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'], // the HTTP methods allowed
  credentials: true, // allow cookies to be sent with requests
  allowedHeaders: ['Content-Type', 'Authorization'] // the headers that are allowed in requests
}));

//Not sure what this does, csrf protection and error displaying is something I'll do later
app.use(cookieParser())
app.use(flash());

//All local variables setting up
app.use((req, res, next) => {
  
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.hasError = false,
  res.locals.errorMessage = null,
  res.locals.validationErrors = []
  res.locals.isAdmin = false;
  next();
});

//Give request user data if user is logged in
app.use((req, res, next) => {

  if (!req.session.user) {
    console.log("No user session")
    return next();
  }

  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      console.log("user session found")
      req.user = user;
      res.locals.isAdmin = user.role === 'admin';
      next();
    })
    .catch(err => {
      next(new Error(err));
    });
});

//Routing section
app.use(require('./routes/shop'));
app.use('/auth',require('./routes/auth'));
app.use(/* '/admin', */ require('./routes/admin'));

app.use((req, res, next) => {
  console.log("404: Not found")
  res.status(404).json({
    message: 'Item not found'
  });
});


app.use((error, req, res, next) => {

  console.log(error)
  res.status(500).json({
    message: 'Server Error',
    error: error
  });
});


console.log("Server Starting")
//Start server
mongoose
  .connect(process.env.MONGODB_URI, { useUnifiedTopology: true, useNewUrlParser: true })
  .then(result => {
    console.log("Server started no issue")
    app.listen(process.env.WEBSITES_PORT);
  })
  .catch(err => {
    console.log("Error during server start: "+err);
  });