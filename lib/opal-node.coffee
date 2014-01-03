sourceFile = "#{__dirname}/../opal/opal.js"
parserFile = "#{__dirname}/../opal/opal-parser.js"

extensions = ['.opal', '.rb']

fs = require('fs')
path = require('path')

source = fs.readFileSync(sourceFile).toString()
parser = fs.readFileSync(parserFile).toString()

# Being Ruby classes and modules are global constants, hence it makes sense to
# break loose from the nodejs module system chains and just live in the GLOBAL
# object.
vm = require 'vm'
vm.runInThisContext(source, sourceFile)
vm.runInThisContext(parser, parserFile)

class OpalNode
  @loaded: {}
  @backtrace: []
  @node_require: require

  @compile: (ruby, options = undefined) -> # Override function for now
    # Options can be Hash or plain JS
    if options and options.klass isnt Opal.Hash
      keys = (key for key, value of options)
      options = Opal.hash2(keys, options)
    compiler = Opal.Opal.Compiler.$new()
    # console?.log ['compiling with options: ', options]
    source = compiler.$compile(ruby, options)
    # console?.error compiler.$requires().$inspect()

    for required in compiler.$requires()
      # console?.error ['>>REQUIRE', required]
      OpalNode.require required
      # console?.error ['<<REQUIRE', required]

    Opal.Opal.$compile(ruby, options)

  @resolve: (filename)->
    try
      if filename.match(/^\./)
        filepath = path.resolve(process.cwd(), filename)
        # console?.error ['@resolve', filename, '>', filepath]
        require.resolve(filepath)
      else
        # console?.error ['@resolve', filename, '<<']
        require.resolve(filename)
    catch error
      if error.code is 'MODULE_NOT_FOUND' or
         error.message.indexOf("'#{filename}'") >= 0
        return null
      else
        # Re-throw not "Module not found" errors
        throw error

  @require: (filename) ->
    ruby_filename = filename.replace(/(\.rb)?$/, '.rb')
    full_path = OpalNode.resolve(ruby_filename)
    unless full_path
      if filename.match(/\.rb$/)
        js = OpalNode.compile("raise LoadError, 'cannot load such file -- #{filename}'")
        stack = OpalNode.backtrace
        context = stack[stack.length-1] || __filename
        vm.runInThisContext(js, context)
      else
        # Fallback to node if there's no ruby file
        return require(filename)

    # Check if it has been already loaded
    loaded = OpalNode.loaded[filename]
    OpalNode.backtrace.push(filename)
    # console?.error ['FILENAME LOADED', filename]
    return false if loaded

    ruby = fs.readFileSync("#{full_path}").toString()
    js   = OpalNode.compile(ruby, file: filename)
    # console?.error ['FILENAME', filename]
    # console?.error ['RUBY', ruby]
    # console?.error ['JS', js]
    OpalNode.loaded[filename] = true
    # module._compile(source, filename)
    vm.runInThisContext(js, ruby_filename)
    OpalNode.backtrace.pop()




# for extension in extensions
#   require.extensions[extension] = (module, filename) ->
#     ruby   = fs.readFileSync("#{filename}").toString()
#     source = Opal.compile(ruby, file: filename)
#     # console?.error ['FILENAME', filename]
#     # console?.error ['RUBY', ruby]
#     # console?.error ['JS', source]
#     module._compile(source, filename)
#
OpalNode.require __dirname + '/opal_node'
OpalNode.require __dirname + '/file'
OpalNode.require __dirname + '/dir'

global.OpalNode = OpalNode
