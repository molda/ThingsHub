exports.install = function() {

	F.route('/*', 'index');
	F.route('/test');

	F.route('/login/',		redirect_login, ['post']);
	F.route('/logoff/',		redirect_logoff);
};

// Login
function redirect_login() {
	this.redirect('/');
}

// Logoff
function redirect_logoff() {
	var self = this;
	self.res.cookie('__admin', '', '-1 days');
	self.redirect('/');
}