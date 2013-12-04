#!/usr/bin/env rake

# BUNDLER

begin
  require 'bundler/setup'
rescue LoadError
  puts 'You must `gem install bundler` and `bundle install` to run rake tasks'
  exit 1
end


# TEST

require 'rspec/core/rake_task'
RSpec::Core::RakeTask.new :default


# OPAL

desc "Build all js files to ./build"
task :build do
  require 'fileutils'
  require 'opal'
  require 'opal-sprockets'
  env = Sprockets::Environment.new

  base_dir = 'opal'
  Opal.paths.each { |p| env.append_path p }
  version = Opal::VERSION

  puts "Building version #{version}"
  File.open("#{base_dir}/opal-version", 'w') { |f| f << version}
  %w[opal opal-parser].each do |file|
    path = "#{base_dir}/#{file}.js"
    puts "Building #{file.ljust 20} to: #{path}"
    File.open(path, 'w') { |f| f << env[file].to_s}
  end
  puts 'Done.'
end

