//exports.id = 'thingshub_devices';
exports.version = '0.1';
exports.title = 'Devices';
exports.name = 'devices';  // url friendly
exports.icon = 'fa-list-alt';
exports.thingshub = true;

var Fs = require('fs');

var filename = F.path.databases('thingshub_devices.json');
var DEVICES = [];

exports.install = function (){

	ON('flow.init', function(){

		U.ls(F.path.packages('devices.package/components'), function(files){
			
			files.forEach(function(file){
				if (!file.endsWith('.js'))
					return;
				var filename = U.getName(file);
				var name = filename.substring(0, filename.length - 7);
				var version = filename.substring(filename.length - 6, filename.length - 3).split('').join('.');

				var comp = FLOW.components[name];
				if (comp && comp.version === version)
					return;
				if (comp && comp.version !== version)
					return console.log('"{0}" v{1} is currently installed! If new version v{2} is higher than the one installed, then please manually remove "{0}" and restart app. This will not be neccesary in future versions.'.format(name, comp.version, version));

				Fs.readFile(file, 'utf8', function(err, body){
					if (err)
						return;

					FLOW.install(name + '.js', body);
				});

			});
		});
	});

	try {
		DEVICES = JSON.parse(Fs.readFileSync(filename).toString('utf8'));
		DEVICES.forEach(d => d.offline = true);
	} catch(e) {
		console.log('DEVICES - parse error:', e.toString());
	}

	F.map('/templates/devices.html', '@devices/devices.html');

	ON('service', function(c){
		if (c % 1 == 0){
			save_devices();
			check_offline();
		}
	});

	ON('thingshub-ready', function(){
		// TH.on('ws-client', function(client) {
		// 	client.send({ addon: exports.name, type: 'devices', page: 1, count: DEVICES.length, pages: 1, limit: 1000, items: DEVICES });
		// });
		TH.on('ws-message', function(client, message) {
			if (message.addon !== exports.name)
				return;

			switch(message.type) {
				case 'devices':
					client.send({ addon: exports.name, type: 'devices', page: 1, count: DEVICES.length, pages: 1, limit: 1000, items: DEVICES });
					break;
				case 'device_remove':
					exports.device_remove(message.name);
					break;					
			};
		});
	});
}

exports.devices = () => DEVICES;

exports.device_remove = function(name) {
	var index = DEVICES.findIndex((item) => item.name === name);
	DEVICES.splice(index, 1)
};

exports.online = function(obj) {

	var index = DEVICES.findIndex((d) => d.name === obj.name);

	if (index < 0){
		DEVICES.push(obj);
	} else {
		var dev = DEVICES[index];
		dev.offline = false;
		dev.date = obj.date;
		dev.timeout = obj.timeout;
	}

	TH.send({ addon: exports.name, type: 'device_status', data: obj });
};

function check_offline() {
	DEVICES.forEach(function(dev){
		if (dev.offline)
			return;
		if (new Date(dev.date).getTime() < (new Date().getTime() - (dev.timeout * 1000))) {
			dev.offline = true;
			var instances = FLOW.findByComponent('thingshub_deviceoffline');
			for (var i = instances.length - 1; i >= 0; i--) {
				instances[i].send2(dev);
			}
			TH.send({ addon: exports.name, type: 'device_status', data: dev });
		}
	});
};

function save_devices() {
	Fs.writeFileSync(filename, JSON.stringify(DEVICES, null, '\t'));
}