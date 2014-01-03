require 'spec_helper'

describe File do
  describe '.read' do
    it 'reads the file contents' do
      path = File.expand_path('../fixtures/hello_world.rb', __FILE__)
      from_dir_of(__FILE__) do
        run("puts File.read('#{path}')\n").should eq(File.read(path)+"\n")
      end
    end
  end
end
