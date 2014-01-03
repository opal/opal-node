require 'native'

NodeRepl = Native(`OpalNode.node_require('repl')`)

def NodeRepl.start opations = {}
  `#@native.start(#{opations.to_n})`
end

NodeRepl.start prompt: 'opal-node> ', useGlobal: true, eval: -> (cmd, context, filename, callback) {
  result = `OpalNode.run(cmd, filename)`
  `callback(#{result.inspect})`
}
