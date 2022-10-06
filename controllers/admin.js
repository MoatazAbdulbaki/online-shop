const mongoose = require('mongoose');
const fileHelper = require('../util/file');
const { validationResult } = require('express-validator');

const Product = require('../models/product');

exports.getAddProduct = (req, res) => {
	res.render('admin/edit-product', {
		pageTitle: 'Add Product',
		path: '/admin/add-product',
		editing: false,
		hasError: false,
		errorMessage: null,
		validationErrors: [],
	});
};

exports.postAddProduct = (req, res, next) => {
	const title = req.body.title;
	const image = req.file;
	const price = req.body.price;
	const description = req.body.description;
	const errors = validationResult(req);

	if (!image) {
		return res.status(422).render('admin/add-product', {
			pageTitle: 'Add Product',
			path: '/admin/add-product',
			editing: false,
			hasError: true,
			product: {
				title: title,
				price: price,
				description: description,
			},
			errorMessage: 'This File Is Not An Image!',
			validationErrors: [],
		});
	}
	if (!errors.isEmpty()) {
		return res.status(422).render('admin/add-product', {
			pageTitle: 'Add Product',
			path: '/admin/add-product',
			editing: false,
			hasError: true,
			product: {
				title: title,
				price: price,
				description: description,
			},
			errorMessage: errors.array()[0].msg,
			validationErrors: errors.array(),
		});
	}

	new Product({
		title: title,
		price: price,
		description: description,
		imageUrl: '/' + image.path,
		userId: req.user,
	})
		.save()
		.then(() => {
			res.redirect('/admin/products');
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getEditProduct = (req, res, next) => {
	const editMode = req.query.edit;
	if (!editMode) {
		return res.redirect('/');
	}
	const prodId = req.params.productId;
	Product.findById(prodId)
		.then((product) => {
			if (!product) {
				return res.redirect('/');
			}
			res.render('admin/edit-product', {
				pageTitle: 'Edit Product',
				path: '/admin/edit-product',
				editing: editMode,
				product: product,
				hasError: false,
				errorMessage: null,
				validationErrors: [],
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.postEditProduct = (req, res, next) => {
	const prodId = req.body.productId;
	const updatedTitle = req.body.title;
	const updatedPrice = req.body.price;
	const image = req.file;
	const updatedDesc = req.body.description;

	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		return res.status(422).render('admin/edit-product', {
			pageTitle: 'Edit Product',
			path: '/admin/edit-product',
			editing: true,
			hasError: true,
			product: {
				title: updatedTitle,
				price: updatedPrice,
				description: updatedDesc,
				_id: prodId,
			},
			errorMessage: errors.array()[0].msg,
			validationErrors: errors.array(),
		});
	}

	Product.findById(prodId)
		.then((product) => {
			if (product.userId.toString() !== req.user._id.toString()) {
				return res.redirect('/');
			}
			product.title = updatedTitle;
			product.price = updatedPrice;
			product.description = updatedDesc;
			if (image) {
				fileHelper.deleteFile(product.imageUrl.substring(1));
				product.imageUrl = '/' + image.path;
			}
			return product.save().then(() => {
				res.redirect('/admin/products');
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getProducts = (req, res, next) => {
	Product.find({ userId: req.user._id })
		.then((products) => {
			res.render('admin/products', {
				prods: products,
				pageTitle: 'Admin Products',
				path: '/admin/products',
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.deleteProduct = (req, res, next) => {
	const prodId = req.params.productId;
	Product.findById(prodId)
		.then((product) => {
			if (!product) {
				return next(new Error('Product NOt Found!'));
			}
			fileHelper.deleteFile(product.imageUrl.substring(1))
			Product.deleteOne({ _id: prodId, userId: req.user._id }).then(() => {
				res.status(200).json({massage:"Deleting Success"});
			});
		})
		.catch((err) => {
			res.status(500).json({ massage: 'Deleting Failed' });
		});
};
