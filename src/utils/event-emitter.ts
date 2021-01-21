export default class SimpleEventEmitter {
  _events: { [key: string]: any[] } = {}

  constructor() {
    this._events = {}
  }

  on(eventName: string, handler: Function) {
    if (!this._events[eventName]) {
      this._events[eventName] = []
    }
    this._events[eventName].push(handler)
  }

  off(eventName: string, handler?: Function) {
    if (!handler) {
      delete this._events[eventName]
      return
    }
    const index = (this._events[eventName] || []).indexOf(handler)
    return ~index && this._events[eventName].splice(index, 1)
  }

  once(eventName: string, handler: Function) {
    const fn = (...args: any[]) => {
      handler.apply(this, args)
      this.off(eventName, fn)
    }
    this.on(eventName, fn)
  }

  emit(eventName: string, ...params: any[]) {
    (this._events[eventName] || []).forEach((handler: Function) => {
      typeof handler === 'function' && handler.apply(this, params)
    })
  }
}