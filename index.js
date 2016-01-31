'use strict';

const pkgConf = require('pkg-conf');
const co = require('co');
const spawn = require('spawn-shell');
const readPkgUp = require('read-pkg-up');
const flatten = require('./modules/flatten-obj');

function error(code, message) {
  const err = new Error(message);
  err.code = code;
  throw err;
}

function buildScriptSource(scriptName, scripts) {
  const pre = scripts['pre' + scriptName] || '';
  const script = scripts[scriptName];
  const post = scripts['post' + scriptName] || '';

  const foundScripts = [];

  if (pre) {
    foundScripts.push('{ ' + pre + ' }');
  }

  foundScripts.push('{ ' + script + ' }');

  if (post) {
    foundScripts.push('{ ' + post + ' }');
  }

  const source = foundScripts.join(' && ');
  console.log(source);
}

function * getScriptsObject(scriptName, options) {
  const scripts = yield pkgConf('scripts', options.cwd);
  if (pkgConf.filepath(scripts) === null) {
    error('ENOCONFIG', `Config file not found in: ${options.cwd || process.cwd}`);
  }
  if (! scripts.hasOwnProperty(scriptName)) {
    error('ENOSCRIPT', `Script not found: ${scriptName}`);
  }

  return scripts;
}

function * injectPkgJsonContent(options) {
  const pkg = yield readPkgUp({cwd: options.cwd});
  flatten(pkg.pkg, 'npm_package_', options.spawn.env);
}

function * getScriptSource(scriptName, options) {
  const scripts = yield getScriptsObject(scriptName, options);
  return buildScriptSource(scriptName, scripts);
}

function * runScripts(scriptName, options) {
  options.spawn = options.spawn || {};
  options.spawn.env = (options.spawn.env || process.env);

  yield injectPkgJsonContent(options);
  options.spawn.cwd = options.cwd;

  return spawn(
    yield getScriptSource(scriptName, options),
    options.spawn
  );
}

module.exports = co.wrap(runScripts);
