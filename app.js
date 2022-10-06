const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const mongoose = require('mongoose');
const session = require('express-session');
const csrf = require('csurf');
const flash = require('connect-flash');
const errorController = require('./controllers/error');
const User = require('./models/user');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

const MONGODB_URI =
	'mongodb+srv://moatazabdalbaky:EhIinEffQubLk3IB@cluster0.tbhwzun.mongodb.net/shop';

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const MongoDDSession = require('connect-mongodb-session')(session);
const csrfProtuction = csrf();

const store = new MongoDDSession({
	uri: MONGODB_URI,
	collection: 'sessions',
});

const storage = multer.diskStorage({
	destination: function (_, _1, callback) {
		callback(null, 'images');
	},
	filename: function (_, file, callback) {
		callback(null, Date.now().toString() + '-' + file.originalname);
	},
});
const fileFilter = function (req, file, cb) {
	let ext = path.extname(file.originalname);
	if (ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg') {
		req.fileValidationError = 'Forbidden extension';
		return cb(null, false, req.fileValidationError);
	}
	cb(null, true);
};
app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ storage: storage, fileFilter: fileFilter }).single('image'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(
	session({
		secret: 'my secret',
		resave: false,
		saveUninitialized: false,
		store,
	})
);
app.use(csrfProtuction);
app.use((req, res, next) => {
	res.locals.isAuthenticated = req.session.isLoggedIn;
	res.locals.csrfToken = req.csrfToken();
	next();
});
app.use((req, _, next) => {
	if (!req.session.user) {
		return next();
	}
	User.findById(req.session.user._id)
		.then((user) => {
			req.user = user;
			next();
		})
		.catch((err) => next(new Error(err)));
});

app.use(flash());
app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404);

app.use((err, req, res, next) => {
	console.log(err)
	res.render('500', {
		pageTitle: 'Error Occurred!',
		path: '/500',
		isAuthenticated: req.isLoggedIn,
	});
});

mongoose
	.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
	.then(() => {
		app.listen(3000);
	})
	.catch((err) => {
		console.log(err);
	});
