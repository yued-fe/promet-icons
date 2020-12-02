const { ensureDir, writeFile, readFileSync, copy } = require('fs-extra')
const { join } = require('path')

ensureDir(join(__dirname, '..', 'publish')).then(() => {
  const iconJSON = readFileSync(join(__dirname, '..', 'dist/data.json') ,'utf8')
  let tpl = readFileSync(join(__dirname, 'template.html'), 'utf8')
  tpl = tpl.replace(
    '// iconMap',
    `const iconMap = ${iconJSON}`
  )
  writeFile(join(__dirname, '..', 'publish', 'index.html'), tpl)
  copy(join(__dirname, '..', 'dist/png'), join(__dirname, '..', 'publish/png'))
  copy(join(__dirname, '..', 'dist/icons.css'), join(__dirname, '..', 'publish/icons.css'))
})