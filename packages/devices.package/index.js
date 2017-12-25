exports.id = 'thingshub_devices';
exports.version = '0.1';
exports.title = 'Devices';
exports.name = 'devices';  // url friendly
exports.icon = 'fa-list-alt';
exports.thingshub = true;

var Fs = require('fs');

var filename = F.path.databases('thingshub_devices.json');
var DEVICES = [];

exports.install = function (){

	try {
		DEVICES = JSON.parse(Fs.readFileSync(filename).toString('utf8'));
		// DEVICES.forEach(d => d.status = 'not reported');
	} catch(e) {
		console.log('DEVICES - parse error:', e.toString());
	}

	F.map('/templates/devices.html', '@devices/devices.html');

	ON('service', function(c){
		if (c % 1 == 0)
			save_devices();
	});

	ON('thingshub-ready', function(){

		TH.on('ws-client', function(client) {
			var devs = DEVICES;
			var data = { addon: exports.name, type: 'devices', page: 1, count: devs.length, pages: 1, limit: 1000, items: devs };
			client.send(data);
		});
	});
}

exports.devices = () => DEVICES;

exports.status = function(obj) {
	var changed = false;

	var index = DEVICES.findIndex(function(d){
		return d.name === obj.name;
	});

	obj.last = new Date();

	if (index < 0){
		DEVICES.push(obj);
		save_devices();
	} else {
		var dev = DEVICES[index];
		dev.status = obj.status;
		dev.last = obj.last;
	}

	TH.send({ addon: exports.name, type: 'device', data: obj });
};

function save_devices() {
	Fs.writeFileSync(filename, JSON.stringify(DEVICES, null, '\t'));
}