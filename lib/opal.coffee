sourceFile = "#{__dirname}/../opal/opal.js"
parserFile = "#{__dirname}/../opal/opal-parser.js"

extensions = ['.opal', '.rb']

fs = require('fs')

source = fs.readFileSync(sourceFile).toString()
parser = fs.readFileSync(parserFile).toString()

# Being Ruby classes and modules are global constants, hence it makes sense to
# break loose from the nodejs module system chains and just live in the GLOBAL
# object.
vm = require 'vm'
vm.runInThisContext(source, sourceFile)
vm.runInThisContext(parser, parserFile)


# Alias the opal-parser method call as `Opal.parse(source, file)`
Opal.parse = (ruby, filename)=>
  parser = Opal.Opal.Parser.$new()
  source = parser.$parse(ruby, filename)
  requires = ''
  for required in parser.requires
    requires += "require('#{required}');\n"
  source = "#{requires}#{source}"


for extension in extensions
  require.extensions[extension] = (module, filename) ->
    ruby   = fs.readFileSync("#{filename}").toString()
    source = Opal.parse(ruby, filename)
    # console?.log source
    module._compile(source, filename)


require 'opal_node'
require 'file'
require 'dir'
