version    = '0.3.19'
extensions = ['.opal', '.rb']

execSync     = require('exec-sync')
Opal = require("./opal-#{version}").Opal
exports.Opal = Opal

Opal.source = =>
  @source ||= require('fs').readFileSync("#{__dirname}/opal-#{version}.js").toString()

Opal.parse = (filename) ->
  return execSync("opal _#{version}_ #{filename}")

for extension in extensions
  require.extensions[extension] = (module, filename) ->
    content = "var Opal = require('opal').Opal;"+
              "Opal.require = require;"+
              Opal.parse(filename)
    module._compile(content, filename)
