require 'spec_helper'

describe 'opal-node' do
  it 'executes a script that prints "hello world"' do
    hello_world = a_file_with_name 'hello_world.rb', and_contents: "puts 'hello world!'\n"
    opal_node(hello_world).should eq("hello world!\n")
  end

  it 'can require .rb files' do
    hello_world = a_file_with_name 'hello_world.rb', and_contents: "puts 'hello world!'\n"
    requiring   = a_file_with_name 'requiring.rb',   and_contents: "require './hello_world'\n"
    opal_node(requiring).should eq("hello world!\n")
  end



  def opal_node path
    base_dir = File.expand_path('../..', __FILE__)
    command = %Q{NODE_PATH="$NODE_PATH:#{base_dir}/lib" node #{base_dir}/bin/opal-node #{path}}
    `#{command}`
  end

  def a_file_with_name name, options
    require 'tempfile'
    path = File.expand_path("../../tmp/#{name}", __FILE__)
    contents = options[:and_contents]
    File.open(path, 'w') { |file| file << contents }
    path
  end
end
