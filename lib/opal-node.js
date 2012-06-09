var Opal = require('opal').Opal;
var exec = require('child_process').exec;


exports.require = function(file) {
  if (!file.match(/\.opal$/)) {
    file = file + '.opal';
  }
  exec('opal '+file, function(error, stdout, stderr) {
    eval(stdout);
    console.info('required: '+file);
  });
};
