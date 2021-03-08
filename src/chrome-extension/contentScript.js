if (PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) {
  const po = new PerformanceObserver(l => {
    l.getEntries().map(entry => console.log(`%c LCP Entry ${entry.startTime}`, "color: red"))
  })
  po.observe({
    type: 'largest-contentful-paint',
    buffered: true
  })
}
const events = ["pagehide", "pageshow", "load"]

events.forEach(event => addEventListener(event, e => console.log(e.type, e)), {
  once: true,
  capture: true
})