require('total.js');

//var db = TABLE('temp', 'val:number|dt:date');
TABLE('temp', 'val:number|dt:date');

// for (var i = 0; i < 100000; i++) {
// 	db.insert({ val: 20 + (i / 10), dt: new Date() });
// }

// console.time('time');
// db.find().where('val', '>', 50019.8).callback(function(err, results, count){
// 	console.timeEnd('time');
// 	console.log('count:', count);
// 	console.log('results:', results);
// });
