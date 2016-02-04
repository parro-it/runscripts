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

function * getScriptsObject(cwd) {
  const root = yield pkgDir(cwd);
  if (root) {
    const scriptsRc = path.join(root, '.scripts.js');

    if (yield fs.exists(scriptsRc)) {
      debug(`.scripts found in ${scriptsRc}`);
      const scripts = yield babelifyRequire(scriptsRc);
      debug(`scripts rc => ${JSON.stringify(scripts)}`);
      return scripts.default;
    }
    debug(`.scripts not found in ${scriptsRc}`);
  }

  const scripts = yield pkgConf('scripts', {cwd: cwd});
  debug(`scripts pkg object => ${JSON.stringify(scripts)}`);
  if (pkgConf.filepath(scripts) === null) {
    error('ENOCONFIG', `.scripts file or package.json not found from: ${cwd}`);
  }

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
