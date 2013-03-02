class Dir
  def self.[] glob
    `#{__glob__}.sync(#{glob})`
  end

  def self.__glob__
    @__glob__ ||= `require('glob')`
  end
end
