if (CONFIG('thingshub-noauth') === true)
	return;

// A protection for multiple sign-in
var protection = {};

F.global.users = [];

// Adds an admin account
var admin = CONFIG('thingshub-admin');
if (admin) {
	var sa = admin.split(':');
	F.global.users.push({ name: 'Administrator', login: sa[0], password: sa[1], roles: [], sa: true });	
}

// Optimized for the performance
var users = {};
for (var i = 0, length = F.global.users.length; i < length; i++) {
	var user = F.global.users[i];
	var key = (user.login + ':' + user.password).hash();
	users[key] = user;
}

F.global.users = users;

// Simple auth for administration
F.on('controller', function(controller, name) {


	if (controller.url === '/token' || controller.url === '/auth')
		return;

	// Checks protection
	if (protection[controller.req.ip] > 10) {
		controller.throw401();
		controller.cancel();
		console.log('auth.js: protection kicked in for ip:', controller.req.ip);
		return;
	}

	var user = F.global.users[controller.req.cookie('__admin')];

	if (user) {
		controller.req.user = user;
		return;
	}

	var apikey = controller.req.headers['ApiKey'];
	if (apikey && apikey === CONFIG('thingshub-apikey'))
		return;

	if (protection[controller.req.ip])
		protection[controller.req.ip]++;
	else
		protection[controller.req.ip] = 1;

	controller.cancel();
	controller.theme('');
	controller.view('login');
});

// Clears blocked IP addreses
F.on('service', function(interval) {
	if (interval % 30 === 0)
		protection = {};
});
