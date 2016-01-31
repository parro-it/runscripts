'use strict';

const pkgConf = require('pkg-conf');
const co = require('co');
const spawn = require('spawn-shell');

function error(code, message) {
  const err = new Error(message);
  err.code = code;
  throw err;
}

function * findScript(scriptName, options) {
  const scripts = yield pkgConf('scripts', options.cwd);
  if (pkgConf.filepath(scripts) === null) {
    error('ENOCONFIG', `Config file not found in: ${options.cwd || process.cwd}`);
  }
  if (! scripts.hasOwnProperty(scriptName)) {
    error('ENOSCRIPT', `Script not found: ${scriptName}`);
  }
  return scripts[scriptName];

}

function * runScripts(scriptName, options) {
  return spawn(yield findScript(scriptName, options), options.spawn);
}

module.exports = co.wrap(runScripts);
