require('total.js');
var Fs = require('fs');

var packageurl = 'https://cdn.rawgit.com/totaljs/{0}/{1}/{0}.package';
var repourl = 'https://api.github.com/repos/totaljs/{0}/commits';
var repos = ['flow', 'flowboard', 'dashboard'];
var packages = [];

F.path.mkdir(F.path.root('packages'));

repos.wait(function(repo, next){

	console.log('Getting version info "{0}" ...'.format(repo));
	U.request(repourl.format(repo), [], {}, function(err, res){

		if (err) {
			console.log('Error occured while getting info on repo: ' + repo + '\n', err);
			console.log('Terminating...bye.');
			return;
		}

		var d = U.parseJSON(res);

		if (d) {
			if (d[0] && d[0].sha)
				packages.push({
					name: repo,
					sha: d[0].sha
				});
		}

		next();

	}, null, {'User-Agent': 'My-total.js-script', 'Accept': 'application/vnd.github.v3+json'});

}, function done(){

	packages.wait(function(package, next){
		console.log('Downloading "{0}" ...'.format(package.name));
		U.request(packageurl.format(package.name, package.sha), [], {}, function(err, res){

			if (err) {
				console.log('Error occured while downloading package: ' + repo + '\n', err);
				console.log('Terminating...bye.');
				return;
			}

			Fs.writeFileSync(F.path.packages(package.name + '.package'), res);

			next();

		}, null, {'User-Agent': 'My-total.js-script'});

	}, createDebug);

});

function createDebug() {
	var contentDebug = `
// ===================================================
// FOR DEVELOPMENT
// Total.js - framework for Node.js platform
// https://www.totaljs.com
// ===================================================
const options = {};
// options.ip = '127.0.0.1';
// options.port = parseInt(process.argv[2]);
// options.config = { name: 'Total.js' };
// options.sleep = 3000;
// options.inspector = 9229;
// options.debugger = 40894;
require('total.js/debug')(options);
	`;

	Fs.writeFileSync(F.path.root('debug.js'), contentDebug);

	var contentProd = `
// ===================================================
// FOR PRODUCTION
// Total.js - framework for Node.js platform
// https://www.totaljs.com
// ===================================================
const options = {};
// options.ip = '127.0.0.1';
// options.port = parseInt(process.argv[2]);
// options.config = { name: 'Total.js' };
// options.sleep = 3000;
require('total.js').http('release', options);
// require('total.js').cluster.http(5, 'release', options);
	`;

	Fs.writeFileSync(F.path.root('release.js'), contentProd);

	console.log('Done!\nRun the app with `node debug.js` or `node release.js`')
};