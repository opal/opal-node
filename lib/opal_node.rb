class LoadError < ScriptError; end

module IO::Writable
  def puts(*args)
    write args.map { |arg| String(arg) }.join($/)+$/
  end
end

$stdout = IO.new
$stderr = IO.new
STDOUT = $stdout
STDERR = $stderr

def $stdout.write(string)
  `process.stdout.write(#{string})`
  nil
end

def $stderr.write(string)
  `process.stderr.write(string)`
  nil
end

$stdout.extend(IO::Writable)
$stderr.extend(IO::Writable)

module Kernel
  def require name
    `OpalNode.require(#{name})`
  end
end
