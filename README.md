# Opal for Node.js

Use Ruby on Node.js for **REAL-WORLD rofl-SCALING**

<br>
> Use Node.js FOR SPEED 
>
> — <cite>[@RoflscaleTips](https://twitter.com/RoflscaleTips/status/57551756657303552)</cite>


<br>
> [@hipsterhacker](https://twitter.com/hipsterhacker) I approve of your choices of roflscale technologies, particularly Node. Your roflmillions of users will appreciate it.
>
> — <cite>[@RoflscaleTips](https://twitter.com/RoflscaleTips/status/50320781162446848)</cite>

<br>
> mongodb should be ported to nodejs for improved scalability
>
> — <cite>[@RoflscaleTips](https://twitter.com/RoflscaleTips/status/190291005138939904)</cite>




## Usage

Run with `opal-node app.opal`


## Example

A naive rack-like implementation for Opal-Ruby

```ruby
# server.rb
class Server
  def initialize port
    @http = `require('http')`
    @port = port
  end
  
  def start &block
    %x{
      this.http.createServer(function(req, res) {
        var rackResponse = (block.call(block._s, req, res));
        res.end(rackResponse[2].join(' '));
      }).listen(this.port);
    }
  end
end

# app.rb
require 'server'
server = Server.new 3000
server.start do
  [200, {'Content-Type' => 'text/plain'}, ["Hello World!\n"]]
end
```



This is the original Node.js example:

```js
# the original nodejs example
http = require('http')
var port = process.env.port || 1337;
http.createServer(function(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World\n');
}).listen(port);
```


## Requirements

You need [Node.js](http://nodejs.org) and Opal (v0.3.19)

`gem install opal -v0.3.19`


## License

This project rocks and uses MIT-LICENSE.
