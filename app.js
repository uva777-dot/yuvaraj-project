const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDbSessionStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const errorController = require('./controllers/error');
const User = require('./models/user');
const { forwardError } = require('./utils');

// NEW FORMAT: Standard Connection String to fix the ENOTFOUND DNS error
// Note: We use the shard addresses directly to avoid the +srv lookup failure
const MONGODB_URI = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PWD}@cluster0-shard-00-00.hcscb.mongodb.net:27017,cluster0-shard-00-01.hcscb.mongodb.net:27017,cluster0-shard-00-02.hcscb.mongodb.net:27017/${process.env.MONGO_DB}?ssl=true&replicaSet=atlas-shard-0&authSource=admin&retryWrites=true&w=majority`;

const app = express();
const store = new MongoDbSessionStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});

// Multer configs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.set('view engine', 'ejs');
app.set('views', 'views');

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' }
);

app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: accessLogStream }));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ storage, fileFilter }).single('image'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(session({
  secret: 'my secret',
  resave: false,
  saveUninitialized: false,
  store
}));
app.use(csrf());
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
        next();
      }
      req.user = user;
      next();
    })
    .catch(err => forwardError(err, next));
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use(errorController.get404);
app.use(errorController.get500);

mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Successfully connected to MongoDb...');
    // Use 7000 as default; listen on 0.0.0.0 so the container is accessible
    const port = process.env.PORT || 7000;
    app.listen(port, "0.0.0.0", () => {
      console.log(`Server is live! Listening on port ${port}...`);
    });
  })
  .catch((err) => {
      console.log('CRITICAL: Database connection failed!');
      console.log(err);
  });
