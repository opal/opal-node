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
      requiring = a_file_with_name 'requiring.rb', and_contents: "require './hello_world.rb'\n"
      Dir.chdir File.dirname(requiring) do
        opal_node(requiring, File.dirname(requiring)).should eq("hello world!\n")
      end
    end

    it 'with explicit extension' do
      requiring = a_file_with_name 'requiring.rb', and_contents: "require './hello_world.rb'\n"
      Dir.chdir File.dirname(requiring) do
        opal_node(requiring, File.dirname(requiring)).should eq("hello world!\n")
      end
    end
  end
end
