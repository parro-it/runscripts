'use strict';
module.exports = flattenJSON;

function flattenJSON(json, prefix, env) {
  if (typeof json !== 'object') {
    return env;
  }

  Object.keys(json).forEach( key => {
    const item = json[key];

    if (typeof item === 'object') {
      flattenJSON(item, prefix + key + '_', env);
    } else {
      env[prefix + key] = json[key];
    }
  });

  return env;
}
