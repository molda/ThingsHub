exports.install = function() {

	F.route('/*', 'index');

	F.route('/login/',		redirect_login, ['post']);
	F.route('/logoff/',		redirect_logoff);
}

function redirect_login() {
	this.redirect('/');
}

function redirect_logoff() {
	var self = this;
	self.res.cookie('__admin', '', '-1 days');
	self.redirect('/');
}
