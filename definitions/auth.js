// A protection for multiple sign-in
var protection = {};

F.global.users = [];

// Adds an admin account
var sa = CONFIG('total-home-admin').split(':');
F.global.users.push({ name: 'Administrator', login: sa[0], password: sa[1], roles: [], sa: true });

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

	// Checks protection
	if (protection[controller.req.ip] > 10) {
		controller.throw401();
		controller.cancel();
		return;
	}

	var user = F.global.users[controller.req.cookie('__admin')];
	if (user) {
		controller.req.user = user;
		return;
	}

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