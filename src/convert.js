const {
  ensureDir,
  writeFile,
  readdir,
  readFileSync,
  copy
} = require('fs-extra')
const { join, resolve } = require('path')
const SVGO = require('svgo')
const kebabCase = require('kebab-case')
const imageToBase64 = require('image-to-base64')
const { svgoOptions } = require('./config')

let cssContent = ''

const svgo = new SVGO(svgoOptions)

const encodeSvg = str =>
  'data:image/svg+xml,' +
  str
    .replace(/"/g, "'")
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/{/g, '%7B')
    .replace(/}/g, '%7D')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')

const genSVG = (filePath, filename) => {
  const regRes = /(.+?).svg/g.exec(filename)
  const data = readFileSync(filePath, 'utf8')
  return svgo
    .optimize(data, {
      path: resolve(__dirname, '..', 'dist/compressed/svg', filename)
    })
    .then(res => {
      const iconName = kebabCase(regRes[1])
      cssContent += `  --i-${iconName}: url("${encodeSvg(res.data)}");\n`
      writeFile(res.path, res.data)
    })
}

const genPNG = (filePath, filename) => {
  const regRes = /(.+?).png/g.exec(filename)
  return imageToBase64(filePath).then(encodeStr => {
    const iconName = kebabCase(regRes[1])
    cssContent += `  --i-${iconName}: url("data:image/png;base64,${encodeStr}");\n`
  })
}

const handleOriginSVG = () => {
  const originPath = join(__dirname, '..', 'dist/svg')
  const targetPath = join(__dirname, '..', 'dist/compressed/svg')

  return readdir(originPath)
    .then(files => {
      return ensureDir(targetPath).then(() => {
        const dataUrlPromises = files.map(filename => {
          const filePath = join(originPath, filename)
          return genSVG(filePath, filename)
        })
        return Promise.all(dataUrlPromises)
      })
    })
    .catch(err => {
      throw err
    })
}

const handleOriginPNG = () => {
  const originPath = join(__dirname, '..', 'dist/png')

  return readdir(originPath)
    .then(files => {
      const base64Promises = files.map(filename => {
        const filePath = join(originPath, filename)
        if (filename.indexOf('nav-') !== 0) {
          return genPNG(filePath, filename)
        } else {
          return copy(filePath, join(__dirname, '..', 'dist/png/nav', filename))
        }
      })
      return Promise.all(base64Promises)
    })
    .catch(err => {
      throw err
    })
}

Promise.all([handleOriginSVG(), handleOriginPNG()]).then(() => {
  writeFile(
    join(__dirname, '..', 'dist', 'icons.css'),
    `:root {\n${cssContent}}`
  )
})
