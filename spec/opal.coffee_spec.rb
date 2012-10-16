require 'spec_helper'

describe 'opal-node' do
  it 'executes a script that prints "hello world"' do
    hello_world = a_file_with_name 'hello_world.rb', and_contents: "puts 'hello world!'\n"
    opal_node(hello_world).should eq("hello world!\n")
  end

  context 'requires .rb files' do
    let!(:hello_world) { a_file_with_name 'hello_world.rb', and_contents: "puts 'hello world!'\n" }

    it 'without a leading ./' do
      requiring = a_file_with_name 'requiring.rb', and_contents: "require 'hello_world'\n"
      opal_node(requiring, File.dirname(requiring)).should eq("hello world!\n")
    end

    it 'with a leading ./' do
      requiring = a_file_with_name 'requiring.rb', and_contents: "require './hello_world'\n"
      opal_node(requiring, File.dirname(requiring)).should eq("hello world!\n")
    end

    it 'with explicit extension' do
      requiring = a_file_with_name 'requiring.rb', and_contents: "require './hello_world.rb'\n"
      opal_node(requiring, File.dirname(requiring)).should eq("hello world!\n")
    end
  end



  def opal_node path, include_dir = nil
    base_dir = File.expand_path('../..', __FILE__)
    node_path = [include_dir, "#{base_dir}/lib", '$NODE_PATH'].compact
    command = %Q{NODE_PATH="#{node_path.join(':')}" node #{base_dir}/bin/opal-node #{path}}
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
