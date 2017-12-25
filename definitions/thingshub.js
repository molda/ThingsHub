var Fs = require('fs');
global.THINGSHUB = global.TH = {};

global.TH_ADDONS = {};

Object.keys(F.modules).forEach(function(mod){
	var m = MODULE(mod);
	if (m.thingshub)
		TH_ADDONS[m.name] = m;
});

F.helpers.addons = function(){
	return TH_ADDONS;
};

TH.send = function(message) {
	TH.ws && TH.ws.send(message);
};

/*
	Events
*/
TH.$events = {};
TH.on = function(name, fn) {
	if (TH.$events[name])
		TH.$events[name].push(fn);
	else
		TH.$events[name] = [fn];
};

TH.emit = function(name, a, b, c, d, e, f, g) {
	var evt = TH.$events[name];
	if (evt) {
		var clean = false;
		for (var i = 0, length = evt.length; i < length; i++) {
			if (evt[i].$once)
				clean = true;
			evt[i].call(F, a, b, c, d, e, f, g);
		}
		if (clean) {
			evt = evt.remove(n => n.$once);
			if (evt.length)
				TH.$events[name] = evt;
			else
				TH.$events[name] = undefined;
		}
	}
};

TH.once = function(name, fn) {
	fn.$once = true;
	TH.on(name, fn);
};

TH.removeListener = TH.off = function(name, fn) {
	var evt = TH.$events[name];
	if (evt) {
		evt = evt.remove(n => n === fn);
		if (evt.length)
			TH.$events[name] = evt;
		else
			TH.$events[name] = undefined;
	}
};

TH.removeAllListeners = TH.offAll = function(name) {
	if (name)
		TH.$events[name] = undefined;
	else
		TH.$events = {};
};

/*
	WiFi
*/
TH.wifi = {};

TH.wifi.ifaces = function(callback) {
	Exec('ip link show', function(err, response) {
    	if (err)
    		return callback(err);

    	var arr = [];

	    response.parseTerminal(function(line, i) {
	        if (i % 2 == 0)
	            arr.push(line[1].substring(0, line[1].length - 1));
	    });
	    
	    callback(null, arr);
	});
};

TH.wifi.devices = function(iface, callback) {
    Exec('arp -ai {0}'.format(iface || 'wlan0'), function(err, response) {
    	if (err)
    		return callback(err);

    	var arr = [];

        response.parseTerminal(function(line, i) {
            if (line[0] === '?')
                return;

            arr.push({ name: line[0], ip: line[1].substring(1, line[1].length - 1), iface: line[6] });
        });

        callback(null, arr);

        console.log(obj);
    });
};

EMIT('thingshub-ready');