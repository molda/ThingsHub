COMPONENT('exec', function(self, config) {
	self.readonly();
	self.blind();
	self.make = function() {
		self.event('click', config.selector || '.exec', function() {
			var el = $(this);
			var attr = el.attr('data-exec');
			var path = el.attr('data-path');
			attr && EXEC(attr, el);
			path && SET(path, new Function('return ' + el.attr('data-value'))());
		});
	};
});

COMPONENT('error', function(self, config) {

	self.readonly();

	self.make = function() {
		self.aclass('ui-error hidden');
	};

	self.setter = function(value) {

		if (!(value instanceof Array) || !value.length) {
			self.tclass('hidden', true);
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++)
			builder.push('<div><span class="fa {1}"></span>{0}</div>'.format(value[i].error, 'fa-' + (config.icon || 'warning')));

		self.html(builder.join(''));
		self.tclass('hidden', false);
	};
});

COMPONENT('search', 'class:hidden;delay:200;attribute:data-search', function(self, config) {
	self.readonly();
	self.setter = function(value) {

		if (!config.selector || !config.attribute || value == null)
			return;

		KEYPRESS(function() {

			var elements = self.find(config.selector);
			if (!value) {
				elements.rclass(config.class);
				return;
			}

			var search = value.toSearch();
			var hide = [];
			var show = [];

			elements.toArray().waitFor(function(item, next) {
				var el = $(item);
				var val = (el.attr(config.attribute) || '').toSearch();
				if (val.indexOf(search) === -1)
					hide.push(el);
				else
					show.push(el);
				setTimeout(next, 3);
			}, function() {

				hide.forEach(function(item) {
					item.tclass(config.class, true);
				});

				show.forEach(function(item) {
					item.tclass(config.class, false);
				});
			});

		}, config.delay, 'search' + self.id);
	};
});

COMPONENT('binder', function(self) {

	var keys, keys_unique = null;

	self.readonly();
	self.blind();

	self.make = function() {
		self.watch('*', self.autobind);
		self.scan();

		self.on('component', function() {
			setTimeout2(self.id, self.scan, 200);
		});

		self.on('destroy', function() {
			setTimeout2(self.id, self.scan, 200);
		});
	};

	self.autobind = function(path) {
		var mapper = keys[path];
		var template = {};
		mapper && mapper.forEach(function(item) {
			var value = self.get(item.path);
			template.value = value;
			item.classes && classes(item.element, item.classes(value));
			item.visible && item.element.tclass('hidden', item.visible(value) ? false : true);
			item.html && item.element.html(item.html(value));
			item.template && item.element.html(item.template(template));
		});
	};

	function classes(element, val) {
		var add = '';
		var rem = '';
		val.split(' ').forEach(function(item) {
			switch (item.substring(0, 1)) {
				case '+':
					add += (add ? ' ' : '') + item.substring(1);
					break;
				case '-':
					rem += (rem ? ' ' : '') + item.substring(1);
					break;
				default:
					add += (add ? ' ' : '') + item;
					break;
			}
		});
		rem && element.rclass(rem);
		add && element.aclass(add);
	}

	function decode(val) {
		return val.replace(/\&\#39;/g, '\'');
	}

	self.scan = function() {
		keys = {};
		keys_unique = {};
		self.find('[data-b]').each(function() {

			var el = $(this);
			var path = el.attr('data-b');
			var arr = path.split('.');
			var p = '';

			var classes = el.attr('data-b-class');
			var html = el.attr('data-b-html');
			var visible = el.attr('data-b-visible');
			var obj = el.data('data-b');

			keys_unique[path] = true;

			if (!obj) {
				obj = {};
				obj.path = path;
				obj.element = el;
				obj.classes = classes ? FN(decode(classes)) : undefined;
				obj.html = html ? FN(decode(html)) : undefined;
				obj.visible = visible ? FN(decode(visible)) : undefined;

				if (obj.html) {
					var tmp = el.find('script[type="text/html"]');
					var str = '';
					if (tmp.length)
						str = tmp.html();
					else
						str = el.html();

					if (str.indexOf('{{') !== -1) {
						obj.template = Tangular.compile(str);
						tmp.length && tmp.remove();
					}
				}

				el.data('data-b', obj);
			}

			for (var i = 0, length = arr.length; i < length; i++) {
				p += (p ? '.' : '') + arr[i];
				if (keys[p])
					keys[p].push(obj);
				else
					keys[p] = [obj];
			}

		});

		Object.keys(keys_unique).forEach(function(key) {
			self.autobind(key, self.get(key));
		});

		return self;
	};

});

COMPONENT('confirm', function(self) {

	var is = false;
	var visible = false;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.aclass('ui-confirm hidden', true);
		self.event('click', 'button', function() {
			self.hide($(this).attr('data-index').parseInt());
		});

		self.event('click', function(e) {
			var t = e.target.tagName;
			if (t !== 'BUTTON')
				return;
			var el = self.find('.ui-confirm-body');
			el.aclass('ui-confirm-click');
			setTimeout(function() {
				el.removeClass('ui-confirm-click');
			}, 300);
		});

		$(window).on('keydown', function(e) {
			if (!visible)
				return;
			var index = e.keyCode === 13 ? 0 : e.keyCode === 27 ? 1 : null;
			if (index != null) {
				self.find('button[data-index="{0}"]'.format(index)).trigger('click');
				e.preventDefault();
			}
		});
	};

	self.confirm = function(message, buttons, fn) {
		self.callback = fn;

		var builder = [];

		buttons.forEach(function(item, index) {
			builder.push('<button data-index="{1}">{0}</button>'.format(item, index));
		});

		self.content('ui-confirm-warning', '<div class="ui-confirm-message">{0}</div>{1}'.format(message.replace(/\n/g, '<br />'), builder.join('')));
	};

	self.hide = function(index) {
		self.callback && self.callback(index);
		self.rclass('ui-confirm-visible');
		setTimeout2(self.id, function() {
			visible = false;
			self.aclass('hidden');
		}, 1000);
	};

	self.content = function(cls, text) {
		!is && self.html('<div><div class="ui-confirm-body"></div></div>');
		self.find('.ui-confirm-body').empty().append(text);
		self.rclass('hidden');
		setTimeout2(self.id, function() {
			visible = true;
			self.aclass('ui-confirm-visible');
		}, 5);
	};
});

COMPONENT('form', function(self, config) {

	var W = window;
	var header = null;
	var csspos = {};

	if (!W.$$form) {
		W.$$form_level = W.$$form_level || 1;
		W.$$form = true;
		$(document).on('click', '.ui-form-button-close', function() {
			SET($(this).attr('data-path'), '');
			W.$$form_level--;
		});

		$(window).on('resize', function() {
			SETTER('form', 'resize');
		});

		$(document).on('click', '.ui-form-container', function(e) {
			var el = $(e.target);
			if (!(el.hclass('ui-form-container-padding') || el.hclass('ui-form-container')))
				return;
			var form = $(this).find('.ui-form');
			var cls = 'ui-form-animate-click';
			form.aclass(cls);
			setTimeout(function() {
				form.rclass(cls);
			}, 300);
		});
	}

	self.readonly();
	self.submit = function() {
		if (config.submit)
			EXEC(config.submit, self);
		else
			self.hide();
	};

	self.cancel = function() {
		config.cancel && EXEC(config.cancel, self);
		self.hide();
	};

	self.hide = function() {
		self.set('');
	};

	self.resize = function() {
		if (!config.center || self.hclass('hidden'))
			return;
		var ui = self.find('.ui-form');
		var fh = ui.innerHeight();
		var wh = $(W).height();
		var r = (wh / 2) - (fh / 2);
		csspos.marginTop = (r > 30 ? (r - 15) : 20) + 'px';
		ui.css(csspos);
	};

	self.make = function() {

		var icon;

		if (config.icon)
			icon = '<i class="fa fa-{0}"></i>'.format(config.icon);
		else
			icon = '<i></i>';

		$(document.body).append('<div id="{0}" class="hidden ui-form-container"><div class="ui-form-container-padding"><div class="ui-form" style="max-width:{1}"><div class="ui-form-title"><button class="ui-form-button-close" data-path="{2}"><i class="fa fa-times"></i></button>{4}<span>{3}</span></div></div></div>'.format(self._id, (config.width || 800) + 'px', self.path, config.title, icon));

		var el = $('#' + self._id);
		el.find('.ui-form').get(0).appendChild(self.element.get(0));
		self.rclass('hidden');
		self.replace(el);

		header = self.virtualize({ title: '.ui-form-title > span', icon: '.ui-form-title > i' });

		self.event('scroll', function() {
			EMIT('reflow', self.name);
		});

		self.find('button').on('click', function() {
			W.$$form_level--;
			switch (this.name) {
				case 'submit':
					self.submit(self.hide);
					break;
				case 'cancel':
					!this.disabled && self[this.name](self.hide);
					break;
			}
		});

		config.enter && self.event('keydown', 'input', function(e) {
			e.which === 13 && !self.find('button[name="submit"]').get(0).disabled && self.submit(self.hide);
		});
	};

	self.configure = function(key, value, init, prev) {
		if (init)
			return;
		switch (key) {
			case 'icon':
				header.icon.rclass(header.icon.attr('class'));
				value && header.icon.aclass('fa fa-' + value);
				break;
			case 'title':
				header.title.html(value);
				break;
			case 'width':
				value !== prev && self.find('.ui-form').css('max-width', value + 'px');
				break;
		}
	};

	self.setter = function(value) {

		setTimeout2('noscroll', function() {
			$('html').tclass('noscroll', $('.ui-form-container').not('.hidden').length ? true : false);
		}, 50);

		var isHidden = value !== config.if;

		self.toggle('hidden', isHidden);

		setTimeout2('formreflow', function() {
			EMIT('reflow', self.name);
		}, 10);

		if (isHidden) {
			self.release(true);
			self.find('.ui-form').rclass('ui-form-animate');
			return;
		}

		self.resize();
		self.release(false);

		config.reload && EXEC(config.reload, self);

		if (!isMOBILE && config.autofocus) {
			var el = self.find(config.autofocus === true ? 'input[type="text"],select,textarea' : config.autofocus);
			el.length && el.eq(0).focus();
		}

		if (W.$$form_level < 1)
			W.$$form_level = 1;

		W.$$form_level++;
		self.css('z-index', W.$$form_level * 10);
		self.element.scrollTop(0);

		setTimeout(function() {
			self.find('.ui-form').aclass('ui-form-animate');
		}, 300);

		// Fixes a problem with freezing of scrolling in Chrome
		setTimeout2(self.id, function() {
			self.css('z-index', (W.$$form_level * 10) + 1);
		}, 1000);
	};
});

COMPONENT('loading', function(self) {
	var pointer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.aclass('ui-loading');
		self.append('<div></div>');
	};

	self.show = function() {
		clearTimeout(pointer);
		self.rclass('hidden');
		return self;
	};

	self.hide = function(timeout) {
		clearTimeout(pointer);
		pointer = setTimeout(function() {
			self.aclass('hidden');
		}, timeout || 1);
		return self;
	};
});

COMPONENT('repeater', function(self) {

	var filter = null;
	var recompile = false;
	var reg = /\$(index|path)/g;

	self.readonly();

	self.configure = function(key, value) {
		if (key === 'filter')
			filter = value ? GET(value) : null;
	};

	self.make = function() {
		var element = self.find('script');

		if (!element.length) {
			element = self.element;
			self.element = self.element.parent();
		}

		var html = element.html();
		element.remove();
		self.template = Tangular.compile(html);
		recompile = html.indexOf('data-jc="') !== -1;
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			self.empty();
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i];
			item.index = i;
			if (!filter || filter(item)) {
				builder.push(self.template(item).replace(reg, function(text) {
					return text.substring(0, 2) === '$i' ? i.toString() : self.path + '[' + i + ']';
				}));
			}
		}

		self.html(builder.join(''));
		recompile && self.compile();
	};
});

COMPONENT('repeater-group', function(self, config) {

	var html, template_group = null;
	var reg = /\$(index|path)/g;
	var force = false;

	self.readonly();

	self.released = function(is) {
		if (is) {
			html = self.html();
			self.empty();
		} else
			html && self.html(html);
	};

	self.make = function() {
		self.find('script').each(function(index) {
			var element = $(this);
			var html = element.html();
			element.remove();
			if (index)
				template_group = Tangular.compile(html);
			else
				self.template = Tangular.compile(html);
		});
	};

	self.configure = function(key, value, init) {
		if (init)
			return;
		if (key === 'group') {
			force = true;
			self.refresh();
		}
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			self.empty();
			return;
		}

		if (!force && NOTMODIFIED(self.id, value))
			return;

		force = false;
		html = '';
		var length = value.length;
		var groups = {};

		for (var i = 0; i < length; i++) {
			var name = value[i][config.group] || '0';
			if (groups[name])
				groups[name].push(value[i]);
			else
				groups[name] = [value[i]];
		}

		var index = 0;
		var indexgroup = 0;
		var builder = '';
		var keys = Object.keys(groups);

		keys.quicksort();
		keys.forEach(function(key) {
			var arr = groups[key];
			var tmp = '';

			for (var i = 0, length = arr.length; i < length; i++) {
				var item = arr[i];
				item.index = index++;
				tmp += self.template(item).replace(reg, function(text) {
					return text.substring(0, 2) === '$i' ? index.toString() : self.path + '[' + index + ']';
				});
			}

			if (key !== '0') {
				var options = {};
				options[config.group] = key;
				options.length = arr.length;
				options.index = indexgroup++;
				options.body = tmp;
				builder += template_group(options);
			}

		});

		self.html(builder);
	};
});

COMPONENT('textbox', function(self, config) {

	var input, container, content = null;

	self.validate = function(value) {

		if (!config.required || config.disabled)
			return true;

		if (self.type === 'date')
			return value instanceof Date && !isNaN(value.getTime());

		if (value == null)
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);

		switch (self.type) {
			case 'email':
				return value.isEmail();
			case 'url':
				return value.isURL();
			case 'currency':
			case 'number':
				return value > 0;
		}

		return config.validation ? self.evaluate(value, config.validation, true) ? true : false : value.length > 0;
	};

	self.make = function() {

		content = self.html();

		self.type = config.type;
		self.format = config.format;

		self.event('click', '.fa-calendar', function(e) {
			if (config.disabled)
				return;
			if (config.type === 'date') {
				e.preventDefault();
				window.$calendar && window.$calendar.toggle(self.element, self.find('input').val(), function(date) {
					self.set(date);
				});
			}
		});

		self.event('click', '.fa-caret-up,.fa-caret-down', function() {
			if (config.disabled)
				return;
			if (config.increment) {
				var el = $(this);
				var inc = el.hasClass('fa-caret-up') ? 1 : -1;
				self.change(true);
				self.inc(inc);
			}
		});

		self.event('click', '.ui-textbox-control-icon', function() {
			if (config.disabled)
				return;
			if (self.type === 'search') {
				self.$stateremoved = false;
				$(this).rclass('fa-times').aclass('fa-search');
				self.set('');
			}
		});

		self.redraw();
	};

	self.redraw = function() {

		var attrs = [];
		var builder = [];
		var tmp;

		if (config.type === 'password')
			tmp = 'password';
		else
			tmp = 'text';

		console.log('CONFIG', config);

		self.tclass('ui-disabled', config.disabled === true);
		self.type = config.type;
		attrs.attr('type', tmp);
		config.placeholder && attrs.attr('placeholder', config.placeholder);
		config.maxlength && attrs.attr('maxlength', config.maxlength);
		config.keypress != null && attrs.attr('data-jc-keypress', config.keypress);
		config.delay && attrs.attr('data-jc-keypress-delay', config.delay);
		config.disabled && attrs.attr('disabled');
		config.error && attrs.attr('error');
		attrs.attr('data-jc-bind', '');

		config.autofill && attrs.attr('name', config.autofill) && attrs.attr('autocomplete', config.autofill);
		config.align && attrs.attr('class', 'ui-' + config.align);
		config.autofocus && attrs.attr('autofocus');

		builder.push('<input {0} />'.format(attrs.join(' ')));

		var icon = config.icon;
		var icon2 = config.icon2;

		if (!icon2 && self.type === 'date')
			icon2 = 'calendar';
		else if (self.type === 'search') {
			icon2 = 'search ui-textbox-control-icon';
			self.setter2 = function(value) {
				if (self.$stateremoved && !value)
					return;
				self.$stateremoved = value ? false : true;
				self.find('.ui-textbox-control-icon').tclass('fa-times', value ? true : false).tclass('fa-search', value ? false : true);
			};
		}

		icon2 && builder.push('<div><span class="fa fa-{0}"></span></div>'.format(icon2));
		config.increment && !icon2 && builder.push('<div><span class="fa fa-caret-up"></span><span class="fa fa-caret-down"></span></div>');

		if (config.label)
			content = config.label;

		if (content.length) {
			var html = builder.join('');
			builder = [];
			builder.push('<div class="ui-textbox-label{0}">'.format(config.required ? ' ui-textbox-label-required' : ''));
			icon && builder.push('<span class="fa fa-{0}"></span> '.format(icon));
			builder.push(content);
			builder.push(':</div><div class="ui-textbox">{0}</div>'.format(html));
			config.error && builder.push('<div class="ui-textbox-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));
			self.html(builder.join(''));
			self.aclass('ui-textbox-container');
			input = self.find('input');
			container = self.find('.ui-textbox');
		} else {
			config.error && builder.push('<div class="ui-textbox-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));
			self.aclass('ui-textbox ui-textbox-container');
			self.html(builder.join(''));
			input = self.find('input');
			container = self.element;
		}
	};

	self.configure = function(key, value, init) {

		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.find('input').prop('disabled', value);
				break;
			case 'format':
				self.format = value;
				self.refresh();
				break;
			case 'required':
				self.noValid(!value);
				!value && self.state(1, 1);
				self.find('.ui-textbox-label').tclass('ui-textbox-label-required', value);
				break;
			case 'placeholder':
				input.prop('placeholder', value || '');
				break;
			case 'maxlength':
				input.prop('maxlength', value || 1000);
				break;
			case 'autofill':
				input.prop('name', value ? self.path.replace(/\./g, '_') : '');
				break;
			case 'label':
				content = value;
				redraw = true;
				break;
			case 'type':
				self.type = value;
				if (value === 'password')
					value = 'password';
				else
					self.type = 'text';
				redraw = true;
				break;
			case 'align':
				input.rclass(input.attr('class')).aclass('ui-' + value || 'left');
				break;
			case 'autofocus':
				input.focus();
				break;
			case 'icon':
			case 'icon2':
			case 'increment':
				redraw = true;
				break;
		}

		redraw && setTimeout2('redraw.' + self.id, function() {
			self.redraw();
			self.refresh();
		}, 100);
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.tclass('ui-textbox-invalid', invalid);
		config.error && self.find('.ui-box-helper').tclass('ui-box-helper-show', invalid);
	};
});

COMPONENT('importer', function(self, config) {

	var imported = false;

	self.readonly();
	self.setter = function() {

		if (!self.evaluate(config.if))
			return;

		if (imported) {
			if (config.reload)
				EXEC(config.reload);
			else
				self.setter = null;
			return;
		}

		imported = true;
		IMPORT(config.url, function() {
			if (config.reload)
				EXEC(config.reload);
			else
				self.remove();
		});
	};
});

COMPONENT('visible', function(self, config) {
	var processed, is = false;
	var old = null;

	self.readonly();
	self.setter = function(value) {

		var condition = config.if;

		if (condition)
			is = self.evaluate(condition);
		else
			is = value ? true : false;

		if (old === is)
			return;

		if (is && config.template && !processed) {
			self.import(config.template, NOOP, false);
			processed = true;
		}

		self.tclass('hidden', !is);
		old = is;
	};
});

COMPONENT('validation', function(self, config) {

	var path, elements = null;

	self.readonly();

	self.make = function() {
		!config.selector && (elements = self.find('button'));
		path = self.path.replace(/\.\*$/, '');
		setTimeout(function() {
			self.watch(self.path, self.state, true);
		}, 50);
	};

	self.configure = function(key, value) {
		switch (key) {
			case 'selector':
				elements = self.find(value || 'button');
				break;
		}
	};

	self.state = function() {
		var disabled = MAIN.disabled(path);
		if (!disabled && config.if)
			disabled = !EVALUATE(self.path, config.if);
		elements.prop('disabled', disabled);
	};
});

COMPONENT('websocket', 'reconnect:2000', function(self, config) {

	var ws, url;
	var queue = [];
	var sending = false;

	self.online = false;
	self.readonly();

	self.make = function() {
		url = config.url || '';
		if (!url.match(/^(ws|wss)\:\/\//))
			url = (location.protocol.length === 6 ? 'wss' : 'ws') + '://' + location.host + (url.substring(0, 1) !== '/' ? '/' : '') + url;
		setTimeout(self.connect, 500);
		self.destroy = self.close;
	};

	self.send = function(obj) {
		queue.push(encodeURIComponent(JSON.stringify(obj)));
		self.process();
		return self;
	};

	self.process = function(callback) {

		if (!ws || sending || !queue.length || ws.readyState !== 1) {
			callback && callback();
			return;
		}

		sending = true;
		var async = queue.splice(0, 3);
		async.waitFor(function(item, next) {
			ws.send(item);
			setTimeout(next, 5);
		}, function() {
			callback && callback();
			sending = false;
			queue.length && self.process();
		});
	};

	self.close = function(isClosed) {
		if (!ws)
			return self;
		self.online = false;
		ws.onopen = ws.onclose = ws.onmessage = null;
		!isClosed && ws.close();
		ws = null;
		EMIT('online', false);
		return self;
	};

	function onClose() {
		self.close(true);
		setTimeout(self.connect, config.reconnect);
	}

	function onMessage(e) {
		var data;
		try {
			data = PARSE(decodeURIComponent(e.data));
			self.attrd('jc-path') && self.set(data);
		} catch (e) {
			WARN('WebSocket "{0}": {1}'.format(url, e.toString()));
		}
		data && EMIT('message', data);
	}

	function onOpen() {
		self.online = true;
		self.process(function() {
			EMIT('online', true);
		});
	}

	self.connect = function() {
		ws && self.close();
		setTimeout2(self.id, function() {
			ws = new WebSocket(url);
			ws.onopen = onOpen;
			ws.onclose = onClose;
			ws.onmessage = onMessage;
		}, 100);
		return self;
	};
});

COMPONENT('checkbox', function(self, config) {

	self.validate = function(value) {
		return (config.disabled || !config.required) ? true : (value === true || value === 'true' || value === 'on');
	};

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'label':
				self.find('span').html(value);
				break;
			case 'required':
				self.find('span').tclass('ui-checkbox-label-required', value);
				break;
			case 'disabled':
				self.tclass('ui-disabled', value);
				break;
			case 'checkicon':
				self.find('i').rclass().aclass('fa fa-' + value);
				break;
		}
	};

	self.make = function() {
		self.aclass('ui-checkbox');
		self.html('<div><i class="fa fa-{2}"></i></div><span{1}>{0}</span>'.format(config.label || self.html(), config.required ? ' class="ui-checkbox-label-required"' : '', config.checkicon || 'check'));
		self.event('click', function() {
			if (config.disabled)
				return;
			self.dirty(false);
			self.getter(!self.get(), 2, true);
		});
	};

	self.setter = function(value) {
		self.toggle('ui-checkbox-checked', value ? true : false);
	};
});

COMPONENT('checkboxlist', 'checkicon:check', function(self, config) {

	var W = window;
	!W.$checkboxlist && (W.$checkboxlist = Tangular.compile('<div{{ if $.class }} class="{{ $.class }}"{{ fi }}><div class="ui-checkboxlist-item" data-index="{{ index }}"><div><i class="fa fa-{{ $.checkicon }}"></i></div><span>{{ text }}</span></div></div>'));

	var template = W.$checkboxlist;
	var container, data, datasource, content, dataold, render = null;

	self.validate = function(value) {
		return config.disabled || !config.required ? true : value && value.length > 0;
	};

	self.configure = function(key, value, init) {

		if (init)
			return;

		var redraw = false;

		switch (key) {

			case 'type':
				self.type = value;
				break;

			case 'checkicon':
				self.find('i').rclass().aclass('fa fa-' + value);
				break;

			case 'disabled':
				self.tclass('ui-disabled', value);
				break;

			case 'datasource':
				var was = datasource;
				was && self.unwatch(datasource, self.bind);
				self.watch(value, self.bind, true);
				was && self.refresh();
				datasource = value;
				break;

			case 'icon':
				if (!self.find('.ui-checkboxlist-label').find('i').rclass().aclass('fa fa-' + value).length)
					redraw = true;
				break;

			case 'required':
				self.find('.ui-checkboxlist-label').tclass('ui-checkboxlist-required', value);
				self.state(1, 1);
				break;

			case 'label':
				redraw = true;
				break;

			case 'items':

				if (value instanceof Array) {
					self.bind('', value);
					return;
				}

				var items = [];
				value.split(',').forEach(function(item) {
					item = item.trim().split('|');
					var val = (item[1] == null ? item[0] : item[1]).trim();
					if (config.type === 'number')
						val = +val;
					items.push({ name: item[0].trim(), id: val });
				});

				self.bind('', items);
				self.refresh();
				break;
		}

		redraw && setTimeout2(self.id + '.redraw', function() {
			self.redraw();
			self.bind('', dataold);
			self.refresh();
		}, 100);
	};

	self.make = function() {

		self.aclass('ui-checkboxlist');
		content = self.html();
		config.type && (self.type = config.type);
		self.redraw();

		if (config.items)
			self.reconfigure({ items: config.items });
		else if (config.datasource)
			self.reconfigure({ datasource: config.datasource });
		else
			self.bind('', null);

		self.event('click', '.ui-checkboxlist-item', function(e) {

			e.stopPropagation();

			if (config.disabled)
				return;

			var el = $(this);
			var is = !el.hasClass('ui-checkboxlist-checked');
			var index = +el.attr('data-index');
			var value = data[index];

			if (value == null)
				return;

			value = value.value;

			var arr = self.get();
			if (!(arr instanceof Array))
				arr = [];

			var index = arr.indexOf(value);

			if (is) {
				index === -1 && arr.push(value);
			} else {
				index !== -1 && arr.splice(index, 1);
			}

			self.reset(true);
			self.set(arr, undefined, 2);
		});
	};

	self.redraw = function() {
		var label = config.label || content;
		self.html((label ? '<div class="ui-checkboxlist-label{1}">{2}{0}</div>'.format(label, config.required ? ' ui-checkboxlist-required' : '', config.icon ? '<i class="fa fa-{0}"></i>'.format(config.icon) : '') : '') + '<div class="ui-checkboxlist-container"></div>');
		container = self.find('.ui-checkboxlist-container');
	};

	self.selectall = function() {

		if (config.disabled)
			return;

		var arr = [];
		var inputs = self.find('.ui-checkboxlist-item');
		var value = self.get();

		self.change(true);

		if (value && inputs.length === value.length) {
			self.set(arr);
			return;
		}

		inputs.each(function() {
			var el = $(this);
			arr.push(self.parser(data[+el.attr('data-index')].value));
		});

		self.set(arr);
	};

	self.bind = function(path, value) {

		if (!value)
			return;

		var kv = config.value || 'id';
		var kt = config.text || 'name';

		render = '';
		data = [];
		dataold = value;

		for (var i = 0, length = value.length; i < length; i++) {
			var isString = typeof(value[i]) === 'string';
			var item = { value: isString ? value[i] : value[i][kv], text: isString ? value[i] : value[i][kt], index: i };
			render += template(item, config);
			data.push(item);
		}

		if (render)
			container.html(render);
		else
			container.html(config.empty);
	};

	self.setter = function(value) {
		container.find('.ui-checkboxlist-item').each(function() {
			var el = $(this);
			var index = +el.attr('data-index');
			var checked = false;
			if (!value || !value.length)
				checked = false;
			else if (data[index])
				checked = data[index];
			checked && (checked = value.indexOf(checked.value) !== -1);
			el.tclass('ui-checkboxlist-checked', checked);
		});
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.find('.ui-checkboxlist').tclass('ui-checkboxlist-invalid', invalid);
	};
});

COMPONENT('dropdowncheckbox', 'checkicon:check', function(self, config) {

	var data = [], render = '';
	var container, values, content, datasource = null;
	var prepared = false;
	var W = window;

	!W.$dropdowncheckboxtemplate && (W.$dropdowncheckboxtemplate = Tangular.compile('<div class="ui-dropdowncheckbox-item" data-index="{{ index }}"><div><i class="fa fa-{{ $.checkicon }}"></i></div><span>{{ text }}</span></div>'));
	var template = W.$dropdowncheckboxtemplate;

	self.validate = function(value) {
		return config.disabled || !config.required ? true : value && value.length > 0;
	};

	self.configure = function(key, value, init) {

		if (init)
			return;

		var redraw = false;

		switch (key) {

			case 'type':
				self.type = value;
				break;

			case 'required':
				self.find('.ui-dropdowncheckbox-label').tclass('ui-dropdowncheckbox-required', config.required);
				break;

			case 'label':
				content = value;
				redraw = true;
				break;

			case 'disabled':
				self.tclass('ui-disabled', value);
				break;

			case 'checkicon':
				self.find('i').rclass().aclass('fa fa-' + value);
				break;

			case 'icon':
				redraw = true;
				break;

			case 'datasource':
				var was = datasource;
				was && self.unwatch(datasource, self.bind);
				self.watch(value, self.bind, true);
				was && self.refresh();
				datasource = value;
				break;

			case 'items':

				if (value instanceof Array) {
					self.bind('', value);
					return;
				}

				var items = [];
				value.split(',').forEach(function(item) {
					item = item.trim().split('|');
					var val = (item[1] == null ? item[0] : item[1]).trim();
					if (config.type === 'number')
						val = +val;
					items.push({ name: item[0].trim(), id: val });
				});

				self.bind('', items);
				self.refresh();
				break;
		}

		redraw && setTimeout2(self.id + '.redraw', self.redraw, 100);
	};

	self.redraw = function() {

		var html = '<div class="ui-dropdowncheckbox"><span class="fa fa-sort"></span><div class="ui-dropdowncheckbox-selected"></div></div><div class="ui-dropdowncheckbox-values hidden">{0}</div>'.format(render);
		if (content.length)
			self.html('<div class="ui-dropdowncheckbox-label{0}">{1}{2}:</div>'.format(config.required ? ' ui-dropdowncheckbox-required' : '', config.icon ? ('<i class="fa fa-' + config.icon + '"></i>') : '', content) + html);
		else
			self.html(html);

		container = self.find('.ui-dropdowncheckbox-values');
		values = self.find('.ui-dropdowncheckbox-selected');
		prepared && self.refresh();
		self.tclass('ui-disabled', config.disabled === true);
	};

	self.make = function() {

		self.type = config.type;

		content = self.html();
		self.aclass('ui-dropdowncheckbox-container');
		self.redraw();

		if (config.items)
			self.reconfigure({ items: config.items });
		else if (config.datasource)
			self.reconfigure({ datasource: config.datasource });
		else
			self.bind('', null);

		self.event('click', '.ui-dropdowncheckbox', function(e) {

			if (config.disabled)
				return;

			container.tclass('hidden');

			if (W.$dropdowncheckboxelement) {
				W.$dropdowncheckboxelement.aclass('hidden');
				W.$dropdowncheckboxelement = null;
			}

			!container.hasClass('hidden') && (W.$dropdowncheckboxelement = container);
			e.stopPropagation();
		});

		self.event('click', '.ui-dropdowncheckbox-item', function(e) {

			e.stopPropagation();

			if (config.disabled)
				return;

			var el = $(this);
			var is = !el.hasClass('ui-dropdowncheckbox-checked');
			var index = +el.attr('data-index');
			var value = data[index];

			if (value === undefined)
				return;

			value = value.value;

			var arr = self.get();

			if (!(arr instanceof Array))
				arr = [];

			var index = arr.indexOf(value);

			if (is) {
				index === -1 && arr.push(value);
			} else {
				index !== -1 && arr.splice(index, 1);
			}

			self.reset(true);
			self.set(arr, undefined, 2);
		});
	};

	self.bind = function(path, value) {
		var clsempty = 'ui-dropdowncheckbox-values-empty';
		prepared = true;

		if (!value) {
			container.aclass(clsempty).html(config.empty);
			return;
		}

		var kv = config.value || 'id';
		var kt = config.text || 'name';

		render = '';
		data = [];

		for (var i = 0, length = value.length; i < length; i++) {
			var isString = typeof(value[i]) === 'string';
			var item = { value: isString ? value[i] : value[i][kv], text: isString ? value[i] : value[i][kt], index: i };
			render += template(item, config);
			data.push(item);
		}

		if (render)
			container.rclass(clsempty).html(render);
		else
			container.aclass(clsempty).html(config.empty);
	};

	self.setter = function(value) {

		if (!prepared)
			return;

		var label = '';

		if (value && value.length) {
			var remove = [];
			for (var i = 0, length = value.length; i < length; i++) {
				var selected = value[i];
				var index = 0;
				var is = false;
				while (true) {
					var item = data[index++];
					if (item === undefined)
						break;
					if (item.value != selected)
						continue;
					label += (label ? ', ' : '') + item.text;
					is = true;
				}
				!is && remove.push(selected);
			}

			if (config.cleaner !== false) {
				var refresh = false;
				while (true) {
					var item = remove.shift();
					if (item === undefined)
						break;
					value.splice(value.indexOf(item), 1);
					refresh = true;
				}
				refresh && self.set(value);
			}
		}

		container.find('.ui-dropdowncheckbox-item').each(function() {
			var el = $(this);
			var index = +el.attr('data-index');
			var checked = false;
			if (!value || !value.length)
				checked = false;
			else if (data[index])
				checked = data[index];
			checked && (checked = value.indexOf(checked.value) !== -1);
			el.tclass('ui-dropdowncheckbox-checked', checked);
		});

		if (!label && value) {
			// invalid data
			// it updates model without notification
			self.rewrite([]);
		}

		if (!label && config.placeholder) {
			values.removeAttr('title', '');
			values.html('<span>{0}</span>'.format(config.placeholder));
		} else {
			values.attr('title', label);
			values.html(label);
		}
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.find('.ui-dropdowncheckbox').tclass('ui-dropdowncheckbox-invalid', invalid);
	};

	if (W.$dropdowncheckboxevent)
		return;

	W.$dropdowncheckboxevent = true;
	$(document).on('click', function() {
		if (W.$dropdowncheckboxelement) {
			W.$dropdowncheckboxelement.aclass('hidden');
			W.$dropdowncheckboxelement = null;
		}
	});
});

COMPONENT('dropdown', function(self, config) {

	var select, container, condition, content, datasource = null;
	var render = '';

	self.validate = function(value) {

		if (!config.required || config.disabled)
			return true;

		var type = typeof(value);
		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);

		switch (self.type) {
			case 'currency':
			case 'number':
				return value > 0;
		}

		return value.length > 0;
	};

	self.configure = function(key, value, init) {

		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'type':
				self.type = value;
				break;
			case 'items':

				if (value instanceof Array) {
					self.bind('', value);
					return;
				}

				var items = [];

				value.split(',').forEach(function(item) {
					item = item.trim().split('|');
					var obj = { id: item[1] == null ? item[0] : item[1], name: item[0] };
					items.push(obj);
				});

				self.bind('', items);
				break;
			case 'condition':
				condition = value ? FN(value) : null;
				break;
			case 'required':
				self.find('.ui-dropdown-label').tclass('ui-dropdown-label-required', value);
				self.state(1, 1);
				break;
			case 'datasource':
				datasource && self.unwatch(value, self.bind);
				self.watch(value, self.bind, true);
				break;
			case 'label':
				content = value;
				redraw = true;
				break;
			case 'icon':
				redraw = true;
				break;
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.find('select').prop('disabled', value);
				break;
		}

		redraw && setTimeout2(self.id + '.redraw', 100);
	};

	self.bind = function(path, arr) {

		if (!arr)
			arr = EMPTYARRAY;

		var builder = [];
		var value = self.get();
		var template = '<option value="{0}"{1}>{2}</option>';
		var propText = config.text || 'name';
		var propValue = config.value || 'id';

		config.empty !== undefined && builder.push('<option value="">{0}</option>'.format(config.empty));

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i];
			if (condition && !condition(item))
				continue;
			if (item.length)
				builder.push(template.format(item, value === item ? ' selected="selected"' : '', item));
			else
				builder.push(template.format(item[propValue], value === item[propValue] ? ' selected="selected"' : '', item[propText]));
		}

		render = builder.join('');
		select.html(render);
	};

	self.redraw = function() {
		var html = '<div class="ui-dropdown"><span class="fa fa-sort"></span><select data-jc-bind="">{0}</select></div>'.format(render);
		var builder = [];
		var label = content || config.label;
		if (label) {
			builder.push('<div class="ui-dropdown-label{0}">{1}{2}:</div>'.format(config.required ? ' ui-dropdown-label-required' : '', config.icon ? '<span class="fa fa-{0}"></span> '.format(config.icon) : '', label));
			builder.push('<div class="ui-dropdown-values">{0}</div>'.format(html));
			self.html(builder.join(''));
		} else
			self.html(html).aclass('ui-dropdown-values');
		select = self.find('select');
		container = self.find('.ui-dropdown');
		render && self.refresh();
		config.disabled && self.reconfigure('disabled:true');
	};

	self.make = function() {
		self.type = config.type;
		content = self.html();
		self.aclass('ui-dropdown-container');
		self.redraw();
		config.items && self.reconfigure({ items: config.items });
		config.datasource && self.reconfigure('datasource:' + config.datasource);
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.tclass('ui-dropdown-invalid', invalid);
	};
});

COMPONENT('selectbox', function(self, config) {

	var Eitems, Eselected, datasource = null;

	self.datasource = EMPTYARRAY;
	self.template = Tangular.compile('<li data-search="{{ search }}" data-index="{{ index }}">{{ text }}</li>');

	self.validate = function(value) {
		return config.disabled || !config.required ? true : value && value.length > 0;
	};

	self.configure = function(key, value, init) {
		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'type':
				self.type = value;
				break;
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.find('input').prop('disabled', value);
				if (value)
					self.rclass('ui-selectbox-invalid');
				else if (config.required)
					self.state(1, 1);
				break;
			case 'required':
				!value && self.state(1, 1);
				break;
			case 'height':
			case 'search':
				redraw = true;
				break;
			case 'items':
				var arr = [];
				value.split(',').forEach(function(item) {
					item = item.trim().split('|');
					var obj = {};
					obj.name = item[0].trim();
					obj.id = (item[1] == null ? item[0] : item[1]).trim();
					if (config.type === 'number')
						obj.id = +obj.id;
					arr.push(obj);
				});
				self.bind('', arr);
				break;
			case 'datasource':
				datasource && self.unwatch(datasource, self.bind);
				self.watch(value, self.bind, true);
				datasource = value;
				break;
		}

		redraw && self.redraw();
	};

	self.search = function() {
		var search = config.search ? self.find('input').val().toSearch() : '';
		Eitems.find('li').each(function() {
			var el = $(this);
			el.toggleClass('hidden', el.attr('data-search').indexOf(search) === -1);
		});
		self.find('.ui-selectbox-search-icon').toggleClass('fa-search', search.length === 0).toggleClass('fa-times', search.length > 0);
	};

	self.redraw = function() {
		self.html((typeof(config.search) === 'string' ? '<div class="ui-selectbox-search"><span><i class="fa fa-search ui-selectbox-search-icon"></i></span><div><input type="text" placeholder="{0}" /></div></div><div>'.format(config.search) : '') + '<div style="height:{0}px"><ul></ul><ul style="height:{0}px"></ul></div>'.format(config.height || '200'));
		self.find('ul').each(function(index) {
			if (index)
				Eselected = $(this);
			else
				Eitems = $(this);
		});
	};

	self.bind = function(path, value) {

		var kt = config.text || 'name';
		var kv = config.value || 'id';
		var builder = [];

		self.datasource = [];
		value && value.forEach(function(item, index) {

			var text;
			var value;

			if (typeof(item) === 'string') {
				text = item;
				value = self.parser(item);
			} else {
				text = item[kt];
				value = item[kv];
			}

			var item = { text: text, value: value, index: index, search: text.toSearch() };
			self.datasource.push(item);
			builder.push(self.template(item));
		});

		self.search();
		Eitems.empty().append(builder.join(''));
	};

	self.make = function() {

		self.aclass('ui-selectbox');
		self.redraw();

		config.datasource && self.reconfigure('datasource:' + config.datasource);
		config.items && self.reconfigure('items:' + config.items);

		self.event('click', 'li', function() {
			if (config.disabled)
				return;
			var selected = self.get() || [];
			var index = +this.getAttribute('data-index');
			var value = self.datasource[index];

			if (selected.indexOf(value.value) === -1)
				selected.push(value.value);
			else
				selected = selected.remove(value.value);

			self.set(selected);
			self.change(true);
		});

		self.event('click', '.fa-times', function() {
			if (config.disabled)
				return;
			self.find('input').val('');
			self.search();
		});

		typeof(config.search) === 'string' && self.event('keydown', 'input', function() {
			if (config.disabled)
				return;
			setTimeout2(self.id, self.search, 500);
		});
	};

	self.setter = function(value) {

		var selected = {};
		var builder = [];

		var ds = self.datasource;
		var dsl = ds.length;

		if (value) {
			for (var i = 0, length = value.length; i < length; i++) {
				for (var j = 0; j < dsl; j++) {
					if (ds[j].value === value[i]) {
						selected[j] = true;
						builder.push(self.template(ds[j]));
					}
				}
			}
		}

		Eitems.find('li').each(function() {
			var el = $(this);
			var index = +el.attr('data-index');
			el.toggleClass('ui-selectbox-selected', selected[index] !== undefined);
		});

		Eselected.empty().append(builder.join(''));
		self.search();
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.tclass('ui-selectbox-invalid', invalid);
	};
});

COMPONENT('textboxlist', 'maxlength:100', function(self, config) {

	var container, content;
	var empty = {};
	var skip = false;

	self.readonly();
	self.template = Tangular.compile('<div class="ui-textboxlist-item"><div><i class="fa fa-times"></i></div><div><input type="text" maxlength="{{ max }}" placeholder="{{ placeholder }}"{{ if disabled}} disabled="disabled"{{ fi }} value="{{ value }}" /></div></div>');

	self.configure = function(key, value, init, prev) {
		if (init)
			return;

		var redraw = false;
		switch (key) {
			case 'disabled':
				self.tclass('ui-required', value);
				self.find('input').prop('disabled', true);
				empty.disabled = value;
				break;
			case 'maxlength':
				empty.max = value;
				self.find('input').prop(key, value);
				break;
			case 'placeholder':
				empty.placeholder = value;
				self.find('input').prop(key, value);
				break;
			case 'label':
				redraw = true;
				break;
			case 'icon':
				if (value && prev)
					self.find('i').rclass().aclass(value);
				else
					redraw = true;
				break;
		}

		if (redraw) {
			skip = false;
			self.redraw();
			self.refresh();
		}
	};

	self.redraw = function() {

		var icon = '';
		var html = config.label || content;

		if (config.icon)
			icon = '<i class="fa fa-{0}"></i>'.format(config.icon);

		empty.value = '';
		self.html((html ? '<div class="ui-textboxlist-label">{1}{0}:</div>'.format(html, icon) : '') + '<div class="ui-textboxlist-items"></div>' + self.template(empty).replace('-item"', '-item ui-textboxlist-base"'));
		container = self.find('.ui-textboxlist-items');
	};

	self.make = function() {

		empty.max = config.max;
		empty.placeholder = config.placeholder;
		empty.value = '';
		empty.disabled = config.disabled;

		if (config.disabled)
			self.aclass('ui-disabled');

		content = self.html();
		self.aclass('ui-textboxlist');
		self.redraw();

		self.event('click', '.fa-times', function() {

			if (config.disabled)
				return;

			var el = $(this);
			var parent = el.closest('.ui-textboxlist-item');
			var value = parent.find('input').val();
			var arr = self.get();

			parent.remove();

			var index = arr.indexOf(value);
			if (index === -1)
				return;
			arr.splice(index, 1);
			skip = true;
			self.set(self.path, arr, 2);
			self.change(true);
		});

		self.event('change keypress', 'input', function(e) {

			if (config.disabled || (e.type !== 'change' && e.which !== 13))
				return;

			var el = $(this);

			var value = this.value.trim();
			if (!value)
				return;

			var arr = [];
			var base = el.closest('.ui-textboxlist-base').length > 0;

			if (base && e.type === 'change')
				return;

			if (base) {
				self.get().indexOf(value) === -1 && self.push(self.path, value, 2);
				this.value = '';
				self.change(true);
				return;
			}

			container.find('input').each(function() {
				arr.push(this.value.trim());
			});

			skip = true;
			self.set(self.path, arr, 2);
			self.change(true);
		});
	};

	self.setter = function(value) {

		if (skip) {
			skip = false;
			return;
		}

		if (!value || !value.length) {
			container.empty();
			return;
		}

		var builder = [];

		value.forEach(function(item) {
			empty.value = item;
			builder.push(self.template(empty));
		});

		container.empty().append(builder.join(''));
	};
});

COMPONENT('autocomplete', function(self) {

	var container, old, onSearch, searchtimeout, searchvalue, blurtimeout, onCallback, datasource, offsetter = null;
	var is = false;
	var margin = {};

	self.template = Tangular.compile('<li{{ if index === 0 }} class="selected"{{ fi }} data-index="{{ index }}"><span>{{ name }}</span><span>{{ type }}</span></li>');
	self.readonly();
	self.singleton();

	self.make = function() {
		self.aclass('ui-autocomplete-container hidden');
		self.html('<div class="ui-autocomplete"><ul></ul></div>');
		container = self.find('ul');

		self.event('click', 'li', function(e) {
			e.preventDefault();
			e.stopPropagation();
			onCallback && onCallback(datasource[+$(this).attr('data-index')], old);
			self.visible(false);
		});

		self.event('mouseenter mouseleave', 'li', function(e) {
			$(this).tclass('selected', e.type === 'mouseenter');
		});

		$(document).on('click', function() {
			is && self.visible(false);
		});

		$(window).on('resize', function() {
			self.resize();
		});
	};

	function keydown(e) {
		var c = e.which;
		var input = this;

		if (c !== 38 && c !== 40 && c !== 13) {
			if (c !== 8 && c < 32)
				return;
			clearTimeout(searchtimeout);
			searchtimeout = setTimeout(function() {
				var val = input.value;
				if (!val)
					return self.render(EMPTYARRAY);
				if (searchvalue === val)
					return;
				searchvalue = val;
				self.resize();
				onSearch(val, function(value) { self.render(value); });
			}, 200);
			return;
		}

		var current = self.find('.selected');

		if (c === 13) {
			self.visible(false);
			if (current.length) {
				onCallback(datasource[+current.attr('data-index')], old);
				e.preventDefault();
				e.stopPropagation();
			}
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		if (current.length) {
			current.rclass('selected');
			current = c === 40 ? current.next() : current.prev();
		}

		if (!current.length)
			current = self.find('li:{0}-child'.format(c === 40 ? 'first' : 'last'));
		current.aclass('selected');
	}

	function blur() {
		clearTimeout(blurtimeout);
		blurtimeout = setTimeout(function() {
			self.visible(false);
		}, 300);
	}

	self.visible = function(visible) {
		clearTimeout(blurtimeout);
		self.tclass('hidden', !visible);
		is = visible;
	};

	self.resize = function() {

		if (!offsetter || !old)
			return;

		var offset = offsetter.offset();
		offset.top += offsetter.height();
		offset.width = offsetter.width();

		if (margin.left)
			offset.left += margin.left;
		if (margin.top)
			offset.top += margin.top;
		if (margin.width)
			offset.width += margin.width;

		self.css(offset);
	};

	self.attach = function(input, search, callback, top, left, width) {
		self.attachelement(input, input, search, callback, top, left, width);
	};

	self.attachelement = function(element, input, search, callback, top, left, width) {

		clearTimeout(searchtimeout);

		if (input.setter)
			input = input.find('input');
		else
			input = $(input);

		if (old) {
			old.removeAttr('autocomplete');
			old.off('blur', blur);
			old.off('keydown', keydown);
		}

		input.on('keydown', keydown);
		input.on('blur', blur);
		input.attr({ 'autocomplete': 'off' });

		old = input;
		margin.left = left;
		margin.top = top;
		margin.width = width;

		offsetter = $(element);
		self.resize();
		self.refresh();
		searchvalue = '';
		onSearch = search;
		onCallback = callback;
		self.visible(false);
	};

	self.render = function(arr) {

		datasource = arr;

		if (!arr || !arr.length) {
			self.visible(false);
			return;
		}

		var builder = [];
		for (var i = 0, length = arr.length; i < length; i++) {
			var obj = arr[i];
			obj.index = i;
			builder.push(self.template(obj));
		}

		container.empty().append(builder.join(''));
		self.visible(true);
	};
});

COMPONENT('calendar', function(self, config) {

	var skip = false;
	var skipDay = false;
	var visible = false;

	self.days = EMPTYARRAY;
	self.months = EMPTYARRAY;
	self.months_short = EMPTYARRAY;

	self.configure = function(key, value) {
		switch (key) {
			case 'days':
				if (value instanceof Array)
					self.days = value;
				else
					self.days = value.split(',').trim();
				break;

			case 'months':
				if (value instanceof Array)
					self.months = value;
				else
					self.months = value.split(',').trim();

				self.months_short = [];

				for (var i = 0, length = self.months.length; i < length; i++) {
					var m = self.months[i];
					if (m.length > 4)
						m = m.substring(0, 3) + '.';
					self.months_short.push(m);
				}
				break;
		}
	};

	self.readonly();
	self.click = function() {};

	function getMonthDays(dt) {

		var m = dt.getMonth();
		var y = dt.getFullYear();

		if (m === -1) {
			m = 11;
			y--;
		}

		return (32 - new Date(y, m, 32).getDate());
	}

	function calculate(year, month, selected) {

		var d = new Date(year, month, 1);
		var output = { header: [], days: [], month: month, year: year };
		var firstDay = config.firstday;
		var firstCount = 0;
		var from = d.getDay() - firstDay;
		var today = new Date();
		var ty = today.getFullYear();
		var tm = today.getMonth();
		var td = today.getDate();
		var sy = selected ? selected.getFullYear() : -1;
		var sm = selected ? selected.getMonth() : -1;
		var sd = selected ? selected.getDate() : -1;
		var days = getMonthDays(d);

		if (from < 0)
			from = 7 + from;

		while (firstCount++ < 7) {
			output.header.push({ index: firstDay, name: self.days[firstDay] });
			firstDay++;
			if (firstDay > 6)
				firstDay = 0;
		}

		var index = 0;
		var indexEmpty = 0;
		var count = 0;
		var prev = getMonthDays(new Date(year, month - 1, 1)) - from;

		for (var i = 0; i < days + from; i++) {

			var obj = { isToday: false, isSelected: false, isEmpty: false, isFuture: false, number: 0, index: ++count };

			if (i >= from) {
				obj.number = ++index;
				obj.isSelected = sy === year && sm === month && sd === index;
				obj.isToday = ty === year && tm === month && td === index;
				obj.isFuture = ty < year;

				if (!obj.isFuture && year === ty) {
					if (tm < month)
						obj.isFuture = true;
					else if (tm === month)
						obj.isFuture = td < index;
				}

			} else {
				indexEmpty++;
				obj.number = prev + indexEmpty;
				obj.isEmpty = true;
			}

			output.days.push(obj);
		}

		indexEmpty = 0;
		for (var i = count; i < 42; i++)
			output.days.push({ isToday: false, isSelected: false, isEmpty: true, isFuture: false, number: ++indexEmpty, index: ++count });
		return output;
	}

	self.hide = function() {
		self.aclass('hidden');
		visible = false;
		return self;
	};

	self.toggle = function(el, value, callback, offset) {

		if (self.older === el.get(0)) {
			if (!self.hclass('hidden')) {
				self.hide();
				return;
			}
		}

		self.older = el.get(0);
		self.show(el, value, callback, offset);
		return self;
	};

	self.show = function(el, value, callback, offset) {

		setTimeout(function() {
			clearTimeout2('calendarhide');
		}, 5);

		if (!el)
			return self.hide();

		var off = el.offset();
		var h = el.innerHeight();

		self.css({ left: off.left + (offset || 0), top: off.top + h + 12 });
		self.rclass('hidden');
		self.click = callback;
		self.date(value);
		visible = true;
		return self;
	};

	self.make = function() {

		self.aclass('ui-calendar hidden');

		var conf = {};

		if (!config.days) {
			conf.days = [];
			for (var i = 0; i < DAYS.length; i++)
				conf.days.push(DAYS[i].substring(0, 2).toUpperCase());
		}

		!config.months && (conf.months = MONTHS);
		self.reconfigure(conf);

		self.event('click', '.ui-calendar-today', function() {
			var dt = new Date();
			self.hide();
			self.click && self.click(dt);
		});

		self.event('click', '.ui-calendar-day', function() {
			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), parseInt(arr[2]));
			self.find('.ui-calendar-selected').removeClass('ui-calendar-selected');
			$(this).addClass('ui-calendar-selected');
			skip = true;
			self.hide();
			self.click && self.click(dt);
		});

		self.event('click', 'button', function(e) {

			e.preventDefault();
			e.stopPropagation();

			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), 1);
			switch (this.name) {
				case 'prev':
					dt.setMonth(dt.getMonth() - 1);
					break;
				case 'next':
					dt.setMonth(dt.getMonth() + 1);
					break;
			}
			skipDay = true;
			self.date(dt);
		});

		$(document.body).on('scroll click', function() {
			visible && setTimeout2('calendarhide', function() {
				EXEC('$calendar.hide');
			}, 20);
		});

		window.$calendar = self;

		self.on('reflow', function() {
			visible && EXEC('$calendar.hide');
		});
	};

	self.date = function(value) {

		if (typeof(value) === 'string')
			value = value.parseDate();

		if (!value || isNaN(value.getTime()))
			value = DATETIME;

		var empty = !value;

		if (skipDay) {
			skipDay = false;
			empty = true;
		}

		if (skip) {
			skip = false;
			return;
		}

		if (!value)
			value = new Date();

		var output = calculate(value.getFullYear(), value.getMonth(), value);
		var builder = [];

		for (var i = 0; i < 42; i++) {

			var item = output.days[i];

			if (i % 7 === 0) {
				builder.length && builder.push('</tr>');
				builder.push('<tr>');
			}

			var cls = [];

			if (item.isEmpty)
				cls.push('ui-calendar-disabled');
			else
				cls.push('ui-calendar-day');

			!empty && item.isSelected && cls.push('ui-calendar-selected');
			item.isToday && cls.push('ui-calendar-day-today');
			builder.push('<td class="{0}" data-date="{1}-{2}-{3}">{3}</td>'.format(cls.join(' '), output.year, output.month, item.number));
		}

		builder.push('</tr>');

		var header = [];
		for (var i = 0; i < 7; i++)
			header.push('<th>{0}</th>'.format(output.header[i].name));

		self.html('<div class="ui-calendar-header"><button class="ui-calendar-header-prev" name="prev" data-date="{0}-{1}"><span class="fa fa-chevron-left"></span></button><div class="ui-calendar-header-info">{2} {3}</div><button class="ui-calendar-header-next" name="next" data-date="{0}-{1}"><span class="fa fa-chevron-right"></span></button></div><table cellpadding="0" cellspacing="0" border="0"><thead>{4}</thead><tbody>{5}</tbody></table>'.format(output.year, output.month, self.months[value.getMonth()], value.getFullYear(), header.join(''), builder.join('')) + (config.today ? '<div><a href="javascript:void(0)" class="ui-calendar-today">' + config.today + '</a></div>' : ''));
	};
});

COMPONENT('keyvalue', 'maxlength:100', function(self, config) {

	var container, content = null;
	var skip = false;
	var empty = {};

	self.template = Tangular.compile('<div class="ui-keyvalue-item"><div class="ui-keyvalue-item-remove"><i class="fa fa-times"></i></div><div class="ui-keyvalue-item-key"><input type="text" name="key" maxlength="{{ max }}"{{ if disabled }} disabled="disabled"{{ fi }} placeholder="{{ placeholder_key }}" value="{{ key }}" /></div><div class="ui-keyvalue-item-value"><input type="text" maxlength="{{ max }}" placeholder="{{ placeholder_value }}" value="{{ value }}" /></div></div>');

	self.binder = function(type, value) {
		return value;
	};

	self.configure = function(key, value, init, prev) {
		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.find('input').prop('disabled', value);
				empty.disabled = value;
				break;
			case 'maxlength':
				self.find('input').prop('maxlength', value);
				break;
			case 'placeholderkey':
				self.find('input[name="key"]').prop('placeholder', value);
				break;
			case 'placeholdervalue':
				self.find('input[name="value"]').prop('placeholder', value);
				break;
			case 'icon':
				if (value && prev)
					self.find('i').rclass('fa').aclass('fa fa-' + value);
				else
					redraw = true;
				break;

			case 'label':
				redraw = true;
				break;
		}

		if (redraw) {
			self.redraw();
			self.refresh();
		}
	};

	self.redraw = function() {

		var icon = config.icon;
		var label = config.label || content;

		if (icon)
			icon = '<i class="fa fa-{0}"></i>'.format(icon);

		empty.value = '';

		self.html((label ? '<div class="ui-keyvalue-label">{1}{0}:</div>'.format(label, icon) : '') + '<div class="ui-keyvalue-items"></div>' + self.template(empty).replace('-item"', '-item ui-keyvalue-base"'));
		container = self.find('.ui-keyvalue-items');
	};

	self.make = function() {

		empty.max = config.maxlength;
		empty.placeholder_key = config.placeholderkey;
		empty.placeholder_value = config.placeholdervalue;
		empty.value = '';
		empty.disabled = config.disabled;

		content = self.html();

		self.aclass('ui-keyvalue');
		self.disabled && self.aclass('ui-disabled');
		self.redraw();

		self.event('click', '.fa-times', function() {

			if (config.disabled)
				return;

			var el = $(this);
			var parent = el.closest('.ui-keyvalue-item');
			var inputs = parent.find('input');
			var obj = self.get();
			!obj && (obj = {});
			var key = inputs.get(0).value;
			parent.remove();
			delete obj[key];
			self.set(self.path, obj, 2);
			self.change(true);
		});

		self.event('change keypress', 'input', function(e) {

			if (config.disabled || (e.type !== 'change' && e.which !== 13))
				return;

			var el = $(this);
			var inputs = el.closest('.ui-keyvalue-item').find('input');
			var key = self.binder('key', inputs.get(0).value);
			var value = self.binder('value', inputs.get(1).value);

			if (!key || !value)
				return;

			var base = el.closest('.ui-keyvalue-base').length > 0;
			if (base && e.type === 'change')
				return;

			if (base) {
				var tmp = self.get();
				!tmp && (tmp = {});
				tmp[key] = value;
				self.set(tmp);
				self.change(true);
				inputs.val('');
				inputs.eq(0).focus();
				return;
			}

			var keyvalue = {};
			var k;

			container.find('input').each(function() {
				if (this.name === 'key') {
					k = this.value.trim();
				} else if (k) {
					keyvalue[k] = this.value.trim();
					k = '';
				}
			});

			skip = true;
			self.set(self.path, keyvalue, 2);
			self.change(true);
		});
	};

	self.setter = function(value) {

		if (skip) {
			skip = false;
			return;
		}

		if (!value) {
			container.empty();
			return;
		}

		var builder = [];

		Object.keys(value).forEach(function(key) {
			empty.key = key;
			empty.value = value[key];
			builder.push(self.template(empty));
		});

		container.empty().append(builder.join(''));
	};
});

COMPONENT('codemirror', 'linenumbers:false', function(self, config) {

	var skipA = false;
	var skipB = false;
	var editor = null;

	self.getter = null;

	self.reload = function() {
		editor.refresh();
	};

	self.validate = function(value) {
		return config.disabled || !config.required ? true : value && value.length > 0;
	};

	self.configure = function(key, value, init) {
		if (init)
			return;

		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				editor.readOnly = value;
				editor.refresh();
				break;
			case 'required':
				self.find('.ui-codemirror-label').tclass('ui-codemirror-label-required', value);
				self.state(1, 1);
				break;
			case 'icon':
				self.find('i').rclass().aclass('fa fa-' + value);
				break;
		}

	};

	self.make = function() {
		var content = config.label || self.html();
		self.html('<div class="ui-codemirror-label' + (config.required ? ' ui-codemirror-label-required' : '') + '">' + (config.icon ? '<i class="fa fa-' + config.icon + '"></i> ' : '') + content + ':</div><div class="ui-codemirror"></div>');
		var container = self.find('.ui-codemirror');
		editor = CodeMirror(container.get(0), { lineNumbers: config.linenumbers, mode: config.type || 'htmlmixed', indentUnit: 4 });
		config.height !== 'auto' && editor.setSize('100%', (config.height || 200) + 'px');

		if (config.disabled) {
			self.aclass('ui-disabled');
			editor.readOnly = true;
			editor.refresh();
		}

		editor.on('change', function(a, b) {

			if (config.disabled)
				return;

			if (skipB && b.origin !== 'paste') {
				skipB = false;
				return;
			}

			setTimeout2(self.id, function() {
				skipA = true;
				self.reset(true);
				self.dirty(false);
				self.set(editor.getValue());
			}, 200);
		});

		skipB = true;
	};

	self.setter = function(value) {

		if (skipA === true) {
			skipA = false;
			return;
		}

		skipB = true;
		editor.setValue(value || '');
		editor.refresh();
		skipB = true;

		CodeMirror.commands['selectAll'](editor);
		skipB = true;
		editor.setValue(editor.getValue());
		skipB = true;

		setTimeout(function() {
			editor.refresh();
		}, 200);

		setTimeout(function() {
			editor.refresh();
		}, 1000);

		setTimeout(function() {
			editor.refresh();
		}, 2000);
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.find('.ui-codemirror').tclass('ui-codemirror-invalid', invalid);
	};
});

COMPONENT('contextmenu', function() {
	var self = this;
	var is = false;
	var timeout;
	var container;
	var arrow;

	self.template = Tangular.compile('<div class="item{{ if selected }} selected{{ fi }}" data-value="{{ value }}"><i class="fa {{ icon }}"></i><span>{{ name | raw }}</span></div>');
	self.singleton();
	self.readonly();
	self.callback = null;

	self.make = function() {

		self.classes('ui-contextmenu');
		self.append('<span class="ui-contextmenu-arrow fa fa-caret-up"></span><div class="ui-contextmenu-items"></div>');
		container = self.find('.ui-contextmenu-items');
		arrow = self.find('.ui-contextmenu-arrow');

		self.event('touchstart mousedown', 'div[data-value]', function(e) {
			self.callback && self.callback($(this).attr('data-value'), $(self.target));
			self.hide();
			e.preventDefault();
			e.stopPropagation();
		});

		$(document).on('touchstart mousedown', function() {
			SETTER('contextmenu', 'hide', 100);
		});
	};

	self.show = function(orientation, target, items, callback, offsetX) {

		if (is) {
			clearTimeout(timeout);
			var obj = target instanceof jQuery ? target.get(0) : target;
			if (self.target === obj) {
				self.hide(0);
				return;
			}
		}

		target = $(target);
		var type = typeof(items);
		var item;

		if (type === 'string')
			items = self.get(items);
		else if (type === 'function') {
			callback = items;
			items = (target.attr('data-options') || '').split(';');
			for (var i = 0, length = items.length; i < length; i++) {
				item = items[i];
				if (!item)
					continue;
				var val = item.split('|');
				items[i] = { name: val[0], icon: val[1], value: val[2] || val[0] };
			}
		}

		if (!items) {
			self.hide(0);
			return;
		}

		self.callback = callback;

		var builder = [];
		for (var i = 0, length = items.length; i < length; i++) {
			item = items[i];

			if (typeof(item) === 'string') {
				builder.push('<div class="divider">{0}</div>'.format(item));
				continue;
			}

			item.index = i;
			if (!item.value)
				item.value = item.name;
			if (!item.icon)
				item.icon = 'fa-caret-right';

			var tmp = self.template(item);
			if (item.url)
				tmp = tmp.replace('<div', '<a href="{0}" target="_blank"'.format(item.url)).replace(/div>$/g, 'a>');

			builder.push(tmp);
		}

		self.target = target.get(0);
		var offset = target.offset();

		container.html(builder);

		switch (orientation) {
			case 'left':
				arrow.css({ left: '15px' });
				break;
			case 'right':
				arrow.css({ left: '210px' });
				break;
			case 'center':
				arrow.css({ left: '107px' });
				break;
		}


		var options = { left: (orientation === 'center' ? Math.ceil((offset.left - self.element.width() / 2) + (target.innerWidth() / 2)) : orientation === 'left' ? offset.left - 8 : (offset.left - self.element.width()) + target.innerWidth()) + (offsetX || 0), top: offset.top + target.innerHeight() + 10 };
		self.css(options);

		if (is)
			return;

		self.element.show();
		setTimeout(function() {
			self.classes('ui-contextmenu-visible');
			self.emit('contextmenu', true, self, self.target);
		}, 100);

		is = true;
	};

	self.hide = function(sleep) {
		if (!is)
			return;
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			self.element.hide().removeClass('ui-contextmenu-visible');
			self.emit('contextmenu', false, self, self.target);
			self.callback = null;
			self.target = null;
			is = false;
		}, sleep ? sleep : 100);
	};
});

COMPONENT('message', function(self, config) {

	var is, visible = false;
	var timer = null;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.aclass('ui-message hidden');

		self.event('click', 'button', function() {
			self.hide();
		});

		$(window).on('keyup', function(e) {
			visible && e.which === 27 && self.hide();
		});
	};

	self.warning = function(message, icon, fn) {
		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}
		self.callback = fn;
		self.content('ui-message-warning', message, icon || 'fa-warning');
	};

	self.success = function(message, icon, fn) {

		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}

		self.callback = fn;
		self.content('ui-message-success', message, icon || 'fa-check-circle');
	};

	self.hide = function() {
		self.callback && self.callback();
		self.rclass('ui-message-visible');
		timer && clearTimeout(timer);
		timer = setTimeout(function() {
			visible = false;
			self.aclass('hidden');
		}, 1000);
	};

	self.content = function(cls, text) {
		!is && self.html('<div><div class="ui-message-body"><div class="text"></div><hr /><button>' + (config.button || 'Close') + '</button></div></div>');
		timer && clearTimeout(timer);
		visible = true;
		is = true;
		self.find('.ui-message-body').rclass().aclass('ui-message-body ' + cls);
		// self.find('.fa').rclass().aclass('fa ' + icon);
		self.find('.text').html(text);
		self.rclass('hidden');
		setTimeout(function() {
			self.aclass('ui-message-visible');
		}, 5);
	};
});

COMPONENT('disable', function(self, config) {

	var validate = null;
	self.readonly();

	self.configure = function(key, value) {
		if (key === 'validate')
			validate = value.split(',').trim();
	};

	self.setter = function(value) {
		var is = true;

		if (config.if)
			is = EVALUATE(self.path, config.if);
		else
			is = value ? false : true;

		self.find(config.selector || '[data-jc]').each(function() {
			var com = $(this).component();
			com && com.reconfigure('disabled:' + is);
		});

		validate && validate.forEach(FN('n => MAIN.reset({0}n)'.format(self.pathscope ? '\'' + self.pathscope + '.\'+' : '')));
	};

	self.state = function() {
		self.update();
	};
});

COMPONENT('textarea', function(self, config) {

	var input, container, content = null;

	self.validate = function(value) {
		if (config.disabled || !config.required)
			return true;
		if (value == null)
			value = '';
		else
			value = value.toString();
		return value.length > 0;
	};

	self.configure = function(key, value, init) {
		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.find('input').prop('disabled', value);
				break;
			case 'required':
				self.noValid(!value);
				!value && self.state(1, 1);
				self.find('.ui-textarea-label').tclass('ui-textarea-label-required', value);
				break;
			case 'placeholder':
				input.prop('placeholder', value || '');
				break;
			case 'maxlength':
				input.prop('maxlength', value || 1000);
				break;
			case 'label':
				redraw = true;
				break;
			case 'autofocus':
				input.focus();
				break;
			case 'monospace':
				self.tclass('ui-textarea-monospace', value);
				break;
			case 'icon':
				redraw = true;
				break;
			case 'format':
				self.format = value;
				self.refresh();
				break;
		}

		redraw && setTimeout2('redraw' + self.id, function() {
			self.redraw();
			self.refresh();
		}, 100);
	};

	self.redraw = function() {

		var attrs = [];
		var builder = [];

		self.tclass('ui-disabled', config.disabled === true);
		self.tclass('ui-textarea-monospace', config.monospace === true);

		config.placeholder && attrs.attr('placeholder', config.placeholder);
		config.maxlength && attrs.attr('maxlength', config.maxlength);
		config.error && attrs.attr('error');
		attrs.attr('data-jc-bind', '');
		config.height && attrs.attr('style', 'height:{0}px'.format(config.height));
		config.autofocus === 'true' && attrs.attr('autofocus');
		config.disabled && attrs.attr('disabled');
		builder.push('<textarea {0}></textarea>'.format(attrs.join(' ')));

		var label = config.label || content;

		if (!label.length) {
			config.error && builder.push('<div class="ui-box-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));
			self.aclass('ui-textarea ui-textarea-container');
			self.html(builder.join(''));
			input = self.find('textarea');
			container = self.element;
			return;
		}

		var html = builder.join('');

		builder = [];
		builder.push('<div class="ui-textarea-label{0}">'.format(config.required ? ' ui-textarea-label-required' : ''));
		config.icon && builder.push('<i class="fa fa-{0}"></i>'.format(config.icon));
		builder.push(label);
		builder.push(':</div><div class="ui-textarea">{0}</div>'.format(html));
		config.error && builder.push('<div class="ui-textarea-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));

		self.html(builder.join(''));
		self.rclass('ui-textarea');
		self.aclass('ui-textarea-container');
		input = self.find('textarea');
		container = self.find('.ui-textarea');
	};

	self.make = function() {
		content = self.html();
		self.type = config.type;
		self.format = config.format;
		self.redraw();
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.tclass('ui-textarea-invalid', invalid);
		config.error && self.find('.ui-textarea-helper').tclass('ui-textarea-helper-show', invalid);
	};
});

COMPONENT('filereader', function(self, config) {
	self.readonly();
	self.make = function() {

		var element = self.element;
		var content = self.html();
		var html = '<span class="fa fa-folder-o"></span><input type="file"' + (config.accept ? ' accept="' + config.accept + '"' : '') + ' class="ui-filereader-input" /><input type="text" placeholder="' + (config.placeholder || '') + '" readonly="readonly" />';

		if (content.length) {
			self.html('<div class="ui-filereader-label' + (config.required ? ' ui-filereader-label-required' : '') + '">' + (config.icon ? '<span class="fa fa-' + config.icon + '"></span> ' : '') + content + ':</div><div class="ui-filereader">' + html + '</div>');
		} else {
			self.aclass('ui-filereader');
			self.html(html);
		}

		element.find('.ui-filereader-input').bind('change', function(evt) {
			self.process(evt.target.files);
		});
	};

	self.process = function(files) {
		var el = this;
		SETTER('loading', 'show');
		(files.length - 1).async(function(index, next) {
			var file = files[index];
			var reader = new FileReader();
			reader.onload = function() {
				self.set({ body: reader.result, filename: file.name, type: file.type, size: file.size });
				reader = null;
				setTimeout(next, 500);
			};
			reader.readAsText(file);
		}, function() {
			SETTER('loading', 'hide', 1000);
			el.value = '';
		});
	};
});

COMPONENT('nosqlcounter', 'count:0', function(self, config) {

	var months = MONTHS;

	self.readonly();
	self.make = function() {
		self.toggle('ui-nosqlcounter hidden', true);
	};

	self.configure = function(key, value) {
		switch (key) {
			case 'months':
				if (value instanceof Array)
					months = value;
				else
					months = value.split(',').trim();
				break;
		}
	};

	self.setter = function(value) {

		var is = !value || !value.length;
		self.toggle('hidden', is);

		if (is)
			return self.empty();

		var maxbars = 12;

		if (config.count === 0)
			maxbars = self.element.width() / 30 >> 0;
		else
			maxbars = config.count;

		if (WIDTH() === 'xs')
			maxbars = maxbars / 2;

		var dt = new Date();
		var current = dt.format('yyyyMM');
		var stats = null;

		if (config.lastvalues) {
			var max = value.length - maxbars;
			if (max < 0)
				max = 0;
			stats = value.slice(max, value.length);
		} else {
			stats = [];
			for (var i = 0; i < maxbars; i++) {
				var id = dt.format('yyyyMM');
				var item = value.findItem('id', id);
				stats.push(item ? item : { id: id, month: dt.getMonth() + 1, year: dt.getFullYear(), value: 0 });
				dt = dt.add('-1 month');
			}
			stats.reverse();
		}

		var max = stats.scalar('max', 'value');
		var bar = 100 / maxbars;
		var builder = [];
		var cls = '';

		stats.forEach(function(item, index) {
			var val = item.value;
			if (val > 999)
				val = (val / 1000).format(1, 2) + 'K';

			var h = (item.value / max) * 60;
			h += 40;

			cls = item.value ? '' : 'empty';

			if (item.id === current)
				cls += (cls ? ' ' : '') + 'current';

			if (index === maxbars - 1)
				cls += (cls ? ' ' : '') + 'last';

			builder.push('<div style="width:{0}%;height:{1}%" title="{3}" class="{4}"><span>{2}</span></div>'.format(bar.format(2, ''), h.format(0, ''), val, months[item.month - 1] + ' ' + item.year, cls));
		});

		self.html(builder);
	};
});

COMPONENT('colorpicker', function(self) {

	var container = null;
	var template = '<li data-index="{0}"><i class="fa fa-circle" style="color:#{1}"></i></li>';
	var is = false;
	var opener = {};
	var css = {};
	var colors = 'ff0000,ff4000,ff8000,ffbf00,ffff00,bfff00,80ff00,40ff00,00ff00,00ff40,00ff80,00ffbf,00ffff,00bfff,0080ff,0040ff,0000ff,4000ff,8000ff,bf00ff,ff00ff,ff00bf,ff0080,ff0040,ff0000,F0F0F0,D0D0D0,AAB2BD,505050,000000'.split(',');

	self.singleton();
	self.readonly();
	self.blind();

	self.make = function() {
		self.aclass('ui-colorpicker hidden');
		self.append('<ul></ul>');
		container = self.find('ul');

		self.event('click', 'li', function() {
			var color = '#' + colors[+this.getAttribute('data-index')];
			opener.callback && opener.callback(color, opener.target);
			self.hide();
			EMIT('colorpicker', color);
		});

		self.on('reflow', self.$hide);
		self.on('resize', self.$hide);
	};

	self.$hide = function() {
		is && self.hide();
	};

	self.render = function() {
		var builder = [];
		for (var i = 0, length = colors.length; i < length; i++)
			builder.push(template.format(i, colors[i]));
		container.empty().html(builder.join(''));
	};

	self.hide = function() {
		if (is) {
			self.aclass('hidden');
			is = false;
		}
	};

	self.show = function(x, y, target, callback) {

		if (is && opener.x === x && opener.y === y) {
			opener.x = null;
			opener.y = null;
			self.hide();
			return;
		}

		if (typeof(target) === 'function') {
			callback = target;
			target = null;
		}

		opener.callback = callback;
		opener.target = target;
		opener.x = x;
		opener.y = y;

		!is && self.render();
		is = true;

		css.left = x;
		css.top = y;

		self.element.css(css).rclass('hidden');
	};
});

Array.prototype.flowConnection = function(index, id) {
	for (var i = 0; i < this.length; i++)
		if (this[i].index === index && this[i].id === id)
			return this[i];
};

COMPONENT('multioptions', function(self) {

	var Tinput = Tangular.compile('<input class="ui-moi-save ui-moi-value-inputtext" data-name="{{ name }}" type="text" value="{{ value }}"{{ if def }} placeholder="{{ def }}"{{ fi }}{{ if max }} maxlength="{{ max }}"{{ fi }} data-type="text" />');
	var Tselect = Tangular.compile('<div class="ui-moi-value-select"><i class="fa fa-chevron-down"></i><select data-name="{{ name }}" class="ui-moi-save ui-multioptions-select">{{ foreach m in values }}<option value="{{ $index }}"{{ if value === m.value }} selected="selected"{{ fi }}>{{ m.text }}</option>{{ end }}</select></div>');
	var Tnumber = Tangular.compile('<div class="ui-moi-value-inputnumber-buttons"><span class="multioptions-operation" data-type="number" data-step="{{ step }}" data-name="plus" data-max="{{ max }}" data-min="{{ min }}"><i class="fa fa-plus"></i></span><span class="multioptions-operation" data-type="number" data-name="minus" data-step="{{ step }}" data-max="{{ max }}" data-min="{{ min }}"><i class="fa fa-minus"></i></span></div><div class="ui-moi-value-inputnumber"><input data-name="{{ name }}" class="ui-moi-save ui-moi-value-numbertext" type="text" value="{{ value }}"{{ if def }} placeholder="{{ def }}"{{ fi }} data-max="{{ max }}" data-min="{{ max }}" data-type="number" /></div>');
	var Tboolean = Tangular.compile('<div data-name="{{ name }}" data-type="boolean" class="ui-moi-save multioptions-operation ui-moi-value-boolean{{ if value }} checked{{ fi }}"><i class="fa fa-check"></i></div>');
	var Tdate = Tangular.compile('<div class="ui-moi-value-inputdate-buttons"><span class="multioptions-operation" data-type="date" data-name="date"><i class="fa fa-calendar"></i></span></div><div class="ui-moi-value-inputdate"><input class="ui-moi-save ui-moi-date" data-name="{{ name }}" type="text" value="{{ value | format(\'yyyy-MM-dd\') }}" placeholder="dd.mm.yyyy" maxlength="10" data-type="date" /></div>');
	var Tcolor = null;
	var skip = false;
	var mapping = null;

	self.readonly();

	self.init = function() {
		window.Tmultioptionscolor = Tangular.compile('<div class="ui-moi-value-colors ui-moi-save" data-name="{{ name }}" data-value="{{ value }}">{0}</div>'.format(['#ED5565', '#DA4453', '#FC6E51', '#E9573F', '#FFCE54', '#F6BB42', '#A0D468', '#8CC152', '#48CFAD', '#37BC9B', '#4FC1E9', '#3BAFDA', '#5D9CEC', '#4A89DC', '#AC92EC', '#967ADC', '#EC87C0', '#D770AD', '#F5F7FA', '#E6E9ED', '#CCD1D9', '#AAB2BD', '#656D78', '#434A54', '#000000'].map(function(n) { return '<span data-value="{0}" data-type="color" class="multioptions-operation" style="background-color:{0}"><i class="fa fa-check-circle"></i></span>'.format(n); }).join('')));
	};

	self.form = function() {};

	self.make = function() {

		Tcolor = window.Tmultioptionscolor;
		self.aclass('ui-multioptions');

		var el = self.find('script');
		self.remap(el.html());
		el.remove();

		self.event('click', '.multioptions-operation', function(e) {
			var el = $(this);
			var name = el.attr('data-name');
			var type = el.attr('data-type');

			e.stopPropagation();

			if (type === 'date') {
				el = el.parent().parent().find('input');
				FIND('calendar').show(el, el.val().parseDate(), function(date) {
					el.val(date.format('yyyy-MM-dd'));
					self.$save();
				});
				return;
			}

			if (type === 'color') {
				el.parent().find('.selected').removeClass('selected');
				el.addClass('selected');
				self.$save();
				return;
			}

			if (type === 'boolean') {
				el.toggleClass('checked');
				self.$save();
				return;
			}

			if (type === 'number') {
				var input = el.parent().parent().find('input');
				var step = (el.attr('data-step') || '0').parseInt();
				var min = el.attr('data-min');
				var max = el.attr('data-max');

				if (!step)
					step = 1;

				if (min)
					min = min.parseInt();

				if (max)
					max = max.parseInt();

				var value;

				if (name === 'plus') {
					value = input.val().parseInt() + step;
					if (max !== 0 && max && value > max)
						value = max;
					input.val(value);
				} else {
					value = input.val().parseInt() - step;
					if (min !== 0 && min && value < min)
						value = min;
					input.val(value);
				}
				self.$save();
				return;
			}

			self.form(type, el.parent().parent().find('input'), name);
			return;
		});

		self.event('change', 'input,select', self.$save);

		self.event('click', '.ui-moi-date', function(e) {
			e.stopPropagation();
		});

		self.event('focus', '.ui-moi-date', function() {
			var el = $(this);
			FIND('calendar').toggle(el, el.val().parseDate(), function(date) {
				el.val(date.format('yyyy-MM-dd'));
				self.$save();
			});
		});
	};

	self.remap = function(js) {

		var fn = new Function('option', js);

		mapping = {};
		fn(function(key, label, def, type, max, min, step, validator) {
			if (typeof(type) === 'number') {
				validator = step;
				step = min;
				min = max;
				max = type;
				type = 'number';
			} else if (!type)
				type = def instanceof Date ? 'date' : typeof(def);

			var values;

			if (type instanceof Array) {

				values = [];

				type.forEach(function(val) {
					values.push({ text: val.text === undefined ? val : val.text, value: val.value === undefined ? val : val.value });
				});

				type = 'array';
			}

			if (validator && typeof(validator) !== 'function')
				validator = null;

			mapping[key] = { name: key, label: label, type: type.toLowerCase(), def: def, max: max, min: min, step: step, value: def, values: values, validator: validator };
		});
	};

	self.$save = function() {
		setTimeout2('multioptions.' + self._id, self.save, 500);
	};

	self.save = function() {
		var obj = self.get();
		var values = self.find('.ui-moi-save');

		Object.keys(mapping).forEach(function(key) {

			var opt = mapping[key];
			var el = values.filter('[data-name="{0}"]'.format(opt.name));

			if (el.hasClass('ui-moi-value-colors')) {
				obj[key] = el.find('.selected').attr('data-value');
				return;
			}

			if (el.hasClass('ui-moi-value-boolean')) {
				obj[key] = el.hasClass('checked');
				return;
			}

			if (el.hasClass('ui-moi-date')) {
				obj[key] = el.val().parseDate();
				return;
			}

			if (el.hasClass('ui-moi-value-inputtext')) {
				obj[key] = el.val();
				return;
			}

			if (el.hasClass('ui-moi-value-numbertext')) {
				obj[key] = el.val().parseInt();
				return;
			}

			if (el.hasClass('ui-moi-value-numbertext')) {
				obj[key] = el.val().parseInt();
				return;
			}

			if (el.hasClass('ui-multioptions-select')) {
				var index = el.val().parseInt();
				var val = opt.values[index];
				obj[key] = val ? val.value : null;
				if (obj[key] && obj[key].value)
					obj[key] = obj[key].value;
				return;
			}
		});

		skip = true;
		self.set(obj);
	};

	self.setter = function(options) {

		if (!options || skip) {
			skip = false;
			return;
		}

		var builder = [];

		Object.keys(mapping).forEach(function(key) {

			var option = mapping[key];

			// option.name
			// option.label
			// option.type (lowercase)
			// option.def
			// option.value
			// option.max
			// option.min
			// option.step

			option.value = options[key];

			var value = '';

			switch (option.type) {
				case 'string':
					value = Tinput(option);
					break;
				case 'number':
					value = Tnumber(option);
					break;
				case 'boolean':
					value = Tboolean(option);
					break;
				case 'color':
					value = Tcolor(option);
					break;
				case 'array':
					value = Tselect(option);
					break;
				case 'date':
					value = Tdate(option);
					break;
			}

			builder.push('<div class="ui-multioptions-item"><div class="ui-moi-name">{0}</div><div class="ui-moi-value">{1}</div></div>'.format(option.label, value));
		});

		self.html(builder);

		self.find('.ui-moi-value-colors').each(function() {
			var el = $(this);
			var value = el.attr('data-value');
			el.find('[data-value="{0}"]'.format(value)).addClass('selected');
		});
	};
});

COMPONENT('dragdropfiles', function(self, config) {

	self.readonly();

	self.mirror = function(cls) {
		var arr = cls.split(' ');
		for (var i = 0, length = arr.length; i < length; i++) {
			arr[i] = arr[i].replace(/^(\+|\-)/g, function(c) {
				return c === '+' ? '-' : '+';
			});
		}
		return arr.join(' ');
	};

	self.make = function() {
		var has = false;

		self.event('dragenter dragover dragexit drop dragleave', function (e) {

			e.stopPropagation();
			e.preventDefault();

			switch (e.type) {
				case 'drop':
					config.class && has && self.classes(self.mirror(config.class));
					break;
				case 'dragenter':
				case 'dragover':
					config.class && !has && self.classes(config.class);
					has = true;
					return;
				case 'dragleave':
				case 'dragexit':
				default:
					setTimeout2(self.id, function() {
						config.class && has && self.classes(self.mirror(config.class));
						has = false;
					}, 100);
					return;
			}

			EXEC(config.exec, e.originalEvent.dataTransfer.files, e);
		});
	};
});

COMPONENT('features', function(self, config) {

	var container, timeout, input, search, scroller = null;
	var is = false, results = false, selectedindex = 0, resultscount = 0;

	self.oldsearch = '';
	self.items = null;
	self.template = Tangular.compile('<li data-search="{{ $.search }}" data-index="{{ $.index }}"{{ if selected }} class="selected"{{ fi }}>{{ if icon }}<i class="fa fa-{{ icon }}"></i>{{ fi }}{{ name | raw }}</li>');
	self.callback = null;
	self.readonly();
	self.singleton();

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'placeholder':
				self.find('input').prop('placeholder', value);
				break;
		}
	};

	self.make = function() {

		self.aclass('ui-features-layer hidden');
		self.append('<div class="ui-features"><div class="ui-features-search"><span><i class="fa fa-search"></i></span><div><input type="text" placeholder="{0}" class="ui-features-search-input" /></div></div><div class="ui-features-container"><ul></ul></div></div>'.format(config.placeholder));

		container = self.find('ul');
		input = self.find('input');
		search = self.find('.ui-features');
		scroller = self.find('.ui-features-container');

		self.event('touchstart mousedown', 'li[data-index]', function(e) {
			self.callback && self.callback(self.items[+this.getAttribute('data-index')]);
			self.hide();
			e.preventDefault();
			e.stopPropagation();
		});

		$(document).on('touchstart mousedown', function(e) {
			is && !$(e.target).hclass('ui-features-search-input') && self.hide(0);
		});

		$(window).on('resize', function() {
			is && self.hide(0);
		});

		self.event('keydown', 'input', function(e) {
			var o = false;
			switch (e.which) {
				case 27:
					o = true;
					self.hide();
					break;
				case 13:
					o = true;
					var sel = self.find('li.selected');
					if (sel.length && self.callback)
						self.callback(self.items[+sel.attr('data-index')]);
					self.hide();
					break;
				case 38: // up
					o = true;
					selectedindex--;
					if (selectedindex < 0)
						selectedindex = 0;
					else
						self.move();
					break;
				case 40: // down
					o = true;
					selectedindex++ ;
					if (selectedindex >= resultscount)
						selectedindex = resultscount;
					else
						self.move();
					break;
			}

			if (o && results) {
				e.preventDefault();
				e.stopPropagation();
			}
		});

		self.event('keyup', 'input', function() {
			setTimeout2(self.id, self.search, 100, null, this.value);
		});
	};

	self.search = function(value) {

		if (!value) {
			if (self.oldsearch === value)
				return;
			self.oldsearch = value;
			selectedindex = 0;
			results = true;
			resultscount = self.items.length;
			container.find('li').rclass('hidden selected');
			self.move();
			return;
		}

		if (self.oldsearch === value)
			return;
		self.oldsearch = value;
		value = value.toSearch();
		results = false;
		resultscount = 0;
		selectedindex = 0;
		container.find('li').each(function() {
			var el = $(this);
			var val = el.attr('data-search');
			var h = val.indexOf(value) === -1;
			if (!h) {
				results = true;
				resultscount++;
			}
			el.tclass('hidden', h);
			el.rclass('selected');
		});
		self.move();
	};

	self.move = function() {
		var counter = 0;
		var h = scroller.css('max-height').parseInt();
		container.find('li').each(function(index) {
			var el = $(this);
			if (el.hclass('hidden'))
				return;
			var is = selectedindex === counter;
			el.tclass('selected', is);
			if (is) {
				var pos = (el.innerHeight() + 1.5) * index;
				if (pos > h - 20)
					scroller.scrollTop(pos);
				else
					scroller.scrollTop(0);
			}
			counter++;
		});
	};

	self.show = function(items, callback) {

		if (is) {
			clearTimeout(timeout);
			self.hide(0);
			return;
		}

		var type = typeof(items);
		var item;

		if (type === 'string')
			items = self.get(items);

		if (!items) {
			self.hide(0);
			return;
		}

		self.items = items;
		self.callback = callback;
		results = true;
		resultscount = self.items.length;

		input.val('');

		var builder = [];
		var indexer = {};

		for (var i = 0, length = items.length; i < length; i++) {
			item = items[i];
			indexer.index = i;
			indexer.search = (item.name + ' ' + (item.keywords || '')).trim().toSearch();
			!item.value && (item.value = item.name);
			builder.push(self.template(item, indexer));
		}

		container.html(builder);

		var W = $(window);
		var top = ((W.height() / 2) - (search.height() / 2)) - scroller.css('max-height').parseInt();
		var options = { top: top, left: (W.width() / 2) - (search.width() / 2) };

		search.css(options);
		self.move();

		if (is)
			return;

		self.rclass('hidden');

		setTimeout(function() {
			self.aclass('ui-features-visible');
		}, 100);

		!isMOBILE && setTimeout(function() {
			input.focus();
		}, 500);

		is = true;
		$('html,body').aclass('ui-features-noscroll');
	};

	self.hide = function(sleep) {
		if (!is)
			return;
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			self.aclass('hidden').rclass('ui-features-visible');
			self.callback = null;
			self.target = null;
			is = false;
			$('html,body').rclass('ui-features-noscroll');
		}, sleep ? sleep : 100);
	};
});

COMPONENT('shortcuts', function(self) {

	var items = [];
	var length = 0;
	var stop = {};

	self.singleton();
	self.readonly();
	self.blind();

	self.make = function() {
		$(window).on('keydown', function(e) {
			if (length) {
				setTimeout2(self.id, function() {
					for (var i = 0; i < length; i++)
						items[i].fn(e) && items[i].callback(e);
				}, 100);

				// Disables F-keys
				if (stop[e.key]) {
					e.stopPropagation();
					e.preventDefault();
				}
			}
		});
	};

	self.register = function(shortcut, callback) {
		var builder = [];
		shortcut.split('+').trim().forEach(function(item) {
			var lower = item.toLowerCase();
			switch (lower) {
				case 'ctrl':
				case 'alt':
				case 'shift':
					builder.push('e.{0}Key').format(lower);
					return;
				case 'win':
				case 'meta':
				case 'cmd':
					builder.push('e.metaKey');
					return;
				case 'space':
					builder.push('e.keyCode===32');
					return;
				case 'tab':
					builder.push('e.keyCode===9');
					return;
				case 'esc':
					builder.push('e.keyCode===27');
					return;
				case 'enter':
					builder.push('e.keyCode===13');
					return;
				case 'backspace':
				case 'del':
				case 'delete':
					builder.push('(e.keyCode===8||e.keyCode===127)');
					return;
				case 'up':
					builder.push('e.keyCode===38');
					return;
				case 'down':
					builder.push('e.keyCode===40');
					return;
				case 'right':
					builder.push('e.keyCode===39');
					return;
				case 'left':
					builder.push('e.keyCode===37');
					return;
				case 'f1':
				case 'f2':
				case 'f3':
				case 'f4':
				case 'f5':
				case 'f6':
				case 'f7':
				case 'f8':
				case 'f9':
				case 'f10':
				case 'f11':
				case 'f12':
					var a = item.toUpperCase();
					builder.push('e.key===\'{0}\''.format(a));
					stop[a] = true;
					return;
				case 'capslock':
					builder.push('e.which===20');
					return;
			}

			var num = item.parseInt();
			if (num)
				builder.push('e.which===' + num);
			else
				builder.push('e.key===\'{0}\''.format(item));

		});

		items.push({ fn: new Function('e', 'return ' + builder.join('&&')), callback: callback });
		length = items.length;
		return self;
	};
});

COMPONENT('page', function(self, config) {

    var type = 0;

    self.readonly();

    self.hide = function() {
        self.set('');
    };

    self.setter = function(value) {

        if (type === 1)
            return;

        var is = config.if == value;

        if (type === 2 || !is) {
            self.toggle('hidden', !is);
            is && config.reload && self.get(config.reload)();
            self.release(!is);
            return;
        }

        config.loading === 'true' && SETTER('loading', 'show');
        type = 1;

        self.import(config.template, function() {
            type = 2;

            if (config.init) {
                var fn = GET(config.init || '');
                typeof(fn) === 'function' && fn(self);
            }

            config.reload && self.get(config.reload)();

            setTimeout(function() {
                self.toggle('hidden', !is);
            }, 200);

            SETTER('loading', 'hide', 1000);
        }, false);
    };
});

COMPONENT('grid', 'filter:true;external:false;fillcount:50;filterlabel:Filtering values ...;boolean:true|on|yes;pluralizepages:# pages,# page,# pages,# pages;pluralizeitems:# items,# item,# items,# items;pagination:false;rowheight:30', function(self, config) {

    var tbody, thead, tbodyhead, container, pagination;
    var options = { columns: {}, items: [], indexer: 0, filter: {} };
    var isFilter = false;
    var ppages, pitems, cache, eheight, wheight, scroll, filled = false;

    self.template = Tangular.compile('<td data-index="{{ index }}"{{ if $.cls }} class="{{ $.cls }}"{{ fi }}><div class="wrap{{ if align }} {{ align }}{{ fi }}"{{ if background }} style="background-color:{{ background }}"{{ fi }}>{{ value | raw }}</div></td>');
    self.options = options;
    self.readonly();

    self.make = function() {

        var meta = self.find('script').html();
        self.aclass('ui-grid-container' + (config.autosize ? '' : ' hidden'));
        self.html('<div class="ui-grid"><table class="ui-grid-header"><thead></thead></table><div class="ui-grid-scroller"><table class="ui-grid-data"><thead></thead><tbody></tbody></table></div></div>' + (config.pagination ? '<div class="ui-grid-footer hidden"><div class="ui-grid-meta"></div><div class="ui-grid-pagination"><button class="ui-grid-button" name="first"><i class="fa fa-angle-double-left"></i></button><button class="ui-grid-button" name="prev"><i class="fa fa-angle-left"></i></button><div class="page"><input type="text" maxlength="5" class="ui-grid-input" /></div><button class="ui-grid-button" name="next"><i class="fa fa-angle-right"></i></button><button class="ui-grid-button" name="last"><i class="fa fa-angle-double-right"></i></button></div><div class="ui-grid-pages"></div></div></div>' : ''));

        var body = self.find('.ui-grid-data');
        tbody = $(body.find('tbody').get(0));
        tbodyhead = $(body.find('thead').get(0));
        thead = $(self.find('.ui-grid-header').find('thead').get(0));
        container = $(self.find('.ui-grid-scroller').get(0));
        pagination = config.pagination ? VIRTUALIZE(self.find('.ui-grid-footer'), { page: 'input', first: 'button[name="first"]', last: 'button[name="last"]', prev: 'button[name="prev"]', next: 'button[name="next"]', meta: '.ui-grid-meta', pages: '.ui-grid-pages' }) : null;
        meta && self.meta(meta);

        self.event('click', '.ui-grid-columnsort', function() {
            var obj = {};
            obj.columns = options.columns;
            obj.column = options.columns[+$(this).attr('data-index')];
            self.sort(obj);
        });

        self.event('change', '.ui-grid-filter', function() {
            var el = $(this).parent();
            if (this.value)
                options.filter[this.name] = this.value;
            else
                delete options.filter[this.name];
            el.tclass('ui-grid-selected', this.value ? true : false);
            scroll = true;
            self.filter();
        });

        self.event('change', 'input', function() {
            this.type === 'checkbox' && config.checked && EXEC(config.checked, this, self);
        });

        self.event('click', '.ui-grid-button', function() {
            switch (this.name) {
                case 'first':
                    scroll = true;
                    cache.page = 1;
                    self.operation('pagination');
                    break;
                case 'last':
                    scroll = true;
                    cache.page = cache.pages;
                    self.operation('pagination');
                    break;
                case 'prev':
                    scroll = true;
                    cache.page -= 1;
                    self.operation('pagination');
                    break;
                case 'next':
                    scroll = true;
                    cache.page += 1;
                    self.operation('pagination');
                    break;
            }
        });

        self.event('change', '.ui-grid-input', function() {
            var page = (+this.value) >> 0;
            if (isNaN(page) || page < 0 || page > cache.pages || page === cache.page)
                return;
            scroll = true;
            cache.page = page;
            self.operation('pagination');
        });

        tbody.on('click', 'button', function() {
            var btn = $(this);
            var tr = btn.closest('tr');
            config.button && EXEC(config.button, btn, options.items[+tr.attrd('index')], self);
        });

        self.on('resize', self.resize);
        config.init && EXEC(config.init);
        wheight = $(window).height();
    };

    self.checked = function(value) {
        if (typeof(value) === 'boolean')
            self.find('input[type="checkbox"]').prop('checked', value);
        else
            return tbody.find('input:checked');
    };

    self.meta = function(html) {
        switch (typeof(html)) {
            case 'string':
                options.columns = new Function('return ' + html.trim())();
                break;
            case 'function':
                options.columns = html(self);
                break;
            case 'object':
                options.columns = html;
                break;
        }

        for (var i = 0; i < options.columns.length; i++) {
            var column = options.columns[i];

            if (typeof(column.header) === 'string' && column.header.indexOf('{{') !== -1)
                column.header = Tangular.compile(column.header);

            if (typeof(column.template) === 'string')
                column.template = column.template.indexOf('{{') === -1 ? new Function('a', 'b', 'return \'' + column.template + '\'') : Tangular.compile(column.template);
        }

        self.rebuild(true);
    };

    self.configure = function(key, value) {
        switch (key) {
            case 'pluralizepages':
                ppages = value.split(',').trim();
                break;
            case 'pluralizeitems':
                pitems = value.split(',').trim();
                break;
        }
    };

    self.cls = function(d) {
        var a = [];
        for (var i = 1; i < arguments.length; i++) {
            var cls = arguments[i];
            cls && a.push(cls);
        }
        return a.length ? ((d ? ' ' : '') + a.join(' ')) : '';
    };

    self.rebuild = function(init) {

        var data = ['<tr class="ui-grid-empty">'];
        var header = ['<tr>'];
        var filter = ['<tr>'];

        var size = 0;
        var columns = options.columns;
        var scrollbar = SCROLLBARWIDTH();

        for (var i = 0, length = columns.length; i < length; i++) {
            var col = columns[i];

            if (typeof(col.size) !== 'string')
                size += col.size || 1;

            col.sorting = null;

            if (typeof(col.render) === 'string')
                col.render = FN(col.render);

            if (typeof(col.header) === 'string')
                col.header = FN(col.header);

            col.cls = self.cls(0, col.classtd, col.class);
        }

        for (var i = 0, length = columns.length; i < length; i++) {
            var col = columns[i];
            var width = typeof(col.size) === 'string' ? col.size : ((((col.size || 1) / size) * 100).floor(2) + '%');

            data.push('<td style="width:{0}" data-index="{1}" class="{2}"></td>'.format(width, i, self.cls(0, col.classtd, col.class)));
            header.push('<th class="ui-grid-columnname{3}{5}" style="width:{0};text-align:center" data-index="{1}" title="{6}" data-name="{4}"><div class="wrap"><i class="fa hidden ui-grid-fa"></i>{2}</div></th>'.format(width, i, col.header ? col.header(col) : (col.text || col.name), self.cls(1, col.classth, col.class), col.name, col.sort === false ? '' : ' ui-grid-columnsort', col.title || col.text || col.name));
            if (col.filter === false)
                filter.push('<th class="ui-grid-columnfilterempty ui-grid-columnfilter{1}" style="width:{0}">&nbsp;</th>'.format(width, self.cls(1, col.classfilter, col.class)));
            else
                filter.push('<th class="ui-grid-columnfilter{4}" style="width:{0}"><input type="text" placeholder="{3}" name="{2}" autocomplete="off" class="ui-grid-filter" /></th>'.format(width, i, col.name, col.filter || config.filterlabel, self.cls(1, col.classfilter, col.class)));
        }

        if (scrollbar) {
            header.push('<th class="ui-grid-columnname ui-grid-scrollbar" style="width:{0}px"></th>'.format(scrollbar));
            filter.push('<th class="ui-grid-columnfilterempty ui-grid-scrollbar ui-grid-columnfilter{1}" style="width:{0}px">&nbsp;</th>'.format(scrollbar, self.cls(1, col.classtd, col.class)));
        }

        tbodyhead.html(data.join('') + '</tr>');
        thead.html(header.join('') + '</tr>' + (config.filter ? (filter.join('') + '</tr>') : ''));
        !init && self.refresh();
        isFilter = false;
        options.filter = {};
    };

    self.fill = function() {

        if (config.autosize === false || filled)
            return;

        filled = true;
        tbody.find('.emptyfill').remove();
        var builder = ['<tr class="emptyfill">'];

        var cols = options.columns;
        for (var i = 0, length = cols.length; i < length; i++) {
            var col = cols[i];
            if (!col.hidden) {
                var cls = self.cls(0, col.classtd, col.class);
                builder.push('<td{0}>'.format(cls ? (' class="' + cls + '"') : '') + (i ? '' : '<div class="wrap">&nbsp;</div>') + '</td>');
            }
        }

        builder.push('</tr>');
        builder = builder.join('');
        var buffer = [];
        for (var i = 0; i < config.fillcount; i++)
            buffer.push(builder);
        tbody.append(buffer.join(''));
    };

    self.resize = function(delay) {

        if (config.autosize === false) {
        	self.hclass('hidden') && self.rclass('hidden');
            return;
        }

        setTimeout2(self.id + '.resize', function() {

            var parent = self.parent().height();
            if (parent < wheight / 3)
                return;

            var value = options.items;
            var height = parent - (config.padding || 0) - (config.pagination ? 105 : 74);

            if (height === eheight)
                return;

            container.height(height);
            eheight = height;

            var cls = 'ui-grid-noscroll';
            var count = (height / config.rowheight) >> 0;
            if (count > value.length) {
                self.fill(config.fillcount);
                self.aclass(cls);
            } else
                self.rclass(cls);

            pagination && pagination.rclass('hidden');
            eheight && self.rclass('hidden');
        }, typeof(delay) === 'number' ? delay : 50);
    };

    self.limit = function() {
        return Math.ceil(container.height() / config.rowheight);
    };

    self.filter = function() {
        isFilter = Object.keys(options.filter).length > 0;
        !config.external && self.refresh();
        self.operation('filter');
    };

    self.operation = function(type) {
        if (type === 'filter')
            cache.page = 1;
        config.exec && EXEC(config.exec, type, isFilter ? options.filter : null, options.lastsort ? options.lastsort : null, cache.page, self);
    };

    self.sort = function(data) {

        options.lastsortelement && options.lastsortelement.rclass('fa-caret-down fa-caret-up').aclass('hidden');

        if (data.column.sorting === 'desc') {
            options.lastsortelement.find('.ui-grid-fa').rclass('fa-caret-down fa-caret-up').aclass('hidden');
            options.lastsortelement = null;
            options.lastsort = null;
            data.column.sorting = null;

            if (config.external)
                self.operation('sort');
            else
                self.refresh();

        } else if (data.column) {
            data.column.sorting = data.column.sorting === 'asc' ? 'desc' : 'asc';
            options.lastsortelement = thead.find('th[data-name="{0}"]'.format(data.column.name)).find('.ui-grid-fa').rclass('hidden').tclass('fa-caret-down', data.column.sorting === 'asc').tclass('fa-caret-up', data.column.sorting === 'desc');
            options.lastsort = data.column;

            var name = data.column.name;
            var sort = data.column.sorting;

            !config.external && options.lastsort && options.items.quicksort(name, sort === 'asc');
            self.operation('sort');
            self.redraw();
        }
    };

    self.can = function(row) {

        var keys = Object.keys(options.filter);
        var cache = {};

        for (var i = 0; i < keys.length; i++) {

            var column = keys[i];
            var val = row[column];
            var filter = options.filter[column];
            var type = typeof(val);
            var val2 = cache[column];

            if (val instanceof Array) {
                val = val.join(' ');
                type = 'string';
            }

            if (type === 'number') {

                if (val2 == null)
                    val2 = cache[column] = self.parseNumber(filter);

                if (val2.length === 1 && val !== val2[0])
                    return false;

                if (val < val2[0] || val > val2[1])
                    return false;

            } else if (type === 'string') {

                if (val2 == null) {
                    val2 = cache[column] = filter.split(/\/\|\\|,/).trim();
                    for (var j = 0; j < val2.length; j++)
                        val2[j] = val2[j].toSearch();
                }

                var is = false;
                var s = val.toSearch();

                for (var j = 0; j < val2.length; j++) {
                    if (s.indexOf(val2[j]) !== -1) {
                        is = true;
                        break;
                    }
                }

                if (!is)
                    return false;

            } else if (type === 'boolean') {
                if (val2 == null)
                    val2 = cache[column] = config.boolean.indexOf(filter.replace(/\s/g, '')) !== -1;
                if (val2 !== val)
                    return false;
            } else if (val instanceof Date) {

                val.setHours(0);
                val.setMinutes(0);

                if (val2 == null) {
                    val2 = filter.trim().split(/\/|\||\\|,/).trim();
                    var arr = cache[column] = [];
                    for (var j = 0; j < val2.length; j++) {
                        var dt = val2[j].trim();
                        var a = self.parseDate(dt);
                        if (a instanceof Array) {
                            arr.push(a[0]);
                            if (j === val2.length - 1) {
                                arr.push(a[1]);
                                break;
                            }
                        } else
                            arr.push(a);
                    }
                    val2 = arr;
                }

                if (val2.length === 1 && val.format('yyyyMMdd') !== val2[0].format('yyyyMMdd'))
                    return false;
                if (val < val2[0] || val > val2[1])
                    return false;
            } else
                return false;
        }

        return true;
    };

    self.parseDate = function(val) {
        var index = val.indexOf('.');
        if (index === -1) {
            if ((/[a-z]+/).test(val)) {
                var dt = DATETIME.add(val);
                return dt > DATETIME ? [DATETIME, dt] : [dt, DATETIME];
            }
            if (val.length === 4)
                return [new Date(+val, 1, 1), new Date(+val + 1, 1, 1)];
        } else if (val.indexOf('.', index + 1) === -1) {
            var a = val.split('.');
            return new Date(DATETIME.getFullYear(), +a[1] - 1, +a[0]);
        }
        index = val.indexOf('-');
        if (index !== -1 && val.indexOf('-', index + 1) === -1) {
            var a = val.split('-');
            return new Date(DATETIME.getFullYear(), +a[0] - 1, +a[1]);
        }
        return val.parseDate();
    };

    self.parseNumber = function(val) {
        var arr = [];
        var num = val.replace(/\s/g, '').replace(/,/g, '.').split(/\/|\||\\/).trim();

        for (var i = 0, length = num.length; i < length; i++) {
            var n = num[i];
            arr.push(+n);
        }

        return arr;
    };

    self.reset = function() {
        options.filter = {};
        isFilter = false;
        thead.find('input').val('');
        thead.find('.ui-grid-selected').rclass('ui-grid-selected');
        options.lastsortelement && options.lastsortelement.rclass('fa-caret-down fa-caret-up');
        options.lastsortelement = null;
        if (options.lastsort)
            options.lastsort.sorting = null;
        options.lastsort = null;
    };

    self.redraw = function() {

        var items = options.items;
        var columns = options.columns;
        var builder = [];
        var m = {};

        for (var i = 0, length = items.length; i < length; i++) {
            builder.push('<tr class="ui-grid-row" data-index="' + i + '">');
            for (var j = 0, jl = columns.length; j < jl; j++) {
                var column = columns[j];
                var val = items[i][column.name];
                m.value = column.template ? column.template(items[i], column) : column.render ? column.render(val, column, items[i]) : val == null ? '' : (column.format ? val.format(column.format) : val);
                m.index = j;
                m.align = column.align;
                m.background = column.background;
                builder.push(self.template(m, column));
            }
            builder.push('</tr>');
        }

        tbody.find('.ui-grid-row').remove();
        tbody.prepend(builder.join(''));
        container.rclass('noscroll');
        scroll && container.prop('scrollTop', 0);
        scroll = false;
        eheight = 0;
        self.resize(0);
    };

    self.setter = function(value) {

        // value.items
        // value.limit
        // value.page
        // value.pages
        // value.count

        if (!value) {
            tbody.find('.ui-grid-row').remove();
            self.resize();
            return;
        }

        cache = value;

        if (config.pagination) {
            pagination.prev.prop('disabled', value.page === 1);
            pagination.first.prop('disabled', value.page === 1);
            pagination.next.prop('disabled', value.page >= value.pages);
            pagination.last.prop('disabled', value.page === value.pages);
            pagination.page.val(value.page);
            pagination.meta.html(value.count.pluralize.apply(value.count, pitems));
            pagination.pages.html(value.pages.pluralize.apply(value.pages, ppages));
        }

        if (config.external) {
            options.items = value.items;
        } else {
            options.items = [];
            for (var i = 0, length = value.items.length; i < length; i++) {
                if (isFilter && !self.can(value.items[i]))
                    continue;
                options.items.push(value.items[i]);
            }
            options.lastsort && options.items.quicksort(options.lastsort.name, options.lastsort.sorting === 'asc');
        }

        self.redraw();
        config.checked && EXEC(config.checked, null, self);
    };
});

COMPONENT('mqtt', 'reconnect:2000', function(self, config) {

	var client, url;
	var queue = [];
	var sending = false;
	var connected = false;

	self.online = false;
	self.readonly();

	self.make = function() {
		if (!config.url)
			return; //console.log('MQTT ERROR: no url specified');
		setTimeout(self.connect, 500);
	};

	self.publish = function(topic, message) {
		queue.push({topic: topic, message: encodeURIComponent(JSON.stringify(message))});
		self.process();
		return self;
	};

	self.process = function(callback) {

		if (!client || sending || !queue.length || !client.connected) {
			callback && callback();
			return;
		}

		sending = true;
		var async = queue.splice(0, 3);
		async.waitFor(function(item, next) {
			client.publish(item.topic, item.message);
			setTimeout(next, 5);
		}, function() {
			callback && callback();
			sending = false;
			queue.length && self.process();
		});
	};

	self.subscribe = function(topic) {
		client && client.subscribe(topic);
	};

	self.mqtt_connect = function(url) {
		if (url)
			config.url = url;
		client = mqtt.connect(config.url);
		client.on('message', function(topic, message){
			message = decodeURIComponent(message.toString());
			message[0] === '{' && (message = PARSE(message));
			EMIT('mqtt.message', topic, message);
		});
		client.on('connect', function(){
			connected = true;
			self.destroy = client.end;
			EMIT('mqtt.connected', self);
		});
		client.on('close', function(c){
			console.log('Closed', c);
		});
		client.on('error', function(e){
			console.log('Error', e);
		});
		return self;
	};

	self.connect = function() {
		client && self.close();
		setTimeout2(self.id, function() {
			self.mqtt_connect();
		}, 100);
		return self;
	};

	self.close = function() {
		connected = false;
		client = null;
		setTimeout(self.connect, config.reconnect);
	};
});
