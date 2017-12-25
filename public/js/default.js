UPTODATE('2 hours', '/');

var common = {};

// Current page
common.page = '';

// Current form
common.form = '';

$(document).ready(function() {
	NAVIGATION.clientside('.jrouting');

	$(window).on('resize', resizer);
	resizer();

	SETTER(true, 'loading', 'hide', 800);
});


// ROUTE('/', function() {
// 	SET('common.page', 'home');
// });

ROUTE('/flow/', function() {
	SET('common.page', 'flow');
});

ROUTE('/flowboard/', function() {
	SET('common.page', 'flowboard');
});

ROUTE('/', function() {
	SET('common.page', 'dashboard');
});

ROUTE('/devices/', function() {
	SET('common.page', 'devices');
});


ON('location', function(url) {
	url = url.split('/');
	var nav = $('header nav');
	nav.find('.selected').removeClass('selected');
	nav.find('a[href="' + '/' + (url[1] && url[1] + '/' + (url[2] && url[2] + '/')) + '"]').addClass('selected');
});

function resizer() {
	var h = $(window).height();
	var el = $('#body');
	if (el.length) {		
		el.css('min-height', h);
		$('#body>div').css('height', h);
	}
}

function success() {
	var el = $('#success');
	el.show();
	el.addClass('success-animation');
	setTimeout(function() {
		el.removeClass('success-animation');
		setTimeout(function() {
			el.hide();
		}, 1000);
	}, 1500);
	FIND('loading').hide(500);
}

function can(name) {
	return su.roles.length ? su.roles.indexOf(name) !== -1 : true;
}

Tangular.register('price', function(value, format) {
	return currency.format((value || 0).format(format));
});

Tangular.register('join', function(value, delimiter) {
	return value instanceof Array ? value.join(delimiter || ', ') : '';
});

Tangular.register('default', function(value, def) {
	return value == null || value === '' ? def : value;
});

function getSelectionStartNode(context){
	if (!context.getSelection)
		return;
	var node = context.getSelection().anchorNode;
	var startNode = (node.nodeName == '#text' ? node.parentNode : node);
	return startNode;
}

function mainmenu() {
	$('header nav').toggleClass('mainmenu-visible');
}

ON('location', function() {
	$('header nav').removeClass('mainmenu-visible');
});

Tangular.register('time', function(value) {
    var diff = Date.now() - (value instanceof Date ? value : value.parseDate()).getTime();

    var minutes = ((diff / 1000) / 60) >> 0;
    if (minutes < 60) {
        if (minutes < 3)
            return 'now';
        return minutes + ' minutes ago';
    }

    var hours = (minutes / 60) >> 0;
    if (hours < 24)
        return hours + ' ' + Tangular.helpers.pluralize(hours, 'hours', 'hour', 'hours', 'hours') + ' ago';

    var days = (hours / 24) >> 0;
    if (days < 30)
        return days + ' ' + Tangular.helpers.pluralize(days, 'days', 'day', 'days', 'days') + ' ago';

    var months = (days / 29) >> 0;
    if (months < 12)
        return months + ' ' + Tangular.helpers.pluralize(months, 'months', 'month', 'months', 'months') + ' ago';

    var years = (months / 12) >> 0;
    return years + ' ' + Tangular.helpers.pluralize(years, 'years', 'year', 'years', 'years') + ' ago';
});
