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

var getLen = function (v) { return Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2)); };
var getAngle = function (v1, v2) {
    var len = getLen(v1) * getLen(v2);
    if (len === 0) {
        return 0;
    }
    var r = (v1.x * v2.x + v1.y * v2.y) / len;
    return Math.acos(Math.min(r, 1));
};
var getRotateAngle = function (v1, v2) {
    var crossValue = v1.x * v2.y - v1.y * v2.x;
    return 180 * getAngle(v1, v2) * (crossValue > 0 ? -1 : 1) / Math.PI;
};
var eventNames = ['onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel'];
/**
 * longTap, tap, singleTap, doubleTap, swipe, rotate, pinch, pressmove
 * longTap 750ms, singleTap: 250ms
 * doubleTap: 250ms & deltaX|Y < 30: start -> end -> start -> end
**/
var SimpleTouch = /** @class */ (function (_super) {
    __extends(SimpleTouch, _super);
    function SimpleTouch(el, options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this) || this;
        _this.options = {};
        _this.longTapTid = null;
        _this.tapTid = null;
        _this.last = 0;
        _this.now = 0;
        _this.isDoubleTap = false;
        _this.startX = 0;
        _this.startY = 0;
        _this.lastX = 0;
        _this.lastY = 0;
        _this.lastV = null;
        _this.pinchStartLen = 1;
        _this.el = typeof el === 'string' ? document.querySelector(el) : el;
        if (!_this.el || _this.el.nodeType !== 1 || typeof window === undefined) {
            return _this;
        }
        _this.options = Object.assign({}, options);
        if (_this.options.on) {
            Object.keys(_this.options.on).forEach(function (eventName) {
                var handlers = _this.options.on[eventName];
                (Array.isArray(handlers) ? handlers : [handlers]).forEach(function (handler) { return _this.on(eventName, handler); });
            });
        }
        eventNames.forEach(function (eventName) {
            _this[eventName] = _this[eventName].bind(_this);
            var name = eventName.slice(2).toLowerCase();
            _this.el.addEventListener(name, _this[eventName], false);
        });
        return _this;
    }
    SimpleTouch.prototype.destroy = function () {
        var _this = this;
        eventNames.forEach(function (eventName) {
            var name = eventName.slice(2).toLowerCase();
            _this.el.removeEventListener(name, _this[eventName]);
        });
    };
    SimpleTouch.prototype.onTouchStart = function (e) {
        var _this = this;
        if (!e.touches) {
            return;
        }
        this.now = Date.now();
        this.startX = e.touches[0].pageX;
        this.startY = e.touches[0].pageY;
        var tapTimeDelta = this.now - (this.last || this.now);
        if (this.lastX && tapTimeDelta > 0 && tapTimeDelta < 250) {
            this.isDoubleTap = Math.abs(this.lastX - this.startX) < 30 && Math.abs(this.lastY - this.startY) < 30;
        }
        this.last = this.now;
        this.lastX = this.startX;
        this.lastY = this.startY;
        if (e.touches.length > 1) {
            this.lastV = { x: e.touches[1].pageX - this.startX, y: e.touches[1].pageY - this.startY };
            this.pinchStartLen = getLen(this.lastV);
        }
        this.longTapTid = setTimeout(function () {
            _this.emit('longTap', { e: e, timeDiff: Date.now() - (_this.now || Date.now()) });
        }, 750);
        this.emit('touchstart', { e: e });
    };
    SimpleTouch.prototype.onTouchMove = function (e) {
        if (!e.touches) {
            return;
        }
        this.isDoubleTap = false;
        this.cancelLongTap();
        var pageX = e.touches[0].pageX;
        var pageY = e.touches[0].pageY;
        if (e.touches.length > 1 && this.lastV) {
            var tempV = { x: e.touches[1].pageX - pageX, y: e.touches[1].pageY - pageY };
            var zoom = this.pinchStartLen ? getLen(tempV) / this.pinchStartLen : 1;
            var angle = getRotateAngle(tempV, this.lastV);
            this.emit('pinch', { e: e, zoom: zoom, angle: angle });
            this.emit('rotate', { e: e, zoom: zoom, angle: angle });
            this.lastV = tempV;
        }
        if (e.touches.length === 1) {
            this.emit('pressmove', { e: e, deltaX: pageX - this.lastX, deltaY: pageY - this.lastY });
        }
        this.lastX = pageX;
        this.lastY = pageY;
        this.emit('touchmove', { e: e });
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    };
    SimpleTouch.prototype.onTouchEnd = function (e) {
        var _this = this;
        if (!e.changedTouches) {
            return;
        }
        this.cancelLongTap();
        this.tapTid = setTimeout(function () {
            if (_this.isDoubleTap) {
                _this.isDoubleTap = false;
                _this.emit('doubleTap', { e: e });
            }
        }, 0);
        this.emit('touchend', { e: e });
    };
    SimpleTouch.prototype.onTouchCancel = function (e) {
        this.cancelLongTap();
        clearTimeout(this.tapTid);
        this.emit('touchcancel', { e: e });
    };
    SimpleTouch.prototype.cancelLongTap = function () {
        clearTimeout(this.longTapTid);
    };
    return SimpleTouch;
}(SimpleEventEmitter));

export default SimpleTouch;
