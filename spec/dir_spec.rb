require 'spec_helper'

describe Dir do
  describe '[glob]' do
    it 'lists files matching the glob' do
      path = File.expand_path('../fixtures/hello_world.rb', __FILE__)
      glob = File.expand_path('../fixtures/*', __FILE__)
      run("print Dir[#{glob.inspect}].inspect").should eq(Dir[glob].inspect)
    end
  end
end
