require 'spec_helper'

describe Dir do
  describe '[glob]' do
    it 'lists files matching the glob' do
      path = File.expand_path('../fixtures/hello_world.rb', __FILE__)
      glob = File.expand_path('../fixtures/*', __FILE__)

      from_dir_of(__FILE__) do
        run("puts Dir[#{glob.inspect}].inspect").should eq(Dir[glob].inspect+"\n")
      end
    end
  end
end
