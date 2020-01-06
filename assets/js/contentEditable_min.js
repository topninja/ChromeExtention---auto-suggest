/*
 * highlight-within-contenEditable
 *
 * @author  Rakesh Patil
 */

(function ($) {
	let ID = 'hwt';

	let HighlightWithinTextarea = function ($el, config) {
		this.init($el, config);
	};

	HighlightWithinTextarea.prototype = {
		init: function ($el, config) {
			this.$el = $el;
			this.$el.attr('spellcheck', false);
			// backwards compatibility with v1 (deprecated)
			if (this.getType(config) === 'function') {
				// debug && console.log("function");
				config = { highlight: config };
			}

			if (this.getType(config) === 'custom') {
				this.highlight = config;
				// debug && console.log("custom");
				this.generate();
			} else {
				console.error('valid config object not provided');
			}
		},

		// returns identifier strings that aren't necessarily "real" JavaScript types
		getType: function (instance) {
			let type = typeof instance;
			// debug && console.log(instance);
			if (!instance) {
				return 'falsey';
			} else if (Array.isArray(instance)) {
				if (instance.length === 2 && typeof instance[0] === 'number' && typeof instance[1] === 'number') {
					return 'range';
				} else {
					return 'array';
				}
			} else if (type === 'object') {
				if (instance instanceof RegExp) {
					return 'regexp';
				} else if (instance.hasOwnProperty('highlight')) {
					return 'custom';
				}
			} else if (type === 'function' || type === 'string') {
				return type;
			}
			// else if(instance instanceof Promise){
			// 	return ''
			// }

			return 'other';
		},

		generate: function () {

			var padding = this.$el.css('padding');
			var margin = this.$el.css('margin');
			var font = this.$el.css('font');
			var lineHeight = this.$el.css('lineHeight');
			var boxShadow = this.$el.css('boxShadow');
			var border = this.$el.css('border');
			var letterSpacing = this.$el.css('letter-spacing');
			this.$el.css({ padding: 0, border: 'none', boxShadow: 'none' });
			var width = this.$el[0].scrollWidth;
			var height = this.$el[0].scrollHeight;
			// var elStyles = this.$el.getStyleObject();
			// debug && console.log(width);
			this.$el.css({
				height: height + 'px',
				width: width + 'px',
				margin: 0, padding, boxShadow, border,
				background: 'transparent'
			});
			this.$el
				.attr('style', function (i, s) { return (s || '') + 'overflow: auto !important;' })
				.addClass(ID + '-input ' + ID + '-content')
				// .on('input.' + ID, this.handleInput.bind(this))
				.on('scroll.' + ID, this.handleScroll.bind(this))
				.on('keyup.' + ID, this.handleInput.bind(this));

			this.$highlights = $('<div>', { class: ID + '-highlights ' + ID + '-content  hwtCE' });
			this.$highlights.css({
				font,
				lineHeight,
				padding: 0,
				letterSpacing
			});
			this.$backdrop = $('<div>', { class: ID + '-backdrop hwtCE' })
				// .attr('style', elStyles)
				.css({ height: height + 'px', width: width + 'px', padding })
				.append(this.$highlights);

			this.$container = $('<div>', { class: ID + '-container hwtCE' })
				.css({ margin, height: height + 'px', width: width + 'px' })
				.insertAfter(this.$el)
				.append(this.$backdrop, this.$el) // moves $el into $container
				.on('scroll', this.blockContainerScroll.bind(this));

			this.browser = this.detectBrowser();
			switch (this.browser) {
				case 'firefox':
					this.fixFirefox();
					break;
				case 'ios':
					this.fixIOS();
					break;
			}

			// plugin function checks this for success
			this.isGenerated = true;

			// trigger input event to highlight any existing input
			this.handleInput();
		},

		// browser sniffing sucks, but there are browser-specific quirks to handle
		// that are not a matter of feature detection
		detectBrowser: function () {
			let ua = window.navigator.userAgent.toLowerCase();
			if (ua.indexOf('firefox') !== -1) {
				return 'firefox';
			} else if (!!ua.match(/msie|trident\/7|edge/)) {
				return 'ie';
			} else if (!!ua.match(/ipad|iphone|ipod/) && ua.indexOf('windows phone') === -1) {
				// Windows Phone flags itself as "like iPhone", thus the extra check
				return 'ios';
			} else {
				return 'other';
			}
		},

		// Firefox doesn't show text that scrolls into the padding of a textarea, so
		// rearrange a couple box models to make highlights behave the same way
		fixFirefox: function () {
			// take padding and border pixels from highlights div
			let padding = this.$highlights.css([
				'padding-top', 'padding-right', 'padding-bottom', 'padding-left'
			]);
			let border = this.$highlights.css([
				'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'
			]);
			this.$highlights.css({
				'padding': '0',
				'border-width': '0'
			});

			this.$backdrop
				.css({
					// give padding pixels to backdrop div
					'margin-top': '+=' + padding['padding-top'],
					'margin-right': '+=' + padding['padding-right'],
					'margin-bottom': '+=' + padding['padding-bottom'],
					'margin-left': '+=' + padding['padding-left'],
				})
				.css({
					// give border pixels to backdrop div
					'margin-top': '+=' + border['border-top-width'],
					'margin-right': '+=' + border['border-right-width'],
					'margin-bottom': '+=' + border['border-bottom-width'],
					'margin-left': '+=' + border['border-left-width'],
				});
		},

		// iOS adds 3px of (unremovable) padding to the left and right of a textarea,
		// so adjust highlights div to match
		fixIOS: function () {
			this.$highlights.css({
				'padding-left': '+=3px',
				'padding-right': '+=3px'
			});
		},

		handleKeyUp: function () {			
			let input = this.$el.html();
			input = decodeEntities(input);
			// if (/\s$/.test(input)) {
			// 	if (input.length > 3) {
			let ranges = this.getRanges(input, this.highlight);
			debug && console.log("1");
			if (ranges instanceof Promise) {
				ranges.then((rangesres) => {
					const unstaggeredRanges = this.removeStaggeredRanges(rangesres);
					debug && console.log("2");
					if (unstaggeredRanges instanceof Promise) {
						unstaggeredRanges.then((unstaggeredranges) => {
							const boundaries = this.getBoundaries(unstaggeredranges);
							if (boundaries instanceof Promise) {
								debug && console.log("3");
								boundaries.then((res) => {
									this.renderMarks(res);
								});
							} else {
								debug && console.log("3");
								this.renderMarks(boundaries);
							}
						});
					} else {
						const boundaries = this.getBoundaries(unstaggeredRanges);
						debug && console.log("3");
						if (boundaries instanceof Promise) {
							boundaries.then((res) => {
								this.renderMarks(res);
							});
						} else {
							this.renderMarks(boundaries);
						}
					}
				});
			} else {
				const unstaggeredRanges = this.removeStaggeredRanges(ranges);
				debug && console.log("2");
				if (unstaggeredRanges instanceof Promise) {
					unstaggeredRanges.then((unstaggeredranges) => {
						const boundaries = this.getBoundaries(unstaggeredranges);
						if (boundaries instanceof Promise) {
							debug && console.log("3");
							boundaries.then((res) => {
								this.renderMarks(res);
							});
						} else {
							debug && console.log("3");
							this.renderMarks(boundaries);
						}
					});
				} else {
					const boundaries = this.getBoundaries(unstaggeredRanges);
					debug && console.log("3");
					if (boundaries instanceof Promise) {
						boundaries.then((res) => {
							this.renderMarks(res);
						});
					} else {
						this.renderMarks(boundaries);
					}
				}
			}
			// 	}
			// }
		},

		handleInput: function (event) {
			if ($('#chromeTooltipWrapper').length > 0) {
				$('#chromeTooltipWrapper').html("");
			}
			if (event && (event.keyCode || event.charCode)) {
				if (event.keyCode === 32 || event.charCode === 32 || event.keyCode === 8 || event.charCode === 8) {
					console.log(event.keyCode || event.charCode);
					this.handleKeyUp();
				}
				// return;
			}
		},
		getRanges: function (input, highlight) {
			let type = this.getType(highlight);
			// debug && console.log("getRanges", type);
			switch (type) {
				case 'array':
					return this.getArrayRanges(input, highlight);
				case 'function':
					return this.getFunctionRanges(input, highlight).then((res) => {
						return res;
					});
				case 'regexp':
					return this.getRegExpRanges(input, highlight);
				case 'string':
					return this.getStringRanges(input, highlight);
				case 'range':
					return this.getRangeRanges(input, highlight);
				case 'custom':
					return this.getCustomRanges(input, highlight);
				default:
					if (!highlight) {
						// do nothing for falsey values
						return [];
					} else {
						console.error('unrecognized highlight type');
					}
			}
		},

		getArrayRanges: function (input, arr) {
			// debug && console.log("getArrayRanges", arr);
			let ranges = arr.map(this.getRanges.bind(this, input));
			return Array.prototype.concat.apply([], ranges);
		},

		getFunctionRanges: async function (input, func) {
			const result = await func(input);
			debug && console.log("getFunctionRanges", result);
			return this.getRanges(input, result);
		},

		getRegExpRanges: function (input, regex) {
			let ranges = [];
			let match;
			while (match = regex.exec(input), match !== null) {
				ranges.push([match.index, match.index + match[0].length]);
				if (!regex.global) {
					// non-global regexes do not increase lastIndex, causing an infinite loop,
					// but we can just break manually after the first match
					break;
				}
			}
			return ranges;
		},

		getStringRanges: function (input, str) {
			let ranges = [];
			let inputLower = input.toLowerCase();
			let strLower = str.toLowerCase();
			let index = 0;
			while (index = inputLower.indexOf(strLower, index), index !== -1) {
				ranges.push([index, index + strLower.length]);
				index += strLower.length;
			}
			return ranges;
		},

		getRangeRanges: function (input, range) {
			return [range];
		},

		getCustomRanges: function (input, custom) {
			let ranges = this.getRanges(input, custom.highlight);
			if (ranges instanceof Promise) {
				return ranges.then((res) => {
					if (custom.className) {
						res.forEach(function (range) {
							// persist class name as a property of the array
							if (range.className) {
								range.className = custom.className + ' ' + range.className;
							} else {
								range.className = custom.className;
							}
						});
					}
					return res;
				});
			} else {
				if (custom.className) {
					ranges.forEach(function (range) {
						// persist class name as a property of the array
						if (range.className) {
							range.className = custom.className + ' ' + range.className;
						} else {
							range.className = custom.className;
						}
					});
				}
				return res;
			}
		},

		// prevent staggered overlaps (clean nesting is fine)
		removeStaggeredRanges: function (ranges) {
			let unstaggeredRanges = [];
			if (ranges instanceof Promise) {
				return ranges.then((res) => {
					res.forEach(function (range) {
						let isStaggered = unstaggeredRanges.some(function (unstaggeredRange) {
							let isStartInside = range[0] > unstaggeredRange[0] && range[0] < unstaggeredRange[1];
							let isStopInside = range[1] > unstaggeredRange[0] && range[1] < unstaggeredRange[1];
							return isStartInside !== isStopInside; // xor
						});
						if (!isStaggered) {
							unstaggeredRanges.push(range);
						}
					});
					// debug && console.log("removeStaggeredRanges");
					return unstaggeredRanges;
				});
			} else {
				ranges.forEach(function (range) {
					let isStaggered = unstaggeredRanges.some(function (unstaggeredRange) {
						let isStartInside = range[0] > unstaggeredRange[0] && range[0] < unstaggeredRange[1];
						let isStopInside = range[1] > unstaggeredRange[0] && range[1] < unstaggeredRange[1];
						return isStartInside !== isStopInside; // xor
					});
					if (!isStaggered) {
						unstaggeredRanges.push(range);
					}
				});
				// debug && console.log("removeStaggeredRanges");
				return unstaggeredRanges;
			}
		},

		getBoundaries: function (ranges) {
			let boundaries = [];
			if (ranges instanceof Promise) {
				return ranges.then((res) => {
					res.forEach(function (range) {
						boundaries.push({
							type: 'start',
							index: range[0],
							className: range.className
						});
						boundaries.push({
							type: 'stop',
							index: range[1]
						});
					});

					this.sortBoundaries(boundaries);
					// debug && console.log("getBoundaries");
					return boundaries;
				});
			} else {
				ranges.forEach(function (range) {
					boundaries.push({
						type: 'start',
						index: range[0],
						className: range.className
					});
					boundaries.push({
						type: 'stop',
						index: range[1]
					});
				});

				this.sortBoundaries(boundaries);
				// debug && console.log("getBoundaries");
				return boundaries;
			}
		},

		sortBoundaries: function (boundaries) {
			// backwards sort (since marks are inserted right to left)
			boundaries.sort(function (a, b) {
				if (a.index !== b.index) {
					return b.index - a.index;
				} else if (a.type === 'stop' && b.type === 'start') {
					return 1;
				} else if (a.type === 'start' && b.type === 'stop') {
					return -1;
				} else {
					return 0;
				}
			});
		},

		renderMarks: function (boundaries) {
			let input = this.$el.html();
			input = decodeEntities(input);
			// debug && console.log(boundaries);
			boundaries.forEach(function (boundary, index) {
				let markup;
				if (boundary.type === 'start') {
					markup = '{{hwt-mark-start|' + index + '}}';
				} else {
					markup = '{{hwt-mark-stop}}';
				}
				// debug && console.log(input.slice(0, boundary.index));
				// debug && console.log(input.slice(boundary.index));
				input = input.slice(0, boundary.index) + markup + input.slice(boundary.index);
			});

			// this keeps scrolling aligned when input ends with a newline
			input = input.replace(/\n(\{\{hwt-mark-stop\}\})?$/, '\n\n$1');

			// encode HTML entities
			input = input.replace(/</g, '&lt;').replace(/>/g, '&gt;');

			if (this.browser === 'ie') {
				// IE/Edge wraps whitespace differently in a div vs textarea, this fixes it
				input = input.replace(/ /g, ' <wbr>');
			}

			// replace start tokens with opening <mark> tags with class name
			var isMark = false;
			// debug && console.log(input);


			// var sel = window.getSelection();
			// var startIndex = sel.focusNode.nodeValue.indexOf(search);
			// var endIndex = startIndex + search.length;
			// if (startIndex === -1) { // search not found
			// 	continue;
			// }
			// var range = document.createRange();


			input = input.replace(/\{\{hwt-mark-start\|(\d+)\}\}/g, function (match, submatch) {
				var bm = boundaries[+submatch];
				var stopAt = boundaries[+(submatch - 1)];
				// debug && console.log(bm, stopAt);
				var className = bm.className;
				isMark = true;
				if (className) {
					// debug && console.log("bm", bm);
					return '<mark data-index="i_' + stopAt.index + '" class="' + className + ' test">';
				} else {
					return '<mark data-index="i_' + stopAt.index + '" >';
				}
			});

			// replace stop tokens with closing </mark> tags
			input = input.replace(/\{\{hwt-mark-stop\}\}/g, '</mark>');
			// debug && console.log(input);

			// this.$highlights.html(input);
			// if (isMark) {
			// 	this.highlight.renderToolip();
			// }
		},

		handleScroll: function () {
			this.$highlights.css('height', this.$el[0].scrollHeight + 'px');
			let scrollTop = this.$el.scrollTop();
			// debug && console.log(scrollTop);
			this.$backdrop.scrollTop(scrollTop);
			// console.log(this.$backdrop.scrollTop());

			let scrollLeft = this.$el.scrollLeft();
			this.$backdrop.css('transform', (scrollLeft > 0) ? 'translateX(' + -scrollLeft + 'px)' : '');
		},

		// in Chrome, page up/down in the textarea will shift stuff within the
		// container (despite the CSS), this immediately reverts the shift
		blockContainerScroll: function () {
			this.$container.scrollLeft(0);
		},

		destroy: function () {
			this.$backdrop.remove();
			this.$el
				.unwrap()
				.removeClass(ID + '-text ' + ID + '-input')
				.off(ID)
				.removeData(ID);
		}
	};

	// register the jQuery plugin
	$.fn.highlightWithinContentEditable = function (options) {

		return this.each(function () {
			let $this = $(this);
			let plugin = $this.data(ID);

			if (typeof options === 'string') {
				if (plugin) {
					switch (options) {
						case 'update':
							plugin.handleInput();
							break;
						case 'destroy':
							plugin.destroy();
							break;
						default:
							console.error('unrecognized method string');
					}
				} else {
					console.error('plugin must be instantiated first');
				}
			} else {
				if (plugin) {
					plugin.destroy();
				}
				// debug && console.log("HighlightWithinTextarea");
				plugin = new HighlightWithinTextarea($this, options);
				if (plugin.isGenerated) {
					$this.data(ID, plugin);
				}
			}
		});
	};

	$.fn.getStyleObject = function () {
		var dom = this.get(0);
		var style;
		var returns = {};
		if (window.getComputedStyle) {
			var camelize = function (a, b) {
				return b.toUpperCase();
			}
			style = window.getComputedStyle(dom, null);
			for (var i = 0; i < style.length; i++) {
				var prop = style[i];
				var camel = prop.replace(/\-([a-z])/g, camelize);
				var val = style.getPropertyValue(prop);
				returns[camel] = val;
			}
			return returns;
		}
		if (dom.currentStyle) {
			style = dom.currentStyle;
			for (var prop in style) {
				returns[prop] = style[prop];
			}
			return returns;
		}
		return this.css();
	}
})(jQuery);
