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

// 1. Build URI using the Standard Connection format from your screenshot
const user = process.env.MONGO_USER;
const password = encodeURIComponent(process.env.MONGO_PWD);
const dbName = process.env.MONGO_DB;

// This string is built exactly from your second screenshot to bypass DNS SRV issues
const MONGODB_URI = `mongodb://${user}:${password}@ac-qqvvhq4-shard-00-00.jvfuvrn.mongodb.net:27017,ac-qqvvhq4-shard-00-01.jvfuvrn.mongodb.net:27017,ac-qqvvhq4-shard-00-02.jvfuvrn.mongodb.net:27017/${dbName}?ssl=true&replicaSet=atlas-uosj7f-shard-0&authSource=admin&retryWrites=true&w=majority`;

const app = express();

// 2. Initialize Session Store
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
  store: store
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
        return next();
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

// 3. Database Connection
mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Successfully connected to MongoDb via Standard Shard Connection...');
    const port = process.env.PORT || 7000;
    app.listen(port, "0.0.0.0", () => {
      console.log(`Server is live! Listening on port ${port}...`);
    });
  })
  .catch((err) => {
    console.error('CRITICAL DATABASE ERROR:', err.message);
    process.exit(1); 
  });
