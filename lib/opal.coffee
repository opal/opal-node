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

Opal.compile = (ruby, options = undefined) -> # Override function for now
  # Options can be Hash or plain JS
  if options and options.klass isnt Opal.Hash
    keys = (key for key, value of options)
    options = Opal.hash2(keys, options)
  Opal.Opal.$compile(ruby, options)

for extension in extensions
  require.extensions[extension] = (module, filename) ->
    ruby   = fs.readFileSync("#{filename}").toString()
    source = Opal.compile(ruby, file: filename)
    # console?.log source
    module._compile(source, filename)

require './opal_node'
require './file'
require './dir'
