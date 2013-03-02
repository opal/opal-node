require 'spec_helper'

describe File do
  describe '.read' do
    it 'reads the file contents' do
      path = File.expand_path('../fixtures/hello_world.rb', __FILE__)
      run("print File.read('#{path}')\n").should eq(File.read(path))
    end
  end
end
