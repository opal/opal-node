RSpec.configure do |c|
  c.before :all do
    compile_opal_coffee.should be_true
  end

  def compile_opal_coffee
    system "coffee -c #{File.expand_path('../../lib/opal.coffee', __FILE__)}"
  end
end
