RSpec.configure do |c|
  c.before :all do
    compile_opal_coffee.should be_true
  end

  def compile_opal_coffee
    system "coffee -c #{File.expand_path('../../lib/opal.coffee', __FILE__)}"
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

  def run code
    rb_file = a_file_with_name 'rb_file.rb', and_contents: code
    opal_node(rb_file, File.dirname(rb_file))
  end
end
