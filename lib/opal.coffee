version    = '0.3.27'
extensions = ['.opal', '.rb']

fs = require('fs')
Opal = require("#{__dirname}/opal-#{version}").Opal
exports.Opal = Opal
require("#{__dirname}/opal-parser-#{version}")


Opal.source = ->
  @_source ||= fs.readFileSync("#{__dirname}/opal-#{version}.js").toString()

Opal.parserSource = ->
  @_parserSource ||= fs.readFileSync("#{__dirname}/opal-parser-#{version}.js").toString()

# eval(Opal.parserSource())

Opal.parse = (filename) ->
  fileSource = fs.readFileSync("#{filename}").toString()
  return Opal.Opal.Parser.$new().$parse(fileSource)

for extension in extensions
  require.extensions[extension] = (module, filename) ->
    source = Opal.parse(filename)
    source = source.replace(/\/\/= require ([^;]+);/, 'require("$1");')
    content = """
      var Opal = require('opal').Opal;
      (#{source})();
    """
    module._compile(content, filename)
