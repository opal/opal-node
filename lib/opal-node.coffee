sourceFile = "#{__dirname}/../opal/opal.js"
parserFile = "#{__dirname}/../opal/opal-parser.js"

extensions = ['.opal', '.rb']

fs = require('fs')
__path__ = require('path')

source = fs.readFileSync(sourceFile).toString()
parser = fs.readFileSync(parserFile).toString()

# Being Ruby classes and modules are global constants, hence it makes sense to
# break loose from the nodejs module system chains and just live in the GLOBAL
# object.
vm = require 'vm'
vm.runInThisContext(source, sourceFile)
vm.runInThisContext(parser, parserFile)

class OpalNode
  @load_path: [__dirname+'/../opal', __dirname]
  @loaded: {}
  @backtrace: []
  @node_require: require

  @run: (ruby, filename)->
    js = OpalNode.compile(ruby, file: filename)
    vm.runInThisContext(js, filename)

  @compile: (ruby, options = undefined) -> # Override function for now
    # Options can be Hash or plain JS
    if options and options.klass isnt Opal.Hash
      keys = (key for key, value of options)
      options = Opal.hash2(keys, options)
    compiler = Opal.Opal.Compiler.$new()
    source = compiler.$compile(ruby, options)

    for required in compiler.$requires()
      OpalNode.require required

    Opal.Opal.$compile(ruby, options)

  @resolve: (filename)->
    try
      if filename.match(/^\./)
        filepath = __path__.resolve(process.cwd(), filename)
        require.resolve(filepath)
      else
        for path in OpalNode.load_path
          full_path = __path__.resolve(path, filename)
          return full_path if fs.existsSync(full_path)

          full_path = full_path.replace(/(\.rb)?$/, '.js')
          return full_path if fs.existsSync(full_path)

        # If it wasn't found fallback to NodeJS resolver
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
        stack = OpalNode.backtrace
        file = stack[stack.length-1] || __filename
        OpalNode.run("raise LoadError, 'cannot load such file -- #{filename}'", file)
      else
        # Fallback to node if there's no ruby file
        return require(filename)

    # Check if it has been already loaded
    loaded = OpalNode.loaded[filename]
    OpalNode.backtrace.push(filename)
    return false if loaded

    ruby = fs.readFileSync("#{full_path}").toString()
    OpalNode.loaded[filename] = true
    if full_path.match(/\.js$/)
      vm.runInThisContext(ruby, filename)
    else
      OpalNode.run(ruby, filename)

    OpalNode.backtrace.pop()

global.OpalNode = OpalNode

OpalNode.require __dirname + '/opal_node'
OpalNode.require __dirname + '/file'
OpalNode.require __dirname + '/dir'
