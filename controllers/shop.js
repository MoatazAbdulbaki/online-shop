const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 1;

exports.getProducts = (req, res) => {
	const page = +req.query.page || 1;
	let totalItems;
	Product.find()
		.countDocuments()
		.then((productsNumber) => {
			totalItems = productsNumber;
			Product.find()
				.skip((page - 1) * ITEMS_PER_PAGE)
				.limit(ITEMS_PER_PAGE)
				.then((products) => {
					res.render('shop/product-list', {
						prods: products,
						pageTitle: 'All Products',
						path: '/products',
						currentPage: page,
						hasNextPage: page * ITEMS_PER_PAGE < totalItems,
						hasPreviousPage: page > 1,
						nextPage: page + 1,
						previousPage: page - 1,
						lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
					});
				});
		})
		.catch((err) => {
			console.log(err);
			next(new Error(err));
		});
};

exports.getProduct = (req, res) => {
	const prodId = req.params.productId;
	Product.findById(prodId)
		.then((product) => {
			res.render('shop/product-detail', {
				product: product,
				pageTitle: product.title,
				path: '/products',
			});
		})
		.catch((err) => next(new Error(err)));
};

exports.getIndex = (req, res) => {
	const page = +req.query.page || 1;
	let totalItems;
	Product.find()
		.countDocuments()
		.then((productsNumber) => {
			totalItems = productsNumber;
			Product.find()
				.skip((page - 1) * ITEMS_PER_PAGE)
				.limit(ITEMS_PER_PAGE)
				.then((products) => {
					res.render('shop/index', {
						prods: products,
						pageTitle: 'Shop',
						path: '/',
						currentPage: page,
						hasNextPage: page * ITEMS_PER_PAGE < totalItems,
						hasPreviousPage: page > 1,
						nextPage: page + 1,
						previousPage: page - 1,
						lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
					});
				});
		})
		.catch((err) => {
			console.log(err);
			next(new Error(err));
		});
};

exports.getCart = (req, res) => {
	req.user
		.populate('cart.items.productId')
		.execPopulate()
		.then((user) => {
			const products = user.cart.items;
			res.render('shop/cart', {
				path: '/cart',
				pageTitle: 'Your Cart',
				products: products,
			});
		})
		.catch((err) => next(new Error(err)));
};

exports.postCart = (req, res) => {
	const prodId = req.body.productId;
	Product.findById(prodId)
		.then((product) => {
			return req.user.addToCart(product);
		})
		.then(() => {
			res.redirect('/cart');
		});
};

exports.postCartDeleteProduct = (req, res) => {
	const prodId = req.body.productId;
	req.user
		.removeFromCart(prodId)
		.then(() => {
			res.redirect('/cart');
		})
		.catch((err) => next(new Error(err)));
};

exports.postOrder = (req, res) => {
	req.user
		.populate('cart.items.productId')
		.execPopulate()
		.then((user) => {
			const products = user.cart.items.map((i) => {
				return { quantity: i.quantity, product: { ...i.productId._doc } };
			});
			const order = new Order({
				user: {
					email: req.user.email,
					userId: req.user,
				},
				products: products,
			});
			return order.save();
		})
		.then(() => {
			return req.user.clearCart();
		})
		.then(() => {
			res.redirect('/orders');
		})
		.catch((err) => next(new Error(err)));
};

exports.getOrders = (req, res) => {
	Order.find({ 'user.userId': req.user._id })
		.then((orders) => {
			res.render('shop/orders', {
				path: '/orders',
				pageTitle: 'Your Orders',
				orders: orders,
			});
		})
		.catch((err) => next(new Error(err)));
};

exports.getInvoice = (req, res, next) => {
	const orderId = req.params.orderId;
	Order.findById(orderId)
		.then((order) => {
			if (!order) {
				console.log('Order Not Found');
				return next(new Error('Order Not Found'));
			}
			if (order.user.userId.toString() !== req.user._id.toString()) {
				console.log('Unauthorized');
				return next(new Error('Unauthorized'));
			}
			const invoiceName = 'order-' + orderId + '.pdf';
			const invoicePath = path.join('data', 'invoices', invoiceName);
			res.setHeader('Content-Type', 'application/pdf');
			res.setHeader(
				'Content-Disposition',
				'attachment;filename="' + invoiceName + '"'
			);
			const pdfDoc = new PDFDocument();
			pdfDoc.pipe(fs.createWriteStream(invoicePath));
			pdfDoc.pipe(res);
			pdfDoc.fontSize(26).text('Invoice', { underline: true });
			pdfDoc.text('========================');
			let totalPrice = 0;
			order.products.map((prod) => {
				pdfDoc
					.fontSize(14)
					.text(
						prod.product.title +
							' (' +
							prod.quantity +
							')    ' +
							'$' +
							prod.product.price
					);
				totalPrice += prod.product.price * prod.quantity;
			});
			pdfDoc.text('------------------------');
			pdfDoc.fontSize(20).text('Total Price: ' + totalPrice.toFixed(2));
			pdfDoc.end();
		})
		.catch((err) => {
			return next(err);
		});
};
