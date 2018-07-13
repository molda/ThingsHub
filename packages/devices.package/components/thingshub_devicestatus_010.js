exports.id = 'thingshub_devicestatus';
exports.title = 'Device status';
exports.version = '0.1.0';
exports.group = 'ThingsHub';
exports.color = '#5CB36D';
exports.icon = 'house';
exports.input = true;
exports.output = 3;
exports.author = 'Martin Smola';
exports.options = { parser: 'next(value.flowdata);\n\n/*\nnext({\n\tip: value.data.data.ip,\n\tname: value.get(\'mqtt_wildcard\')[0]\n});\n*/', timeout: 0, offlinetemplate: '// M is object from parser used last time the device reported online status\n{\n\tip: @{M.ip},\n\tname: @{M.name},\n\tstatus: \'offline\'\n}' };

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-3">
			<div data-jc="textbox" data-jc-path="timeout" data-jc-config="placeholder:@(In seconds);type:number;increment:true;align:center">@(Timeout in seconds)</div>
			<div class="help m">@(Offline status will be reported if no data is recieved after timeout. 0 = ignore)</div>
		</div>
		<div class="col-md-3">
			<div data-jc="textbox" data-jc-path="battmin" data-jc-config="placeholder:3.5;type:number;increment:true;align:center">@(Battery empty voltage)</div>
			<div class="help m">@()</div>
		</div>
		<div class="col-md-3">
			<div data-jc="textbox" data-jc-path="battmax" data-jc-config="placeholder:4.2;type:number;increment:true;align:center">@(Battery full voltage)</div>
			<div class="help m">@()</div>
		</div>
	</div>
	<div data-jc="codemirror" data-jc-path="parser" data-jc-config="type:javascript;height:200" class="m">@(Parser)</div>
	<!-- <div class="help">@()</div> -->
</div>`;

exports.readme = `
# Device status
Only useful with ThingsHub. It sends a status of a device to the device page in ThingsHub.

## Outputs
- #1 - device online
- #2 - device offline
- #3 - battery is bellow 10% 
`;

exports.install = function(instance) {

	if (!THINGSHUB || !TH_ADDONS.devices)
		return instance.error('ThingsHub or Device addon not available');

	var fn = null;

	instance.custom.reconfigure = function(o, old_o) {
		if (!instance.options.parser) 
			return instance.status('Not configured', 'red');

		fn = SCRIPT(instance.options.parser);
	};

	instance.on('options', instance.custom.reconfigure);
	instance.custom.reconfigure();

	instance.on('data', function(flowdata){

		fn && fn(flowdata.data, function(err, data){

			if (err)
				return instance.debug('Error in Parser code:\n' + err.toString());

			data.date = new Date();
			data.offline = false;
			data.timeout = (flowdata.data && flowdata.data.timeout) || instance.options.timeout;

			if (data.battery)
				data.battery = battPercent(data.battery);

			TH_ADDONS.devices.online(data);
			instance.send2(0, data);

			if (data.battery && data.battery < 10)
				instance.send2(2, data);
		});	
	});

	function battPercent(val) {
		val = parseFloat(val);
		var inmin = parseFloat(instance.options.battmin || 3.5);
		var inmax = parseFloat(instance.options.battmax || 4.2);
		var outmin = 0;
		var outmax = 100;

		return Math.round(outmin + (outmax - outmin) * (val - inmin) / (inmax - inmin));
	}
};
