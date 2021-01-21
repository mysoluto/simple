import SimpleEventEmitter from '../../utils/event-emitter'

type SimpleTouchOptions = {
  [key: string] : any
}

type Vector = {
  x: number,
  y: number
}


const getLen = (v: Vector)  => Math.sqrt(v.x * v.x + v.y * v.y)

const getAngle = (v1: Vector, v2: Vector) => {
  const mr = getLen(v1) * getLen(v2)
  if (mr === 0) {
    return 0
  }
  const r = (v1.x * v2.x + v1.y * v2.y) / mr
  return Math.acos(Math.min(r, 1))
}


export default class SimpleTouch extends SimpleEventEmitter {
  [key: string]: any

  el!: HTMLElement
  options!: SimpleTouchOptions

  constructor(el: HTMLElement | string, options: SimpleTouchOptions = {}) {
    el = (el && typeof el === 'string' ? document.querySelector(el) as HTMLElement : el) as HTMLElement
    if (!el || el.nodeType !== 1 || typeof window === undefined) {
      return
    }

    super()
    this.el = el
    this.options = options || {}

    // 初始化
    if (options.on) {
      Object.keys(options.on).forEach((eventKey: string) => {
        if (Array.isArray(options.on[eventKey])) {
          options.on[eventKey].forEach((handler: Function) => this.on(eventKey, handler))
        } else {
          this.on(eventKey, options.on[eventKey])
        }
      })
    }

    ['onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel'].forEach((eventName: string) => {
      this[eventName] = this[eventName].bind(this)
      this.el.addEventListener(eventName.slice(2).toLowerCase(), this[eventName], false)
    })
  }

  destroy() {
    ['onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel'].forEach((eventName: string) => {
      this.el.removeEventListener(eventName.slice(2).toLowerCase(), this[eventName])
    })
    this.el = document.body
    this.options = {}
  }

  /**
   * touches: A list of information for every finger currently touching the screen
   * targetTouches: Like touches, but is filtered to only the information for finger touches that started out within the same node.
   * @param e
   */
  onTouchStart(e: TouchEvent) {
    if (!e.touches) {
      return
    }
    this.now = Date.now()

    this.x1 = e.touches[0].pageX
    this.y1 = e.touches[0].pageY

    const delta = Date.now() - (this.last || this.now)
    if (this.preX1 !== undefined) {
      if (delta > 0 && delta < 250 && Math.abs(this.preX1 - this.x1) < 30 && Math.abs(this.preY1 - this.y1) < 30) {
        this.isDoubleTap = true
        this.preventTap = true
      }
    }

    this.preX1 = this.x1
    this.preY1 = this.y1
    this.last = this.now

    if (e.touches.length > 1) {
      this.cancelLongTap()
      this.cancelSingleTap()
      this.preV = { x: e.touches[0].pageX - e.touches[0].pageY }
      this.pinchStartLen = getLen(this.preV)
    }

    this.longTapTid = setTimeout(() => {
      this.preventTap = true // diable tap
      this.emit('longTap')
    }, 750)

    // 检测边缘，阻止ios edge swipe的触发
    if (this.x1 <= 20 || (window.innerWidth - this.x1 <= 20)) {
      this.preventSwipe = true
    }

    this.emit('touchstart', { event: e }) // 触发touchstart
  }

  cancelLongTap() {
    clearTimeout(this.longTapTid)
  }

  cancelSingleTap() {
    clearTimeout(this.singleTapTid)
  }

  onTouchMove(e: TouchEvent) {
    if (!e.touches) {
      return
    }
    this.isDoubleTap = false
    this.x2 = e.touches[0].pageX
    this.y2 = e.touches[0].pageY

    if (e.touches.length > 1 && this.preV) {
      const tempV = { x: this.x2 - e.touches[1].pageX, y: this.y2 - e.touches[1].pageY }
      const zoom = this.pinchStartLen ? getLen(tempV) / this.pinchStartLen : 1
      const angle = getAngle(tempV, this.preV)
      this.pinchStartLen && this.emit('pinch', { event: e, angle, zoom })
      this.emit('rotate', { event: e, angle, zoom })
      this.preV = tempV
    }

    if (this.x2 && (Math.abs(this.x1 - this.x2) > 10 || Math.abs(this.y1 - this.y2 || 0) > 10)) {
      this.preventTap = true
    }

    // 页面滚动的情况下，阻止swipe的触发
    if (this.options.swipeDirection && !this.preventSwipe) {
      const _a = (Math.atan2(Math.abs(this.x2 - this.x1), Math.abs(this.y2 - this.y1)) * 180) / Math.PI;
      this.preventSwipe = this.options.swipeDirection === 'horizontal' ? _a > 45 || this.x2 - this.x1 === 0 : _a < 45 || this.y2 - this.y1 === 0
    }

    this.emit('touchmove', { event: e })
    this.cancelLongTap()
  }

  onTouchEnd(e: TouchEvent) {
    if (!e.changedTouches) {
      return
    }
    this.cancelLongTap()

    const timeDiff = Date.now() - this.now

    if (!this.preventSwipe && this.options.swipeDirection) {
      const direction = this.options.swipeDirection === 'horizontal' ? this.x2 - this.x1 : this.y2 - this.y1
      this.emit('swipe', { event: e, timeDiff, direction: direction > 0 ? 'prev' : 'next' })
    } else {
      this.tapTid = setTimeout(() => {
        !this.preventTap && this.emit('tap')
        if (this.isDoubleTap) {
          this.emit('doubleTap')
          this.isDoubleTap = false
        }
      }, 0)

      if (!this.isDoubleTap) {
        this.singleTapTid = setTimeout(() => this.emit('singleTap'), 250)
      }
    }

    this.emit('touchend', { event: e })
    this.x1 = this.x2 = this.y1 = this.y2 = null
    this.isDoubleTap = false
    this.preV = null
    this.pinchStartLen = null
  }

  onTouchCancel() {
    this.cancelLongTap()
    this.cancelSingleTap()
    clearTimeout(this.tapTid)
    this.preventTap = false
    this.preventSwipe = false
  }
}
