'use strict';

const pkgConf = require('pkg-conf');
const co = require('co');
const spawn = require('spawn-shell');

function error(code, message) {
  const err = new Error(message);
  err.code = code;
  throw err;
}

function * runScripts(scriptName, options) {
  const scripts = yield pkgConf('scripts', options.cwd);
  if (! scripts.hasOwnProperty(scriptName)) {
    error('ENOSCRIPT', `Script not found: ${scriptName}\n`);
  }
  const script = scripts[scriptName];
  return spawn(script, options.spawn);
}

module.exports = co.wrap(runScripts);
