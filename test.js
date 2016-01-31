const test = require('tape');
const run = require('./');
const co = require('co');

const concat = require('stream-string');

const check = co.wrap(function * check(dir, script) {
  const result = yield run(script, {
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


test('throws when script not found', t => co(function * () {
  check('simple', 'non-existant')
    .catch(err => {
      t.equal(err.code, 'ENOSCRIPT');
      t.end();
    });

}));
