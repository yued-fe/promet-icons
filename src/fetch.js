/**
 * @source https://github.com/primer/figma-action/blob/master/entrypoint.js
 */

const got = require('got')
const { ensureDir, writeFile } = require('fs-extra')
const { join, resolve } = require('path')
const kebabCase = require('kebab-case')
const Figma = require('figma-js')
const PQueue = require('p-queue')
const { includePages, excludePages, exportOptions } = require('./config')

const { FIGMA_TOKEN, FIGMA_FILE_URL } = process.env
const CONTENT_TYPES = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg'
}

const options = exportOptions

for (const arg of process.argv.slice(2)) {
  const [param, value] = arg.split('=')
  if (options[param]) {
    options[param] = value
  }
}

if (!FIGMA_TOKEN) {
  throw Error('Cannot find FIGMA_TOKEN in process!')
}

const client = Figma.Client({
  personalAccessToken: FIGMA_TOKEN
})

// Fail if there's no figma file key
let fileId = null
if (!fileId) {
  try {
    fileId = FIGMA_FILE_URL.match(/file\/([a-z0-9]+)\//i)[1]
  } catch (e) {
    throw Error('Cannot find FIGMA_FILE_URL key in process!')
  }
}

console.log(`Exporting ${FIGMA_FILE_URL} components`)
client
  .file(fileId)
  .then(({ data }) => {
    console.log('Processing response')
    const components = {}

    function check(c, level = 0) {
      if (c.type === 'CANVAS' && excludePages.includes(c.name)) {
        return
      } else if (
        c.children &&
        c.type === 'CANVAS' &&
        includePages.includes(c.name) &&
        level === 0
      ) {
        c.children.forEach(c => check(c, level + 1))
      } else if (c.type === 'COMPONENT') {
        const { name, id } = c
        const { description = '', key } = data.components[c.id]
        const { width, height } = c.absoluteBoundingBox
        const isBit =
          name.lastIndexOf('-bit') > 0 &&
          name.lastIndexOf('-bit') + 4 === name.length

        components[id] = {
          name,
          id,
          key,
          description,
          width,
          height,
          isBit,
          format: isBit ? options.bitFormat : options.format
        }
      } else if (c.children && level !== 0) {
        c.children.forEach(c => check(c, level + 1))
      }
    }

    data.document.children.forEach(c => check(c, 0))
    if (Object.values(components).length === 0) {
      throw Error('No components found!')
    }
    console.log(
      `${Object.values(components).length} components found in the figma file`
    )
    return components
  })
  .then(components => {
    console.log('Getting export urls')

    const getFileImage = (format, ids, scale = options.scale) => {
      if (ids.length <= 0) {
        return
      }
      console.log(fileId, {
        format,
        ids,
        scale
      })
      return client
        .fileImages(fileId, {
          format,
          ids,
          scale
        })
        .then(({ data }) => {
          for (const id of Object.keys(data.images)) {
            components[id].image = data.images[id]
          }
          return components
        })
    }

    return Promise.all([
      getFileImage(
        options.format,
        Object.keys(components).filter(id => !components[id].isBit)
      ),
      getFileImage(
        options.bitFormat,
        Object.keys(components).filter(id => components[id].isBit),
        options.scale * 3
      )
    ])
  })
  .then(res => {
    console.log('Formatting components and export json.')
    const components = Object.assign({}, ...res)
    const componentMap = { bit: [], vector: [] }
    Object.values(components).forEach(component =>
      component.isBit
        ? componentMap.bit.push(kebabCase(component.name))
        : componentMap.vector.push(kebabCase(component.name))
    )

    return ensureDir(join(options.outputDir))
      .then(() =>
        writeFile(
          resolve(options.outputDir, 'data.json'),
          JSON.stringify(componentMap),
          'utf8'
        )
      )
      .then(() => components)
  })
  .then(components => {
    return queueTasks(
      Object.values(components).map(component => () => {
        const reqOptions = {
          headers: {
            'Content-Type': CONTENT_TYPES[component.format]
          }
        }
        component.isBit
          ? (reqOptions.responseType = 'buffer')
          : (reqOptions.encoding = 'utf8')
        return got.get(component.image, reqOptions).then(response => {
          return ensureDir(join(options.outputDir, component.format)).then(() =>
            writeFile(
              join(
                options.outputDir,
                component.format,
                `${component.name}.${component.format}`
              ),
              response.body,
              component.isBit ? 'binary' : 'utf8'
            )
          )
        })
      })
    )
  })
  .catch(error => {
    throw Error(`Error fetching components from Figma: ${error}`)
  })

function queueTasks(tasks, options) {
  const queue = new PQueue(Object.assign({ concurrency: 3 }, options))
  for (const task of tasks) {
    queue.add(task)
  }
  queue.start()
  return queue.onIdle()
}
