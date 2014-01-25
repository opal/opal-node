require 'native'

class Express < Native::Object
  EXPRESS = `OpalNode.node_require('express')`

  def initialize &block
    # `console.log(typeof #{EXPRESS});`
    @native = `#{EXPRESS}()`
    p app.class
    # `console.log(#{app}._klass);`
    p Kernel.native?(app)
    # app = super(app)
    yield self if block_given?
  end

  class Request < Native::Object
  end

  class Response < Native::Object
    alias_native :send, :send
    alias_native :[]=, :setHeader
  end

  %i[get post put delete].each do |method_name|
    define_method method_name do |path, &block|

      %x|
        #{@native}[#{method_name}](#{path}, function(req, res) {
          req = #{Request.new(`req`)};
          res = #{Response.new(`res`)};
          #{block.call(`req`, `res`)}
        })
      |
    end
  end
end

Express.new do |app|
  app.get '/' do |req, res|
    p req.class
    p res.class
    res.send 200, <<-HTML
    <!doctype html>
    <html>
      <head><style>body{font-family: sans-serif;}</style></head>
      <body><h1>Hulla!</h1></body>
    </html>
    HTML
  end
end.listen 3000
