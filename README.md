# Opal for Node.js

[![Build Status](https://secure.travis-ci.org/elia/opal-node.png)](http://travis-ci.org/elia/opal-node)

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

Run with `opal-node app.rb`

Install with `npm install -g opal`


## Example


```ruby
# app.rb
require 'http/server'
HTTP::Server.start 3000 do
  [200, {'Content-Type' => 'text/plain'}, ["Hello World!\n"]]
end
```

This is the original Node.js example:

```js
// the original nodejs example
http = require('http')
var port = process.env.port || 1337;
http.createServer(function(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World\n');
}).listen(port);
```


Here's the (naive) rack-like implementation of `http/server.rb`

```ruby
# http/server.rb
module HTTP
  `_http = require('http')`
  class Server < `_http.Server`
    alias_native :listen, :listen

    def self.start port, &block
      server = new `function(request, response) {
        request.on('end', function(chunk) {
          var rackResponse = #{ block.call(`request`, `response`) };
          response.writeHead(rackResponse[0], #{ `rackResponse[1]`.to_native });
          response.end( rackResponse[2].join(' ') );
        })
      }`
      server.listen(port)
      server
    end
  end
end
```


## Developing

Start a coffe watcher to keep opal.js in sync with opal.coffee

    coffee -cwo lib/ lib/*.coffee


## Testing

To keep the specs running while developing just install and use [spectator](https://github.com/elia/spectator#readme)
that will compile `opal.coffee` to `opal.js` before every run of the spec.

	$ gem install spectator
	$ gem install notify # to get notification
	$ spectator
	--- Waiting for changes...



## License

This project rocks and uses MIT-LICENSE.
