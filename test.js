const test = require('tape');
const run = require('./');
const co = require('co');

const concat = require('stream-string');

const check = co.wrap(function * check(dir, script, args) {
  const result = yield run(script, args || {}, {
    cwd: __dirname + `/fixtures/${dir}`,
    spawn: {
      stdio: [0, 'pipe', 2]
    }
  });
  return concat(result.stdout);
});

test('run scripts from pkg.json', t => co(function * () {
  t.equal(yield check('simple', 'test1'), 'ciao\n');
  t.end();
}).catch(err => t.end(err)));


test('use .scripts if present', t => co(function * () {
  t.equal(yield check('scriptsrc', 'test1'), 'salve mondo\n');
  t.end();
}).catch(err => t.end(err)));


test('run function command in .scripts', t => co(function * () {
  t.equal(yield check('scriptsrc', 'test2'), 'salve fixture\n');
  t.end();
}).catch(err => t.end(err)));


test('function command can recevie args', t => co(function * () {
  t.equal(yield check('scriptsrc', 'test3', {anArg: 'aValue'}), 'salve aValue\n');
  t.end();
}).catch(err => t.end(err)));


test('run pre and post scripts if presents', t => co(function * () {
  t.equal(yield check('simple', 'check-prepost'), '1\n2\n3\n');
  t.end();
}).catch(err => t.end(err)));


test('inject package json in env', t => co(function * () {
  t.equal(yield check('simple', 'test-pkg-vars'), '4.0\n');
  t.end();
}).catch(err => t.end(err)));


test('throws when script not found', t => co(function * () {
  check('simple', 'non-existant')
    .catch(err => {
      t.equal(err.code, 'ENOSCRIPT');
      t.end();
    });

}));

test('throws when pkg.json not found', t => co(function * () {
  check('../../../non-existant', 'script-name')
    .catch(err => {
      t.equal(err.code, 'ENOCONFIG');
      t.end();
    });

}));


test('readScriptsObject - return package json scripts', t => co(function * () {
  const scripts = yield run.readScriptsObject('fixtures/simple');
  t.deepEqual(scripts.object, {
    'test-pkg-vars': 'echo ${npm_package_engine_node}',
    'test1': 'echo ciao',
    'check-prepost': 'echo 2',
    'precheck-prepost': 'echo 1',
    'postcheck-prepost': 'echo 3'
  });
  t.end();
}));
