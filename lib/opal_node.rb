module Kernel
  def print *args
    `process.stdout.write(#{args.join})`
  end
end
