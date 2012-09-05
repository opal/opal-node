require 'spec_helper'

describe 'opal-node' do
  let(:hello_world) { File.expand_path('../fixtures/hello_world.rb', __FILE__) }

  it 'prints hello world' do
    opal_node(hello_world).should include('hello world')
  end

  def opal_node path
    base_dir = File.expand_path('../..', __FILE__)
    command = %Q{NODE_PATH="$NODE_PATH:#{base_dir}/lib" node #{base_dir}/bin/opal-node #{path}}
    `#{command}`
  end
end
