version = '0.3.18'
extensions = ['opal', 'rb']

Opal = require("./opal-#{version}").Opal
execSync = require('exec-sync')

compile = (filename) ->
  console.info('loading: '+filename)
  return execSync("opal _#{version}_ #{filename}")

for extension in extensions
  require.extensions[extension] = (module, filename) ->
    content = compile(filename);
    module._compile(content, filename)
