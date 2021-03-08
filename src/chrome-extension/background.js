const parseRequestBody = body => {
  if (!body || !body.raw) {
    return ''
  }
  return body.raw.map(buf => String.fromCharCode.apply(null, new Uint8Array(buf.bytes))).join('')
}

const execScript = script => chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  tabs[0] && chrome.tabs.executeScript(tabs[0].id, { code: script })
})


const createLogger = type => {
  const _style = ({
    success: { color: '#fff', background: 'green' },
    warn: { color: '#fff', background: 'red' },
    info: { color: '#000', background: 'yellow' }
  })[type]
  return message => execScript(`console.log("%c ${message}", "${`color: ${_style.color};background: ${_style.background}`}")`)
}

const logger = {
  success: createLogger('success'),
  warn: createLogger('warn'),
  info: createLogger('info')
}

chrome.webRequest.onBeforeRequest.addListener(details => {  
  try {
    const logobj = JSON.parse(parseRequestBody(details.requestBody))
    const optimusLogs = (Array.isArray(logobj.logs) ? logobj.logs : []).filter(log => log.type === 4)
    const msgs = optimusLogs.map(log => JSON.parse(atob(log.msg))).filter(log => log._domain_)
    msgs.forEach(msg => {
      logger.info(` Optimuse Data `)
      execScript(`console.table(${JSON.stringify(msg)})`)
    })
  } catch (e) {
    // empty block
  }
}, { urls: ['*://*/*/frontlogsrv/log/web'] }, ['requestBody'])


chrome.webNavigation.onCompleted.addListener(() => console.log(''), { urls: ['*://*.klook.*/'] }) 