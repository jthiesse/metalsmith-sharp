'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = function (userOptions) {
  const defaultOptions = {
    src: '**/*.jpg',
    namingPattern: '{dir}{base}',
    methods: [],
    moveFile: false,
    ignoreExisting: false
  };

  const optionsList = [].concat(userOptions);

  // Return metalsmith plugin.
  return function (files, metalsmith, done) {
    Object.keys(files).reduce((fileSequence, filename) => {
      return fileSequence.then(() => {
        const file = files[filename];
        const replacements = getReplacements(filename);

        // Iterate over all option sets.
        return optionsList.reduce((stepSequence, options) => {
          const stepOptions = _extends({}, defaultOptions, options);

          const destinationFile = replacePlaceholders(stepOptions.namingPattern, replacements);

          if (stepOptions.ignoreExisting) {
            const destinationFileWithPath = (0, _absolute2.default)(destinationFile) ? destinationFile : (0, _path.join)(`${metalsmith.destination()}/`, destinationFile);

            if ((0, _fs.existsSync)(destinationFileWithPath)) {
              // console.log('Destination File Exists', filename, destinationFileWithPath)
              delete files[filename];
              return stepSequence;
            }
          }

          if (!(0, _minimatch2.default)(filename, stepOptions.src)) {
            return stepSequence;
          }

          debug(`processing ${filename}`);

          const image = (0, _lodash.cloneDeep)(file);

          // Run sharp and save new file.
          return stepSequence.then(() => runSharp(image, stepOptions)).catch(err => {
            err.message = `Could not process file "${filename}":\n${err.message}`;
            return Promise.reject(err);
          }).then((buffer, info) => {
            // const dist = replacePlaceholders(stepOptions.namingPattern, replacements)
            image.contents = buffer;
            files[destinationFile] = image;

            if (filename !== destinationFile && stepOptions.moveFile) {
              delete files[filename];
            }
          });
        }, Promise.resolve());
      });
    }, Promise.resolve()).then(() => {
      done();
    }).catch(err => {
      done(err);
    });
  };
};

var _fs = require('fs');

var _path = require('path');

var _lodash = require('lodash');

var _minimatch = require('minimatch');

var _minimatch2 = _interopRequireDefault(_minimatch);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _sharp = require('sharp');

var _sharp2 = _interopRequireDefault(_sharp);

var _absolute = require('absolute');

var _absolute2 = _interopRequireDefault(_absolute);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

const debug = (0, _debug2.default)('metalsmith-sharp');

function replacePlaceholders(text, placeholders) {
  return text.replace(/\{([^}]+)\}/g, (match, pattern) => {
    if (placeholders.hasOwnProperty(pattern)) {
      return placeholders[pattern];
    }
    return match;
  });
}

function getReplacements(path) {
  const parsedPath = (0, _path.parse)(path);
  if (parsedPath.dir.length) {
    parsedPath.dir = `${parsedPath.dir}/`;
  }
  return parsedPath;
}

function runSharp(image, options) {
  const sharp = (0, _sharp2.default)(image.contents);

  options.methods.forEach(method => {
    const args = [].concat(method.args);
    sharp[method.name].apply(sharp, _toConsumableArray(args));
  });

  return sharp.toBuffer();
}

module.exports = exports['default'];