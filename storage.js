require('total.js');

var storage = NOSQLSTORAGE('temperature');

// storage.mapreduce('minmax', function(doc, repository) {

//     repository.min = repository.min ? Math.min(repository.min, doc.temperature) : doc.temperature;
//     repository.max = repository.max ? Math.max(repository.max, doc.temperature) : doc.temperature;

// });

for (var i = 0; i < 10000; i++) {
	storage.insert({ temperature: 20 + (i / 10), dt: new Date() });
}

// setTimeout(function(){
// 	for (var i = 0; i < 10; i++) {
// 		storage.insert({ temperature: 20 + (i / 10), dt: new Date() });
// 	}
// }, 5000);
// setTimeout(function(){	
// 	storage.scan('2018', '2019', function(doc, repository) {
// 	    repository.items = repository.items || [];
// 	    repository.items.push(doc);
// 	}, function(err, repository) {
// 	    console.log('Values: ', repository.items);
// 	});

// }, 8000);