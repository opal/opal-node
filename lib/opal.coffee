version    = '0.3.27'
extensions = ['.opal', '.rb']

fs = require('fs')

source       = fs.readFileSync("#{__dirname}/opal-#{version}.js").toString()
parserSource = fs.readFileSync("#{__dirname}/opal-parser-#{version}.js").toString()

# Being Ruby classes and modules are global constants, hence it makes sense to
# break loose from the nodejs module system chains and just live in the GLOBAL
# object.
GLOBAL.eval(source)
GLOBAL.eval(parserSource)

# Alias the opal-parser method call as `Opal.parse(source, file)`
Opal.parse = (ruby, filename)=>
  Opal.Opal.Parser.$new().$parse(ruby, filename)

for extension in extensions
  require.extensions[extension] = (module, filename) ->
    ruby   = fs.readFileSync("#{filename}").toString()
    source = Opal.parse(ruby, filename)

    # By default opal outputs commented requires, but we need to hook
    # them to the nodejs require system, also remove any leading './'
    # which is unnecessary in node
    source = source.replace(/\/\/= require +(?:\.\/)?([^;]+)[\n;]/g, 'require("$1");')
    module._compile(source, filename)
