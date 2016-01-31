const test = require('tape');
const runscripts = require('./');

test('it work!', t => {
  const result = runscripts();
  t.equal(result, 42);
  t.end();
});
