'use strict';

// Port of lower_bound from http://en.cppreference.com/w/cpp/algorithm/lower_bound
// Used to compute insertion index to keep queue sorted after insertion

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function lowerBound(array, value, comp) {
	var first = 0;
	var count = array.length;

	while (count > 0) {
		var step = count / 2 | 0;
		var it = first + step;

		if (comp(array[it], value) <= 0) {
			first = ++it;
			count -= step + 1;
		} else {
			count = step;
		}
	}

	return first;
}

var PriorityQueue = function () {
	function PriorityQueue() {
		_classCallCheck(this, PriorityQueue);

		this._queue = [];
	}

	_createClass(PriorityQueue, [{
		key: 'enqueue',
		value: function enqueue(run, opts) {
			opts = Object.assign({
				priority: 0
			}, opts);

			var element = { priority: opts.priority, run: run };

			if (this.size && this._queue[this.size - 1].priority >= opts.priority) {
				this._queue.push(element);
				return;
			}

			var index = lowerBound(this._queue, element, function (a, b) {
				return b.priority - a.priority;
			});
			this._queue.splice(index, 0, element);
		}
	}, {
		key: 'dequeue',
		value: function dequeue() {
			return this._queue.shift().run;
		}
	}, {
		key: 'size',
		get: function get() {
			return this._queue.length;
		}
	}]);

	return PriorityQueue;
}();

var PQueue = function () {
	function PQueue(opts) {
		_classCallCheck(this, PQueue);

		opts = Object.assign({
			concurrency: Infinity,
			queueClass: PriorityQueue
		}, opts);

		if (opts.concurrency < 1) {
			throw new TypeError('Expected `concurrency` to be a number from 1 and up');
		}

		this.queue = new opts.queueClass(); // eslint-disable-line new-cap
		this._queueClass = opts.queueClass;
		this._pendingCount = 0;
		this._concurrency = opts.concurrency;
		this._resolveEmpty = function () {};
	}

	_createClass(PQueue, [{
		key: '_next',
		value: function _next() {
			this._pendingCount--;

			if (this.queue.size > 0) {
				this.queue.dequeue()();
			} else {
				this._resolveEmpty();
			}
		}
	}, {
		key: 'add',
		value: function add(fn, opts) {
			var _this = this;

			return new Promise(function (resolve, reject) {
				var run = function run() {
					_this._pendingCount++;

					fn().then(function (val) {
						resolve(val);
						_this._next();
					}, function (err) {
						reject(err);
						_this._next();
					});
				};

				if (_this._pendingCount < _this._concurrency) {
					run();
				} else {
					_this.queue.enqueue(run, opts);
				}
			});
		}
	}, {
		key: 'clear',
		value: function clear() {
			this.queue = new this._queueClass(); // eslint-disable-line new-cap
		}
	}, {
		key: 'onEmpty',
		value: function onEmpty() {
			var _this2 = this;

			return new Promise(function (resolve) {
				var existingResolve = _this2._resolveEmpty;
				_this2._resolveEmpty = function () {
					existingResolve();
					resolve();
				};
			});
		}
	}, {
		key: 'size',
		get: function get() {
			return this.queue.size;
		}
	}, {
		key: 'pending',
		get: function get() {
			return this._pendingCount;
		}
	}]);

	return PQueue;
}();

module.exports = PQueue;
