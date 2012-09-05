RSpec.configure do |c|
  c.before :suite do
    system "coffee -c #{File.expand_path('../../lib/opal.coffee', __FILE__)}"
  end
end
