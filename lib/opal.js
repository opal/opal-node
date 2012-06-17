var Opal, compile, execSync, extension, extensions, version, _i, _len;

version = '0.3.18';

extensions = ['opal', 'rb'];

Opal = require("./opal-" + version).Opal;

execSync = require('exec-sync');

compile = function(filename) {
  console.info('loading: ' + filename);
  return execSync("opal _" + version + "_ " + filename);
};

for (_i = 0, _len = extensions.length; _i < _len; _i++) {
  extension = extensions[_i];
  require.extensions[extension] = function(module, filename) {
    var content;
    content = compile(filename);
    return module._compile(content, filename);
  };
}
