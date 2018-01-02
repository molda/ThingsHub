exports.id = 'thingshub_deviceoffline';
exports.title = 'Device offline';
exports.version = '0.1.0';
exports.group = 'ThingsHub';
exports.color = '#5CB36D';
exports.icon = 'house';
exports.input = false;
exports.output = true;
exports.author = 'Martin Smola';
exports.options = {  };

exports.readme = `
# Device offline
Only useful with ThingsHub. It sends offline status of a device.
### Output
When the device goes offline a message is send to output. This can be used to send some notification like email, sms etc.
`;

exports.install = function(instance) {

	if (!THINGSHUB || !TH_ADDONS.devices)
		return instance.error('ThingsHub or Device addon not available');

};