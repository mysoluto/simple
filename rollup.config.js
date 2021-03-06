const path = require('path')
const fs = require('fs')
const rollupTypescript = require('@rollup/plugin-typescript')

const promisefy = fn => (...params) => new Promise((resolve, reject) => fn(...params, (err, result) => err ? reject(err) : resolve(result)))

const root = path.join(__dirname, './src/packages')

const getEntries = async () => {
  const files = fs.readdirSync(root)
  const hasIndexFile = await files.map(filename => promisefy(fs.readFile)(path.join(root, filename, 'index.ts')).catch(() => null))
  return files.map((filename, index) => {
    return hasIndexFile[index] && /^\w/.test(filename) ? { path: path.join(root, filename, 'index.ts'), name: filename } : null
  }).filter(v => v)
}

const configs = getEntries().then(entries => {
  return entries.map(entry => ({
    input: entry.path,
    output: [
      {
        file: path.join(root, entry.name, 'dist/index.esm.js'),
        format: 'es'
      },
      {
        file: path.join(root, entry.name, 'dist/index.iife.js'),
        format: 'iife',
        name: `Simple${entry.name.slice(0, 1).toUpperCase()}${entry.name.slice(1)}`
      }
    ],
    plugins: [
      rollupTypescript({ lib: ["es5", "es6", "dom"], target: "es5" })
    ]
  }))
})

export default configs
