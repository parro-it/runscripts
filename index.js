'use strict';

const pkgConf = require('pkg-conf');
const co = require('co');
const debug = require('debug')('runscripts');
const path = require('path');
const fs = require('fs-promise');
const spawn = require('spawn-shell');
const readPkgUp = require('read-pkg-up');
const flatten = require('./modules/flatten-obj');
const pkgDir = require('pkg-dir');
const babelifyRequire = require('babelify-require');


function error(code, message) {
  const err = new Error(message);
  err.code = code;
  throw err;
}

function buildScriptSource(scriptName, scripts) {
  if (! scripts.hasOwnProperty(scriptName)) {
    error('ENOSCRIPT', `Script not found: ${scriptName}`);
  }

  const pre = scripts['pre' + scriptName] || '';
  const script = scripts[scriptName];
  const post = scripts['post' + scriptName] || '';

  const foundScripts = [pre, script, post].filter(s => !!s);
  const source = foundScripts.join('; ');
  return source;
}

function * readScriptsRc(scriptsRcPath) {
  debug(`.scripts.js found in ${scriptsRcPath}`);
  const scripts = yield babelifyRequire(scriptsRcPath);
  debug(`.scripts.js content => ${JSON.stringify(scripts.default)}`);
  return scripts.default;
}

function * getScriptsObject(cwd) {
  const packageRoot = yield pkgDir(cwd);
  if (packageRoot === null) {
    error('ENOCONFIG', `.scripts file or package.json not found from: ${cwd}`);
  }

  const scriptsRcPath = path.join(packageRoot, '.scripts.js');

  if (yield fs.exists(scriptsRcPath)) {
    return yield readScriptsRc(scriptsRcPath);
  }

  debug(`.scripts not found in ${scriptsRcPath}.
        Will try to read package.json scripts field.`);

  const scripts = yield pkgConf('scripts', {cwd: cwd});
  debug(`scripts pkg object => ${JSON.stringify(scripts)}`);

  return scripts;
}


function * injectPkgJsonContent(options) {
  const pkg = yield readPkgUp({cwd: options.cwd});
  flatten(pkg.pkg, 'npm_package_', options.spawn.env);
}


function * runScripts(scriptName, options) {
  options.spawn = options.spawn || {};
  options.spawn.env = (options.spawn.env || process.env);

  yield injectPkgJsonContent(options);
  options.spawn.cwd = options.cwd;

  const scripts = yield getScriptsObject(options.cwd || process.cwd);
  const scriptSource = buildScriptSource(scriptName, scripts);

  return spawn(
    scriptSource,
    options.spawn
  );
}

module.exports = co.wrap(runScripts);
