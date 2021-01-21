/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var SimpleEventEmitter = /** @class */ (function () {
    function SimpleEventEmitter() {
        this._events = {};
        this._events = {};
    }
    SimpleEventEmitter.prototype.on = function (eventName, handler) {
        if (!this._events[eventName]) {
            this._events[eventName] = [];
        }
        this._events[eventName].push(handler);
    };
    SimpleEventEmitter.prototype.off = function (eventName, handler) {
        if (!handler) {
            delete this._events[eventName];
            return;
        }
        var index = (this._events[eventName] || []).indexOf(handler);
        return ~index && this._events[eventName].splice(index, 1);
    };
    SimpleEventEmitter.prototype.once = function (eventName, handler) {
        var _this = this;
        var fn = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            handler.apply(_this, args);
            _this.off(eventName, fn);
        };
        this.on(eventName, fn);
    };
    SimpleEventEmitter.prototype.emit = function (eventName) {
        var _this = this;
        var params = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            params[_i - 1] = arguments[_i];
        }
        (this._events[eventName] || []).forEach(function (handler) {
            typeof handler === 'function' && handler.apply(_this, params);
        });
    };
    return SimpleEventEmitter;
}());

var getLen = function (v) { return Math.sqrt(v.x * v.x + v.y * v.y); };
var getAngle = function (v1, v2) {
    var mr = getLen(v1) * getLen(v2);
    if (mr === 0) {
        return 0;
    }
    var r = (v1.x * v2.x + v1.y * v2.y) / mr;
    return Math.acos(Math.min(r, 1));
};
var SimpleTouch = /** @class */ (function (_super) {
    __extends(SimpleTouch, _super);
    function SimpleTouch(el, options) {
        if (options === void 0) { options = {}; }
        var _this = this;
        el = (el && typeof el === 'string' ? document.querySelector(el) : el);
        if (!el || el.nodeType !== 1 || typeof window === undefined) {
            return;
        }
        _this = _super.call(this) || this;
        _this.el = el;
        _this.options = options || {};
        // 初始化
        if (options.on) {
            Object.keys(options.on).forEach(function (eventKey) {
                if (Array.isArray(options.on[eventKey])) {
                    options.on[eventKey].forEach(function (handler) { return _this.on(eventKey, handler); });
                }
                else {
                    _this.on(eventKey, options.on[eventKey]);
                }
            });
        }
        ['onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel'].forEach(function (eventName) {
            _this[eventName] = _this[eventName].bind(_this);
            _this.el.addEventListener(eventName.slice(2).toLowerCase(), _this[eventName], false);
        });
        return _this;
    }
    SimpleTouch.prototype.destroy = function () {
        var _this = this;
        ['onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel'].forEach(function (eventName) {
            _this.el.removeEventListener(eventName.slice(2).toLowerCase(), _this[eventName]);
        });
        this.el = document.body;
        this.options = {};
    };
    /**
     * touches: A list of information for every finger currently touching the screen
     * targetTouches: Like touches, but is filtered to only the information for finger touches that started out within the same node.
     * @param e
     */
    SimpleTouch.prototype.onTouchStart = function (e) {
        var _this = this;
        if (!e.touches) {
            return;
        }
        this.now = Date.now();
        this.x1 = e.touches[0].pageX;
        this.y1 = e.touches[0].pageY;
        var delta = Date.now() - (this.last || this.now);
        if (this.preX1 !== undefined) {
            if (delta > 0 && delta < 250 && Math.abs(this.preX1 - this.x1) < 30 && Math.abs(this.preY1 - this.y1) < 30) {
                this.isDoubleTap = true;
                this.preventTap = true;
            }
        }
        this.preX1 = this.x1;
        this.preY1 = this.y1;
        this.last = this.now;
        if (e.touches.length > 1) {
            this.cancelLongTap();
            this.cancelSingleTap();
            this.preV = { x: e.touches[0].pageX - e.touches[0].pageY };
            this.pinchStartLen = getLen(this.preV);
        }
        this.longTapTid = setTimeout(function () {
            _this.preventTap = true; // diable tap
            _this.emit('longTap');
        }, 750);
        // 检测边缘，阻止ios edge swipe的触发
        if (this.x1 <= 20 || (window.innerWidth - this.x1 <= 20)) {
            this.preventSwipe = true;
        }
        this.emit('touchstart', { event: e }); // 触发touchstart
    };
    SimpleTouch.prototype.cancelLongTap = function () {
        clearTimeout(this.longTapTid);
    };
    SimpleTouch.prototype.cancelSingleTap = function () {
        clearTimeout(this.singleTapTid);
    };
    SimpleTouch.prototype.onTouchMove = function (e) {
        if (!e.touches) {
            return;
        }
        this.isDoubleTap = false;
        this.x2 = e.touches[0].pageX;
        this.y2 = e.touches[0].pageY;
        if (e.touches.length > 1 && this.preV) {
            var tempV = { x: this.x2 - e.touches[1].pageX, y: this.y2 - e.touches[1].pageY };
            var zoom = this.pinchStartLen ? getLen(tempV) / this.pinchStartLen : 1;
            var angle = getAngle(tempV, this.preV);
            this.pinchStartLen && this.emit('pinch', { event: e, angle: angle, zoom: zoom });
            this.emit('rotate', { event: e, angle: angle, zoom: zoom });
            this.preV = tempV;
        }
        if (this.x2 && (Math.abs(this.x1 - this.x2) > 10 || Math.abs(this.y1 - this.y2 || 0) > 10)) {
            this.preventTap = true;
        }
        // 页面滚动的情况下，阻止swipe的触发
        if (this.options.swipeDirection && !this.preventSwipe) {
            var _a = (Math.atan2(Math.abs(this.x2 - this.x1), Math.abs(this.y2 - this.y1)) * 180) / Math.PI;
            this.preventSwipe = this.options.swipeDirection === 'horizontal' ? _a > 45 || this.x2 - this.x1 === 0 : _a < 45 || this.y2 - this.y1 === 0;
        }
        this.emit('touchmove', { event: e });
        this.cancelLongTap();
    };
    SimpleTouch.prototype.onTouchEnd = function (e) {
        var _this = this;
        if (!e.changedTouches) {
            return;
        }
        this.cancelLongTap();
        var timeDiff = Date.now() - this.now;
        if (!this.preventSwipe && this.options.swipeDirection) {
            var direction = this.options.swipeDirection === 'horizontal' ? this.x2 - this.x1 : this.y2 - this.y1;
            this.emit('swipe', { event: e, timeDiff: timeDiff, direction: direction > 0 ? 'prev' : 'next' });
        }
        else {
            this.tapTid = setTimeout(function () {
                !_this.preventTap && _this.emit('tap');
                if (_this.isDoubleTap) {
                    _this.emit('doubleTap');
                    _this.isDoubleTap = false;
                }
            }, 0);
            if (!this.isDoubleTap) {
                this.singleTapTid = setTimeout(function () { return _this.emit('singleTap'); }, 250);
            }
        }
        this.emit('touchend', { event: e });
        this.x1 = this.x2 = this.y1 = this.y2 = null;
        this.isDoubleTap = false;
        this.preV = null;
        this.pinchStartLen = null;
    };
    SimpleTouch.prototype.onTouchCancel = function () {
        this.cancelLongTap();
        this.cancelSingleTap();
        clearTimeout(this.tapTid);
        this.preventTap = false;
        this.preventSwipe = false;
    };
    return SimpleTouch;
}(SimpleEventEmitter));

export default SimpleTouch;
