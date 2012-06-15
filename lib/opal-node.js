var Opal = require('./opal').Opal;
var exec = require('child_process').exec;


exports.require = function(file) {
  if (!file.match(/\.opal$/)) {
    file = file + '.opal';
  }
  exec('opal _0.3.18_ '+file, function(error, stdout, stderr) {
    console.info('loading: '+file);
    eval(stdout);
  });
};
