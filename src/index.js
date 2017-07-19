import { existsSync } from 'fs'
import { join, parse } from 'path'
import { cloneDeep } from 'lodash'
import minimatch from 'minimatch'
import Debug from 'debug'
import Sharp from 'sharp'
import absolute from 'absolute'

const debug = Debug('metalsmith-sharp')

function replacePlaceholders (text, placeholders) {
  return text.replace(/\{([^}]+)\}/g, (match, pattern) => {
    if (placeholders.hasOwnProperty(pattern)) {
      return placeholders[pattern]
    }
    return match
  })
}

function getReplacements (path) {
  const parsedPath = parse(path)
  if (parsedPath.dir.length) {
    parsedPath.dir = `${parsedPath.dir}/`
  }
  return parsedPath
}

function runSharp (image, options) {
  const sharp = Sharp(image.contents)

  options.methods.forEach((method) => {
    const args = [].concat(method.args)
    sharp[method.name](...args)
  })

  return sharp
  .toBuffer()
}

export default function (userOptions) {
  const defaultOptions = {
    src: '**/*.jpg',
    namingPattern: '{dir}{base}',
    methods: [],
    moveFile: false,
    ignoreExisting: false
  }

  const optionsList = [].concat(userOptions)

  // Return metalsmith plugin.
  return function (files, metalsmith, done) {
    Object.keys(files).reduce((fileSequence, filename) => {
      return fileSequence.then(() => {
        const file = files[filename]
        const replacements = getReplacements(filename)

        // Iterate over all option sets.
        return optionsList.reduce((stepSequence, options) => {
          const stepOptions = {
            ...defaultOptions,
            ...options
          }

          const destinationFile = replacePlaceholders(stepOptions.namingPattern, replacements)

          if (stepOptions.ignoreExisting) {
            const destinationFileWithPath = absolute(destinationFile) ? destinationFile : join(`${metalsmith.destination()}/`, destinationFile)

            if (existsSync(destinationFileWithPath)) {
              console.log('Destination File Exists', filename, destinationFileWithPath)
              delete files[filename]
              return stepSequence
            }
          }

          if (!minimatch(filename, stepOptions.src)) {
            return stepSequence
          }

          debug(`processing ${filename}`)

          const image = cloneDeep(file)

          // Run sharp and save new file.
          return stepSequence
          .then(() => runSharp(image, stepOptions))
          .catch((err) => {
            err.message = `Could not process file "${filename}":\n${err.message}`
            return Promise.reject(err)
          })
          .then((buffer, info) => {
            // const dist = replacePlaceholders(stepOptions.namingPattern, replacements)
            image.contents = buffer
            files[destinationFile] = image

            if (filename !== destinationFile && stepOptions.moveFile) {
              delete files[filename]
            }
          })
        }, Promise.resolve())
      })
    }, Promise.resolve())
    .then(() => {
      done()
    })
    .catch((err) => {
      done(err)
    })
  }
}
