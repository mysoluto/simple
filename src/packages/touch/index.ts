import EventEmitter from '../../utils/event-emitter'

type Vector = {
  x: number,
  y: number
}

type SimpleTouchEvent = {
  e: TouchEvent,
  direction?: string,
  angle?: number,
  zoom?: number,
  timeDiff?: number
}

const getLen = (v: Vector) => Math.sqrt(v.x ** 2 + v.y ** 2)

const getAngle = (v1: Vector, v2: Vector) => {
  const len = getLen(v1) * getLen(v2)
  if (len === 0) {
    return 0
  }
  const r = (v1.x * v2.x + v1.y * v2.y) / len
  return Math.acos(Math.min(r, 1))
}

const getRotateAngle = (v1: Vector, v2: Vector) => {
  const crossValue = v1.x * v2.y - v1.y * v2.x
  return 180 * getAngle(v1, v2) * (crossValue > 0 ? -1 : 1) / Math.PI
}

const eventNames = ['onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel']

/**
 * longTap, tap, singleTap, doubleTap, swipe, rotate, pinch, pressmove
 * longTap 750ms, singleTap: 250ms
 * doubleTap: 250ms & deltaX|Y < 30: start -> end -> start -> end
**/
export default class SimpleTouch extends EventEmitter {
  el!: HTMLElement
  options: { [key: string]: any } = {}

  longTapTid: number | null = null
  tapTid: number | null = null

  last: number = 0
  now: number = 0
  isDoubleTap: boolean = false

  startX: number = 0
  startY: number = 0
  lastX: number = 0
  lastY: number = 0
  lastV: Vector | null = null

  pinchStartLen: number = 1

  constructor(el: HTMLElement | string, options = {}) {
    super()

    this.el = typeof el === 'string' ? document.querySelector(el) : el

    if (!this.el || this.el.nodeType !== 1 || typeof window === undefined) {
      return
    }

    this.options = Object.assign({}, options)

    if (this.options.on) {
      Object.keys(this.options.on).forEach((eventName: string) => {
        const handlers: any = this.options.on[eventName]
        ;(Array.isArray(handlers) ? handlers : [handlers]).forEach((handler: Function) => this.on(eventName, handler))
      })
    }

    eventNames.forEach((eventName: string) => {
      this[eventName] = this[eventName].bind(this)
      const name = eventName.slice(2).toLowerCase()
      this.el.addEventListener(name, this[eventName], false)
    })
  }

  destroy(): void {
    eventNames.forEach((eventName: string) => {
      const name = eventName.slice(2).toLowerCase()
      this.el.removeEventListener(name, this[eventName])
    })
  }

  onTouchStart(e: TouchEvent) {
    if (!e.touches) {
      return
    }
    this.now = Date.now()
    this.startX = e.touches[0].pageX
    this.startY = e.touches[0].pageY

    const tapTimeDelta = this.now - (this.last || this.now)
    if (this.lastX && tapTimeDelta > 0 && tapTimeDelta < 250) {
      this.isDoubleTap = Math.abs(this.lastX - this.startX) < 30 && Math.abs(this.lastY - this.startY) < 30
    }

    this.last = this.now
    this.lastX = this.startX
    this.lastY = this.startY


    if (e.touches.length > 1) {
      this.lastV = { x: e.touches[1].pageX - this.startX, y: e.touches[1].pageY - this.startY }
      this.pinchStartLen = getLen(this.lastV)
    }

    this.longTapTid = setTimeout(() => {
      this.emit('longTap', { e, timeDiff: Date.now() - (this.now || Date.now()) })
    }, 750)
    this.emit('touchstart', { e })
  }

  onTouchMove(e: TouchEvent) {
    if (!e.touches) {
      return
    }
    this.isDoubleTap = false
    this.cancelLongTap()

    const pageX = e.touches[0].pageX
    const pageY = e.touches[0].pageY

    if (e.touches.length > 1 && this.lastV) {
      const tempV = { x: e.touches[1].pageX - pageX, y: e.touches[1].pageY - pageY }
      const zoom = this.pinchStartLen ? getLen(tempV) / this.pinchStartLen : 1
      const angle = getRotateAngle(tempV, this.lastV)
      this.emit('pinch', { e, zoom, angle })
      this.emit('rotate', { e, zoom, angle })
      this.lastV = tempV
    }

    if (e.touches.length === 1) {
      this.emit('pressmove', { e, deltaX: pageX - this.lastX, deltaY: pageY - this.lastY })
    }

    this.lastX = pageX
    this.lastY = pageY

    this.emit('touchmove', { e })

    if (e.touches.length > 1) {
      e.preventDefault()
    }
  }

  onTouchEnd(e: TouchEvent) {
    if (!e.changedTouches) {
      return
    }
    this.cancelLongTap()
    this.tapTid = setTimeout(() => {
      if (this.isDoubleTap) {
        this.isDoubleTap = false
        this.emit('doubleTap', { e })
      }
    }, 0)

    this.emit('touchend', { e, timeDiff: Date.now() - (this.now || Date.now()) })
  }

  onTouchCancel(e: TouchEvent) {
    this.cancelLongTap()
    clearTimeout(this.tapTid)

    this.emit('touchcancel', { e })
  }

  cancelLongTap() {
    clearTimeout(this.longTapTid)
  }
}
