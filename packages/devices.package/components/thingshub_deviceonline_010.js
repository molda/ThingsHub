exports.id = 'thingshub_deviceonline';
exports.title = 'Device online';
exports.version = '0.1.0';
exports.group = 'ThingsHub';
exports.color = '#5CB36D';
exports.icon = 'house';
exports.input = true;
exports.output = true;
exports.author = 'Martin Smola';
exports.options = { parser: 'next(value.flowdata);\n\n/*\nnext({\n\tip: value.data.data.ip,\n\tname: value.get(\'mqtt_wildcard\')[0]\n});\n*/', timeout: 0, offlinetemplate: '// M is object from parser used last time the device reported online status\n{\n\tip: @{M.ip},\n\tname: @{M.name},\n\tstatus: \'offline\'\n}' };

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-4">
			<div data-jc="textbox" data-jc-path="timeout" data-jc-config="placeholder:@(In seconds);type:number;increment:true;align:center">@(Timeout in seconds)</div>
			<div class="help m">@(Offline status will be reported if no data is recieved after timeout. 0 = ignore)</div>
		</div>
	</div>
	<div data-jc="codemirror" data-jc-path="parser" data-jc-config="type:javascript;height:200" class="m">@(Parser)</div>
	<!-- <div class="help">@()</div> -->
</div>`;

exports.readme = `
# Device online
Only useful with ThingsHub. It sends status of a device to the device page in ThingsHub.
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

		fn && fn(flowdata, function(err, data){

			if (err)
				return instance.debug(err, 'error');

			data.date = new Date();
			data.offline = false;
			data.timeout = (flowdata.data && flowdata.data.timeout) || instance.options.timeout;

			TH_ADDONS.devices.online(data);
			instance.send2(data);
		});	
	});
};