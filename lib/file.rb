class File
  def self.read path
    `#{__fs__}.readFileSync(#{path}).toString()`
  end

  def self.exist? path
    `#{__fs__}.existsSync(#{path})`
  end

  def self.__fs__
    @fs ||= `OpalNode.node_require('fs')`
  end
end
