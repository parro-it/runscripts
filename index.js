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

function findScriptSources(scriptName, scripts) {
  const object = scripts.object;
  if (! object.hasOwnProperty(scriptName)) {
    error('ENOSCRIPT', `Script not found: ${scriptName}`);
  }

  const pre = object['pre' + scriptName] || '';
  const script = object[scriptName];
  const post = object['post' + scriptName] || '';

  return [pre, script, post].filter(s => !!s);

}

function * readScriptsRc(scriptsRcPath) {
  debug(`.scripts.js found in ${scriptsRcPath}`);
  const scripts = yield babelifyRequire(scriptsRcPath);
  debug(`.scripts.js content => ${JSON.stringify(scripts.default)}`);
  return {
    object: scripts.default,
    source: 'rc'
  };
}

function * readPackageJSON(cwd) {
  const object = yield pkgConf('scripts', {cwd: cwd});
  debug(`scripts pkg object => ${JSON.stringify(object)}`);

  return {
    object,
    source: 'package'
  };
}

function * readScriptsObject(cwd) {
  const packageRoot = yield pkgDir(cwd);
  if (packageRoot === null) {
    error('ENOCONFIG', `.scripts file or package.json not found from: ${cwd}`);
  }

  const scriptsRcPath = path.join(packageRoot, '.scripts.js');

  if (yield fs.exists(scriptsRcPath)) {
    return yield readScriptsRc(scriptsRcPath);
  }

  return  yield readPackageJSON(cwd);
}

function * runScripts(scriptName, options) {
  options.spawn = options.spawn || {};
  options.spawn.env = (options.spawn.env || process.env);
  options.spawn.cwd = options.cwd;

  const pkg = yield readPkgUp({cwd: options.cwd});
  const scripts = yield readScriptsObject(options.cwd || process.cwd);

  let foundScripts = findScriptSources(scriptName, scripts);

  if (scripts.source === 'rc') {
    foundScripts = foundScripts.map(script =>
      typeof script === 'function'
      ? script(pkg.pkg)
      : script
    );
    debug(`scripts commands after function erxecution => ${JSON.stringify(foundScripts)}`);

  } else {
    flatten(pkg.pkg, 'npm_package_', options.spawn.env);
  }

  const shellCommand = foundScripts.join('; ');

  return spawn(
    shellCommand,
    options.spawn
  );
}

module.exports = co.wrap(runScripts);
