'use strict';

const pkgConf = require('pkg-conf');
const co = require('co');
const debug = require('debug')('runscripts');
const path = require('path');
const fs = require('fs-promise');
const spawn = require('spawn-shell');
const readPkgUp = require('read-pkg-up');
const flatten = require('./modules/flatten-obj');
const pkgUp = require('pkg-up');
const babelifyRequire = require('babelify-require');


function error(code, message) {
  const err = new Error(message);
  err.code = code;
  throw err;
}

function throwError(err) {
  if (err.name === 'JSONError') {
    error(
      'EINVALIDPKG',
      'Your package.json is not parsable:\n\n' +
      String(err.stack).split(':').slice(1).join(':')
        .split('\n')
        .splice(0, 3)
        .join('\n')
    );
  }
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


function * _readScriptsObject(cwd) {
  debug(`readScriptsObject cwd=${cwd}`);

  const packageRootFile = yield pkgUp(cwd);
  if (packageRootFile === null) {
    error('ENOCONFIG', `.scripts file or package.json not found from: ${cwd}`);
  }
  const packageRoot = path.dirname(packageRootFile);
  debug(`packageRoot ${packageRoot}`);
  const scriptsRcPath = path.join(packageRoot, '.scripts.js');

  if (yield fs.exists(scriptsRcPath)) {
    return yield readScriptsRc(scriptsRcPath);
  }

  return yield readPackageJSON(cwd);
}

function getCwdOption(_cwd) {
  return path.resolve(
    process.cwd(),
    _cwd || '.'
  );
}

function readScriptsObject(_cwd) {
  debug('readScriptsObject');
  return co.wrap(_readScriptsObject)(
    getCwdOption(_cwd)
  ).catch(throwError);
}


function resolveFunction(foundScripts, pkg, args) {
  const reolvedScripts = foundScripts.map(script =>
    typeof script === 'function'
    ? script(pkg, args || {})
    : script
  );
  debug(`scripts commands after function resolution => ${JSON.stringify(reolvedScripts)}`);
  return reolvedScripts;
}

function readOptions(_options) {
  const options = _options || {};
  options.spawn = options.spawn || {};
  options.spawn.env = (options.spawn.env || process.env);
  options.cwd = getCwdOption(options.cwd);
  options.spawn.cwd = options.cwd;
  return options;
}

function * _runScripts(scriptName, args, options) {
  const pkg = yield readPkgUp({cwd: options.cwd});
  const scripts = yield _readScriptsObject(options.cwd);

  const foundScripts = findScriptSources(scriptName, scripts);

  const resolvedScripts = scripts.source === 'rc'
    ? resolveFunction(foundScripts, pkg.pkg, args)
    : foundScripts;

  flatten(pkg.pkg, 'npm_package_', options.spawn.env);

  const shellCommand = resolvedScripts.join('; ');

  return spawn(
    shellCommand,
    options.spawn

  );
}

function runScripts(scriptName, args, _options) {
  return co(_runScripts(
      scriptName,
      args,
      readOptions(_options)
  )).catch(throwError);
}

runScripts.readScriptsObject = readScriptsObject;
module.exports = runScripts;


