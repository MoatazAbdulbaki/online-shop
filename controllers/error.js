exports.get404 = (req, res) => {
  res.status(404).render('404', {
    pageTitle: 'Page Not Found',
    path: '/404',
    isAuthenticated: req.isLoggedIn
  });
};

exports.get500 = (req, res) => {
  res.status(500).render('500', {
		pageTitle: 'Error Occurred!',
		path: '/500',
		isAuthenticated: req.isLoggedIn,
	});
};
