exports.install = function() {

	F.websocket('/', websocket, ['authorize', 'json']);
};

function websocket() {
	var self = this;

	self.autodestroy(function() {

		TH.ws = null;
		TH.emit('ws-destroyed');		
	});

	self.on('open', function(client) {

		TH.emit('ws-client', client);
	});

	self.on('message', function(client, message) {

		TH.emit('ws-message', client, message);
	});

	TH.ws = self;

	TH.emit('ws-ready');
}