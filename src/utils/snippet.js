window.$nuxtfindComponent = (className) => {
  let stack = [window.$klook]
  let len = 1

  let current = null

  const isOK = current => current.$el && current.$el.className && (current.$el.className.toString() || '').includes(className)

  while (stack.length) {
    current = stack.pop()
    if (isOK(current)) {
      break;
    }
    len += (current.$children || []).length
    stack.push(...current.$children)
  }
  console.log('Components', len)
  return isOK(current) ? current : null
}
