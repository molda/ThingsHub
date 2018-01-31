exports.id = 'thingshub_sensordata';
exports.title = 'Sensor values';
exports.version = '0.1.0';
exports.author = 'Martin Smola';
exports.group = 'ThingsHub';
exports.color = '#5CB36D';
exports.input = true;
exports.output = 1;
exports.options = { fn: '// next(value.temperature);'  };
exports.dashboard = true;
exports.flowboard = true;
exports.readme = `# ThingsHub Sensor values
\`\`\`javascript
// last data
{ 
	value: value,
	dt: new Date()
}

// object stored every hour
{ 
	dt: F.datetime,
	hour: F.datetime.getHours(), 
	values: [...], // array of values
	median: ...,  // median value
	average: ...  // everage value
}

// object send to output
{
  "lastdata": {
    "value": 23.75,
    "dt": "2017-12-02T16:12:45.695Z"
  },
  "cache": [
    {
      "dt": "2017-12-02T16:07:01.751Z",
      "hour": 17,
      "values": [
        23.75,
        23.75,
        23.75,
        25.5
      ],
      "median": 24.25,
      "average": 0
    }
  ]
}
\`\`\`
`;

exports.html = `<div class="padding">
	<div data-jc="textbox" data-jc-path="collection" data-jc-config="placeholder:temp living room;required:true">@(Collection name)</div>
	<div class="help m">@(Collection name is simmilar to table name in SQL. )</div>
	<div data-jc="codemirror" data-jc-path="fn" data-jc-config="type:javascript" class="m">@(Code)</div>
	<div class="row">
		<div class="col-md-3 m">
			<div data-jc="textbox" data-jc-path="format" data-jc-config="placeholder:@(e.g. {0} °C);maxlength:10;align:center">@(Format)</div>
		</div>
		<div class="col-md-3 m">
			<div data-jc="textbox" data-jc-path="decimals" data-jc-config="maxlength:10;align:center;increment:true;type:number">@(Decimals)</div>
		</div>
	</div>
</div>
<script>
	WATCH('settings.thingshub_sensordata.comname', function(path, value, type){
		if (type === 2 && !settings.thingshub_sensordata.collection)
			SET('settings.thingshub_sensordata.collection', value.slug().replace('-', '_'));
	});
	WATCH('settings.thingshub_sensordata.collection', function(path, value, type){
		if (type === 2 && !settings.thingshub_sensordata.collection)
			SET('settings.thingshub_sensordata.collection', value.slug().replace('-', '_'));
	});
</script>`;

const Fs = require('fs');

exports.install = function(instance) {	

	var cachefilename;
	var last24hours;
	var fn = null;

	var dbname = 'th_' + instance.options.collection;
	cachefilename = F.path.databases(dbname + '.cache');

	// keep last day in cache ??
	var cache = [];
	var lastdata = { val: null, dt: null };
	last24hours = {
		values: [],
		format: '',
		decimals: null
	};

	instance.on('close', function() {
		//Fs.unlink(cachefilename, NOOP);
	});

	instance.on('data', function(flowdata) {
		fn && fn(flowdata.data, function(err, value) {
			if (err || value == null)
				return;

			if (typeof(value) !== 'number') {
				value = parseFloat(value);
			}

			if (isNaN(value))
				return;

			var dec = instance.options.decimals || 0;
			value = +value.format(dec);

			lastdata.val = value;
			lastdata.dt = new Date().getTime();
			
			last24hours.values.push(lastdata);
			// last24hours.median = median(last24hours.values);
			// var av = 0;
			// last24hours.values.forEach((v) => av += v);
			// last24hours.average = av / last24hours.values.length;

			var now = new Date().add('-1 day').getTime();
			last24hours.values.remove((item) => item.dt < now);
			
			SENSORDB.insert(instance.options.collection, lastdata);

			instance.dashboard('last24hours', last24hours);
			instance.custom.status();
			instance.send2({ lastdata, last24hours });
		});
	});

	instance.reconfigure = function() {
		var options = instance.options;

		if (!options.collection)
			return instance.status('Not configured', 'red');

		fn = SCRIPT(options.fn);

		last24hours.format = options.format;
		last24hours.decimals = options.decimals;
		last24hours.name = instance.name;

		instance.custom.status();
	};

	instance.on('options', instance.reconfigure);

	instance.on('dashboard', function(type, data) {
		switch (type) {
			case 'last24hours':
				instance.custom.last24hours();
				break;
			case 'query':
				instance.custom.query(data);
				break;
			case 'lastdata':
				instance.dashboard(type, lastdata);
				break;
		}
	});

	instance.custom.last24hours = function() {

		if (!global.DASHBOARD || !global.DASHBOARD.online())
			return;

		instance.dashboard('last24hours', last24hours);
	};

	instance.custom.query = function(filter) {

		if (!global.DASHBOARD || !global.DASHBOARD.online())
			return;

		if (filter === 'lastweek')
			SENSORDB.lastweek(instance.options.collection, function(err, values, count){
				if (err)
					return instance.dashboard('query', { error: err });
				var data = {
					values: values,
					format: instance.options.format || '',
					decimals: instance.options.decimals || ''
				};
				instance.dashboard('query', data);
			});

	};

	instance.custom.status = function() {
		if (!lastdata)
			return instance.status('no data');

		var f = instance.options.format;		
 		instance.status(f ? f.format(lastdata.val) : lastdata.val);
	};

	instance.reconfigure();

	F.on('service', function(c){
		if (c % 60 === 0)	
			Fs.writeFileSync(cachefilename, JSON.stringify(last24hours));
	});
};

function median(values) {
	if (!Array.isArray(values)) {
		return 0;
	}

	if (values.length == 1) {
		return values[0];
	}

	values.sort((a, b) => a - b);

	var half = Math.floor(values.length / 2);

	if (values.length % 2)
		return values[half];
	else
		return (values[half - 1] + values[half]) / 2.0;
}


var SENSORDB = {};
// dbname === 2017_12_temp_living_room.nosql
SENSORDB.insert = function(id, data) {
	var year = F.datetime.getFullYear();
	var month = F.datetime.getMonth() + 1;
	NOSQL('' + year + '_' + month +  '_' + id).insert(data);
};

SENSORDB.lastweek = function(id, callback) {
	var year = F.datetime.getFullYear();
	var month = F.datetime.getMonth() + 1;

	if (new Date().getDate() > 6)
		NOSQL('' + year + '_' + month +  '_' + id)
			.find()
			.where('dt', '>', new Date().add('-6 days'))
			.callback(callback);
	else {
		var sameyear = month - 1 > 0;
		NOSQL('' + (sameyear ? year : year - 1) + '_' + (sameyear ? month - 1 : 12) +  '_' + id)
			.find()
			.where('dt', '>', new Date().add('-6 days'))
			.callback(function(err, valuesprev, countprev){
				if (err)
					return callback(err);

				NOSQL('' + year + '_' + month +  '_' + id)
					.find()
					.callback(function(err, values, count){
						if (err)
							return callback(err);
						callback(null, valuesprev.concat(values), countprev + count);
					});				
			});		
	}
};

SENSORDB.lastmonth = function() {};
SENSORDB.lastyear = function() {};