(function(undefined) {
  // The Opal object that is exposed globally
  var Opal = this.Opal = {};

  // Very root class
  function BasicObject(){}

  // Core Object class
  function Object(){}

  // Class' class
  function Class(){}

  // the class of nil
  function NilClass(){}

  // TopScope is used for inheriting constants from the top scope
  var TopScope = function(){};

  // Opal just acts as the top scope
  TopScope.prototype = Opal;

  // To inherit scopes
  Opal.alloc  = TopScope;

  // This is a useful reference to global object inside ruby files
  Opal.global = this;

  // Minify common function calls
  var __hasOwn = Opal.hasOwnProperty;
  var __slice  = Opal.slice = Array.prototype.slice;

  // Generates unique id for every ruby object
  var unique_id = 0;

  // Return next unique id
  Opal.uid = function() {
    return unique_id++;
  };

  // Table holds all class variables
  Opal.cvars = {};

  // Globals table
  Opal.gvars = {};

  Opal.klass = function(base, superklass, id, constructor) {
    var klass;
    if (base._isObject) {
      base = base._klass;
    }

    if (superklass === null) {
      superklass = Object;
    }

    if (__hasOwn.call(base._scope, id)) {
      klass = base._scope[id];
    }
    else {
      if (!superklass._methods) {
        var bridged = superklass;
        superklass  = Object;
        klass       = bridge_class(bridged);
      }
      else {
        klass = boot_class(superklass, constructor);
      }

      klass._name = (base === Object ? id : base._name + '::' + id);

      var const_alloc   = function() {};
      var const_scope   = const_alloc.prototype = new base._scope.alloc();
      klass._scope      = const_scope;
      const_scope.alloc = const_alloc;

      base[id] = base._scope[id] = klass;

      if (superklass.$inherited) {
        superklass.$inherited(klass);
      }
    }

    return klass;
  };

  // Define new module (or return existing module)
  Opal.module = function(base, id, constructor) {
    var klass;
    if (base._isObject) {
      base = base._klass;
    }

    if (__hasOwn.call(base._scope, id)) {
      klass = base._scope[id];
    }
    else {
      klass = boot_class(Class, constructor);
      klass._name = (base === Object ? id : base._name + '::' + id);

      klass.$included_in = [];

      var const_alloc   = function() {};
      var const_scope   = const_alloc.prototype = new base._scope.alloc();
      klass._scope      = const_scope;
      const_scope.alloc = const_alloc;

      base[id] = base._scope[id]    = klass;
    }

    return klass;
  }

  // Utility function to raise a "no block given" error
  var no_block_given = function() {
    throw new Error('no block given');
  };

  // Boot a base class (makes instances).
  var boot_defclass = function(id, constructor, superklass) {
    if (superklass) {
      var ctor           = function() {};
          ctor.prototype = superklass.prototype;

      constructor.prototype = new ctor();
    }

    var prototype = constructor.prototype;

    prototype.constructor = constructor;
    prototype._isObject   = true;
    prototype._klass      = constructor;

    constructor._inherited    = [];
    constructor._included_in  = [];
    constructor._isClass      = true;
    constructor._name         = id;
    constructor._super        = superklass;
    constructor._methods      = [];
    constructor._smethods     = [];
    constructor._isObject     = false;

    constructor._donate = __donate;
    constructor._defs = __defs;

    constructor['$==='] = module_eqq;
    constructor.$to_s = module_to_s;
    constructor.toString = module_to_s;

    Opal[id] = constructor;

    return constructor;
  };

  // Create generic class with given superclass.
  var boot_class = Opal.boot = function(superklass, constructor) {
    var ctor = function() {};
        ctor.prototype = superklass.prototype;

    constructor.prototype = new ctor();
    var prototype = constructor.prototype;

    prototype._klass      = constructor;
    prototype.constructor = constructor;

    constructor._inherited    = [];
    constructor._included_in  = [];
    constructor._isClass      = true;
    constructor._super        = superklass;
    constructor._methods      = [];
    constructor._isObject     = false;
    constructor._klass        = Class;
    constructor._donate       = __donate
    constructor._defs = __defs;

    constructor['$==='] = module_eqq;
    constructor.$to_s = module_to_s;
    constructor.toString = module_to_s;

    constructor['$[]'] = undefined;
    constructor['$call'] = undefined;

    var smethods;

    smethods = superklass._smethods.slice();

    constructor._smethods = smethods;
    for (var i = 0, length = smethods.length; i < length; i++) {
      var m = smethods[i];
      constructor[m] = superklass[m];
    }

    superklass._inherited.push(constructor);

    return constructor;
  };

  var bridge_class = function(constructor) {
    constructor.prototype._klass = constructor;

    constructor._inherited    = [];
    constructor._included_in  = [];
    constructor._isClass      = true;
    constructor._super        = Object;
    constructor._klass        = Class;
    constructor._methods      = [];
    constructor._smethods     = [];
    constructor._isObject     = false;

    constructor._donate = function(){};
    constructor._defs = __defs;

    constructor['$==='] = module_eqq;
    constructor.$to_s = module_to_s;
    constructor.toString = module_to_s;

    var smethods = constructor._smethods = Class._methods.slice();
    for (var i = 0, length = smethods.length; i < length; i++) {
      var m = smethods[i];
      constructor[m] = Object[m];
    }

    bridged_classes.push(constructor);

    var table = Object.prototype, methods = Object._methods;

    for (var i = 0, length = methods.length; i < length; i++) {
      var m = methods[i];
      constructor.prototype[m] = table[m];
    }

    constructor._smethods.push('$allocate');

    return constructor;
  };

  Opal.puts = function(a) { console.log(a); };
  
  // Method missing dispatcher
  Opal.mm = function(mid) {
    return function() {
      return this.$method_missing.apply(this, [mid].concat(__slice.call(arguments)));
    }
  };

  // Const missing dispatcher
  Opal.cm = function(name) {
    throw Opal.NameError.$new('uninitialized constant ' + name);
  };

  // Arity count error dispatcher
  Opal.ac = function(actual, expected, object, meth) {
    var inspect = (object._isObject ? object._klass._name + '#' : object._name + '.') + meth;
    var msg = '[' + inspect + '] wrong number of arguments(' + actual + ' for ' + expected + ')'
    throw Opal.ArgumentError.$new(msg);
  }

  // Initialization
  // --------------

  boot_defclass('BasicObject', BasicObject)
  boot_defclass('Object', Object, BasicObject);
  boot_defclass('Class', Class, Object);

  Class.prototype = Function.prototype;

  BasicObject._klass = Object._klass = Class._klass = Class;

  // Implementation of Class#===
  function module_eqq(object) {
    if (object == null) {
      return false;
    }

    var search = object._klass;

    while (search) {
      if (search === this) {
        return true;
      }

      search = search._super;
    }

    return false;
  }

  // Implementation of Class#to_s
  function module_to_s() {
    return this._name;
  }

  // Donator for all 'normal' classes and modules
  function __donate(defined, indirect) {
    var methods = this._methods, included_in = this.$included_in;

    // if (!indirect) {
      this._methods = methods.concat(defined);
    // }

    if (included_in) {
      for (var i = 0, length = included_in.length; i < length; i++) {
        var includee = included_in[i];
        var dest = includee.prototype;

        for (var j = 0, jj = defined.length; j < jj; j++) {
          var method = defined[j];
          dest[method] = this.prototype[method];
        }

        if (includee.$included_in) {
          includee._donate(defined, true);
        }
      }

    }
  }

  // Define a singleton method on a class
  function __defs(mid, body) {
    this._smethods.push(mid);
    this[mid] = body;

    var inherited = this._inherited;
    if (inherited.length) {
      for (var i = 0, length = inherited.length, subclass; i < length; i++) {
        subclass = inherited[i];
        if (!subclass[mid]) {
          subclass._defs(mid, body);
        }
      }
    }
  }

  var bridged_classes = Object.$included_in = [];

  BasicObject._scope = Object._scope = Opal;
  Opal.Module = Opal.Class;
  Opal.Kernel = Object;

  var class_const_alloc = function(){};
  var class_const_scope = new TopScope();
  class_const_scope.alloc = class_const_alloc;
  Class._scope = class_const_scope;

  Object.prototype.toString = function() {
    return this.$to_s();
  };

  Opal.top = new Object;

  Opal.klass(Object, Object, 'NilClass', NilClass)
  Opal.nil = new NilClass;

  Opal.breaker  = new Error('unexpected break');
}).call(this);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __klass = __opal.klass;
  return (function(__base, __super){
    function Class() {};
    Class = __klass(__base, __super, "Class", Class);

    var def = Class.prototype, __scope = Class._scope;

    Class._defs('$new', function(sup, block) {
      var _a;var BLOCK_IDX = arguments.length - 1;
      if (typeof(arguments[BLOCK_IDX]) === 'function' && arguments[BLOCK_IDX]._s !== undefined) { block = arguments[BLOCK_IDX] } else { block = nil }if (sup == null || sup === block) {
        sup = ((_a = __scope.Object) == null ? __opal.cm("Object") : _a)
      }
      
      function AnonClass(){};
      var klass   = Opal.boot(sup, AnonClass)
      klass._name = nil;
      klass._scope = sup._scope;

      sup.$inherited(klass);

      if (block !== nil) {
        var block_self = block._s;
        block._s = null;
        block.call(klass);
        block._s = block_self;
      }

      return klass;
    
    });

    def.$allocate = function() {
      
      
      var obj = new this;
      obj._id = Opal.uid();
      return obj;
    
    };

    def.$alias_method = function(newname, oldname) {
      
      this.prototype['$' + newname] = this.prototype['$' + oldname];
      return this;
    };

    def.$ancestors = function() {
      
      
      var parent = this,
          result = [];

      while (parent) {
        result.push(parent);
        parent = parent._super;
      }

      return result;
    
    };

    def.$append_features = function(klass) {
      
      
      var module = this;

      if (!klass.$included_modules) {
        klass.$included_modules = [];
      }

      for (var idx = 0, length = klass.$included_modules.length; idx < length; idx++) {
        if (klass.$included_modules[idx] === module) {
          return;
        }
      }

      klass.$included_modules.push(module);

      if (!module.$included_in) {
        module.$included_in = [];
      }

      module.$included_in.push(klass);

      var donator   = module.prototype,
          prototype = klass.prototype,
          methods   = module._methods;

      for (var i = 0, length = methods.length; i < length; i++) {
        var method = methods[i];
        prototype[method] = donator[method];
      }

      if (prototype._smethods) {
        prototype._smethods.push.apply(prototype._smethods, methods);  
      }

      if (klass.$included_in) {
        klass._donate(methods.slice(), true);
      }
    
      return this;
    };

    def.$attr_accessor = function(names) {
      var _a;names = __slice.call(arguments, 0);
      ((_a = this).$attr_reader || $mm('attr_reader')).apply(_a, [].concat(names));
      return ((_a = this).$attr_writer || $mm('attr_writer')).apply(_a, [].concat(names));
    };

    def.$attr_reader = function(names) {
      names = __slice.call(arguments, 0);
      
      var proto = this.prototype;
      for (var i = 0, length = names.length; i < length; i++) {
        (function(name) {
          proto[name] = nil;

          proto['$' + name] = function() {
            return this[name];
          };
        })(names[i]);
      }
    
      return nil;
    };

    def.$attr_writer = function(names) {
      names = __slice.call(arguments, 0);
      
      var proto = this.prototype;
      for (var i = 0, length = names.length; i < length; i++) {
        (function(name) {
          proto[name] = nil;

          proto['$' + name + '='] = function(value) {
            return this[name] = value;
          };
        })(names[i]);
      }
    
      return nil;
    };

    def.$attr = def.$attr_accessor;

    def.$const_get = function(name) {
      var _a, _b;
      
      var result = this._scope[name];

      if (result == null) {
        ((_a = this).$raise || $mm('raise')).call(_a, ((_b = __scope.NameError) == null ? __opal.cm("NameError") : _b), "uninitialized constant " + (name))
      }

      return result;
    
    };

    def.$const_set = function(name, value) {
      var _a, _b;
      if ((_a = ((_b = name)['$=~'] || $mm('=~')).call(_b, /^[A-Z]/)) === false || _a === nil) {
        ((_a = this).$raise || $mm('raise')).call(_a, ((_b = __scope.NameError) == null ? __opal.cm("NameError") : _b), "wrong constant name " + (name))
      };
      if ((_a = ((_b = name)['$=~'] || $mm('=~')).call(_b, /^[\w_]+$/)) === false || _a === nil) {
        ((_a = this).$raise || $mm('raise')).call(_a, ((_b = __scope.NameError) == null ? __opal.cm("NameError") : _b), "wrong constant name " + (name))
      };
      try {
        name = ((_a = name).$to_str || $mm('to_str')).call(_a)
      } catch ($err) {
      if (true) {
        ((_a = this).$raise || $mm('raise')).call(_a, ((_b = __scope.TypeError) == null ? __opal.cm("TypeError") : _b), "conversion with #to_str failed")}
      else { throw $err; }
      };
      
      this._scope[name] = value;
      return value
    
    };

    def.$define_method = function(name, block) {
      if (typeof(block) !== 'function') { block = nil }
      
      if (block === nil) {
        no_block_given();
      }

      var jsid    = '$' + name;
      block._jsid = jsid;
      block._sup  = this.prototype[jsid];
      block._s    = null;

      this.prototype[jsid] = block;
      this._donate([jsid]);

      return nil;
    
    };

    def.$include = function(mods) {
      var _a;mods = __slice.call(arguments, 0);
      
      var i = mods.length - 1, mod;
      while (i >= 0) {
        mod = mods[i];
        i--;

        if (mod === this) {
          continue;
        }

        ((_a = (mod)).$append_features || $mm('append_features')).call(_a, this);
        ((_a = (mod)).$included || $mm('included')).call(_a, this);
      }

      return this;
    
    };

    def.$instance_methods = function(include_super) {
      if (include_super == null) {
        include_super = false
      }
      
      var methods = [], proto = this.prototype;

      for (var prop in this.prototype) {
        if (!include_super && !proto.hasOwnProperty(prop)) {
          continue;
        }

        if (prop.charAt(0) === '$') {
          methods.push(prop.substr(1));
        }
      }

      return methods;
    
    };

    def.$included = function(mod) {
      
      return nil;
    };

    def.$inherited = function(cls) {
      
      return nil;
    };

    def.$module_eval = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      if (block === nil) {
        no_block_given();
      }

      var block_self = block._s, result;

      block._s = null;
      result = block.call(this);
      block._s = block_self;

      return result;
    
    };

    def.$class_eval = def.$module_eval;

    def.$name = function() {
      
      return this._name;
    };

    def.$new = function() {
      
      
      var args = __slice.call(arguments);
      var obj = new this;
      obj._id = Opal.uid();

      obj.$initialize.apply(obj, args);
      return obj;
    
    };

    def.$public = function() {
      
      return nil;
    };

    def.$private = def.$public;

    def.$protected = def.$public;

    def.$superclass = function() {
      
      return this._super || nil;
    };

    def.$undef_method = function(symbol) {
      
      this.prototype['$' + symbol] = undefined;
      return this;
    };

    return nil;
  })(self, null)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __klass = __opal.klass;
  return (function(__base, __super){
    function BasicObject() {};
    BasicObject = __klass(__base, __super, "BasicObject", BasicObject);

    var def = BasicObject.prototype, __scope = BasicObject._scope;

    def.$initialize = function() {
      
      return nil;
    };

    def['$=='] = function(other) {
      
      return this === other;
    };

    def.$__send__ = function(symbol, args, block) {
      var block;args = __slice.call(arguments, 1);
      if (typeof(args[args.length - 1]) === 'function') { block = args.pop(); } else { block = nil; }
      
      
      var func = this['$' + symbol]

      if (func) {
        if (block !== nil) { args.push(block); }
        return func.apply(this, args);
      }

      return this.$method_missing.apply(this, [symbol].concat(args));
    
    };

    def['$eql?'] = def['$=='];

    def['$equal?'] = def['$=='];

    def.$instance_eval = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      if (block === nil) {
        no_block_given();
      }

      var block_self = block._s, result;

      block._s = null;
      result = block.call(this, this);
      block._s = block_self;

      return result;
    
    };

    def.$instance_exec = function(args, block) {
      var block;args = __slice.call(arguments, 0);
      if (typeof(args[args.length - 1]) === 'function') { block = args.pop(); } else { block = nil; }
      
      
      if (block === nil) {
        no_block_given();
      }

      var block_self = block._s, result;

      block._s = null;
      result = block.apply(this, args);
      block._s = block_self;

      return result;
    
    };

    def.$method_missing = function(symbol, args, block) {
      var _a, _b, block;args = __slice.call(arguments, 1);
      if (typeof(args[args.length - 1]) === 'function') { block = args.pop(); } else { block = nil; }
      
      return ((_a = ((_b = __scope.Kernel) == null ? __opal.cm("Kernel") : _b)).$raise || $mm('raise')).call(_a, ((_b = __scope.NoMethodError) == null ? __opal.cm("NoMethodError") : _b), "undefined method `" + (symbol) + "' for BasicObject instance");
    };

    return nil;
  })(self, null)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module;
  return (function(__base){
    function Kernel() {};
    Kernel = __module(__base, "Kernel", Kernel);
    var def = Kernel.prototype, __scope = Kernel._scope;

    def.$initialize = def.$initialize;

    def['$=='] = def['$=='];

    def.$__send__ = def.$__send__;

    def['$eql?'] = def['$eql?'];

    def['$equal?'] = def['$equal?'];

    def.$instance_eval = def.$instance_eval;

    def.$instance_exec = def.$instance_exec;

    def.$method_missing = function(symbol, args, block) {
      var _a, _b, block;args = __slice.call(arguments, 1);
      if (typeof(args[args.length - 1]) === 'function') { block = args.pop(); } else { block = nil; }
      
      return ((_a = this).$raise || $mm('raise')).call(_a, ((_b = __scope.NoMethodError) == null ? __opal.cm("NoMethodError") : _b), "undefined method `" + (symbol) + "' for " + (((_b = this).$inspect || $mm('inspect')).call(_b)));
    };

    def['$=~'] = function(obj) {
      
      return false;
    };

    def['$==='] = function(other) {
      
      return this == other;
    };

    def.$as_json = function() {
      
      return nil;
    };

    def.$method = function(name) {
      var _a, _b;
      
      var recv = this,
          meth = recv['$' + name],
          func = function() {
            return meth.apply(recv, __slice.call(arguments, 0));
          };

      if (!meth) {
        ((_a = this).$raise || $mm('raise')).call(_a, ((_b = __scope.NameError) == null ? __opal.cm("NameError") : _b));
      }

      func._klass = ((_a = __scope.Method) == null ? __opal.cm("Method") : _a);
      return func;
    
    };

    def.$methods = function(all) {
      if (all == null) {
        all = true
      }
      
      var methods = [];
      for(var k in this) {
        if(k[0] == "$" && typeof (this)[k] === "function") {
          if(all === false || all === nil) {
            if(!Object.hasOwnProperty.call(this, k)) {
              continue;
            }
          }
          methods.push(k.substr(1));
        }
      }
      return methods;
    
    };

    def.$Array = function(object) {
      var _a;
      
      if (object.$to_ary) {
        return ((_a = object).$to_ary || $mm('to_ary')).call(_a);
      }
      else if (object.$to_a) {
        return ((_a = object).$to_a || $mm('to_a')).call(_a);
      }

      return [object];
    
    };

    def.$class = function() {
      
      return this._klass;
    };

    def.$define_singleton_method = function(name, body) {
      if (typeof(body) !== 'function') { body = nil }
      
      if (body === nil) {
        no_block_given();
      }

      var jsid   = '$' + name;
      body._jsid = jsid;
      body._sup  = this[jsid];
      body._s    = null;

      this[jsid] = body;

      return this;
    
    };

    def.$enum_for = function(method, args) {
      var _a, _b;if (method == null) {
        method = "each"
      }args = __slice.call(arguments, 1);
      return ((_a = ((_b = __scope.Enumerator) == null ? __opal.cm("Enumerator") : _b)).$new || $mm('new')).apply(_a, [this, method].concat(args));
    };

    def['$equal?'] = function(other) {
      
      return this === other;
    };

    def.$extend = function(mods) {
      var _a, _b;mods = __slice.call(arguments, 0);
      
      for (var i = 0, length = mods.length; i < length; i++) {
        ((_a = ((_b = this).$singleton_class || $mm('singleton_class')).call(_b)).$include || $mm('include')).call(_a, mods[i]);
      }

      return this;
    
    };

    def.$format = function(format, args) {
      var _a, _b;args = __slice.call(arguments, 1);
      
      var idx = 0;
      return format.replace(/%(\d+\$)?([-+ 0]*)(\d*|\*(\d+\$)?)(?:\.(\d*|\*(\d+\$)?))?([cspdiubBoxXfgeEG])|(%%)/g, function(str, idx_str, flags, width_str, w_idx_str, prec_str, p_idx_str, spec, escaped) {
        if (escaped) {
          return '%';
        }

        var width,
        prec,
        is_integer_spec = ("diubBoxX".indexOf(spec) != -1),
        is_float_spec = ("eEfgG".indexOf(spec) != -1),
        prefix = '',
        obj;

        if (width_str === undefined) {
          width = undefined;
        } else if (width_str.charAt(0) == '*') {
          var w_idx = idx++;
          if (w_idx_str) {
            w_idx = parseInt(w_idx_str, 10) - 1;
          }
          width = ((_a = (args[w_idx])).$to_i || $mm('to_i')).call(_a);
        } else {
          width = parseInt(width_str, 10);
        }
        if (prec_str === undefined) {
          prec = is_float_spec ? 6 : undefined;
        } else if (prec_str.charAt(0) == '*') {
          var p_idx = idx++;
          if (p_idx_str) {
            p_idx = parseInt(p_idx_str, 10) - 1;
          }
          prec = ((_a = (args[p_idx])).$to_i || $mm('to_i')).call(_a);
        } else {
          prec = parseInt(prec_str, 10);
        }
        if (idx_str) {
          idx = parseInt(idx_str, 10) - 1;
        }
        switch (spec) {
        case 'c':
          obj = args[idx];
          if (obj._isString) {
            str = obj.charAt(0);
          } else {
            str = String.fromCharCode(((_a = (obj)).$to_i || $mm('to_i')).call(_a));
          }
          break;
        case 's':
          str = ((_a = (args[idx])).$to_s || $mm('to_s')).call(_a);
          if (prec !== undefined) {
            str = str.substr(0, prec);
          }
          break;
        case 'p':
          str = ((_a = (args[idx])).$inspect || $mm('inspect')).call(_a);
          if (prec !== undefined) {
            str = str.substr(0, prec);
          }
          break;
        case 'd':
        case 'i':
        case 'u':
          str = ((_a = (args[idx])).$to_i || $mm('to_i')).call(_a).toString();
          break;
        case 'b':
        case 'B':
          str = ((_a = (args[idx])).$to_i || $mm('to_i')).call(_a).toString(2);
          break;
        case 'o':
          str = ((_a = (args[idx])).$to_i || $mm('to_i')).call(_a).toString(8);
          break;
        case 'x':
        case 'X':
          str = ((_a = (args[idx])).$to_i || $mm('to_i')).call(_a).toString(16);
          break;
        case 'e':
        case 'E':
          str = ((_a = (args[idx])).$to_f || $mm('to_f')).call(_a).toExponential(prec);
          break;
        case 'f':
          str = ((_a = (args[idx])).$to_f || $mm('to_f')).call(_a).toFixed(prec);
          break;
        case 'g':
        case 'G':
          str = ((_a = (args[idx])).$to_f || $mm('to_f')).call(_a).toPrecision(prec);
          break;
        }
        idx++;
        if (is_integer_spec || is_float_spec) {
          if (str.charAt(0) == '-') {
            prefix = '-';
            str = str.substr(1);
          } else {
            if (flags.indexOf('+') != -1) {
              prefix = '+';
            } else if (flags.indexOf(' ') != -1) {
              prefix = ' ';
            }
          }
        }
        if (is_integer_spec && prec !== undefined) {
          if (str.length < prec) {
            str = (_a = "0", _b = prec - str.length, typeof(_a) === 'number' ? _a * _b : _a['$*'](_b)) + str;
          }
        }
        var total_len = prefix.length + str.length;
        if (width !== undefined && total_len < width) {
          if (flags.indexOf('-') != -1) {
            str = str + (_a = " ", _b = width - total_len, typeof(_a) === 'number' ? _a * _b : _a['$*'](_b));
          } else {
            var pad_char = ' ';
            if (flags.indexOf('0') != -1) {
              str = (_a = "0", _b = width - total_len, typeof(_a) === 'number' ? _a * _b : _a['$*'](_b)) + str;
            } else {
              prefix = (_a = " ", _b = width - total_len, typeof(_a) === 'number' ? _a * _b : _a['$*'](_b)) + prefix;
            }
          }
        }
        var result = prefix + str;
        if ('XEG'.indexOf(spec) != -1) {
          result = result.toUpperCase();
        }
        return result;
      });
    
    };

    def.$hash = function() {
      
      return this._id;
    };

    def.$inspect = function() {
      var _a;
      return ((_a = this).$to_s || $mm('to_s')).call(_a);
    };

    def['$instance_of?'] = function(klass) {
      
      return this._klass === klass;
    };

    def['$instance_variable_defined?'] = function(name) {
      
      return __hasOwn.call(this, name.substr(1));
    };

    def.$instance_variable_get = function(name) {
      
      
      var ivar = this[name.substr(1)];

      return ivar == null ? nil : ivar;
    
    };

    def.$instance_variable_set = function(name, value) {
      
      return this[name.substr(1)] = value;
    };

    def.$instance_variables = function() {
      
      
      var result = [];

      for (var name in this) {
        result.push(name);
      }

      return result;
    
    };

    def['$is_a?'] = function(klass) {
      
      
      var search = this._klass;

      while (search) {
        if (search === klass) {
          return true;
        }

        search = search._super;
      }

      return false;
    
    };

    def['$kind_of?'] = def['$is_a?'];

    def.$lambda = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      return block;
    };

    def.$loop = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      while (true) {;
      if (block() === __breaker) return __breaker.$v;
      };
      return this;
    };

    def['$nil?'] = function() {
      
      return false;
    };

    def.$object_id = function() {
      
      return this._id || (this._id = Opal.uid());
    };

    def.$printf = function(args) {
      var fmt = nil, _a, _b;args = __slice.call(arguments, 0);
      if (((_a = ((_b = args).$length || $mm('length')).call(_b))['$>'] || $mm('>')).call(_a, 0)) {
        fmt = ((_a = args).$shift || $mm('shift')).call(_a);
        ((_a = this).$print || $mm('print')).call(_a, ((_b = this).$format || $mm('format')).apply(_b, [fmt].concat(args)));
      };
      return nil;
    };

    def.$proc = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      if (block === nil) {
        no_block_given();
      }
      block.is_lambda = false;
      return block;
    
    };

    def.$puts = function(strs) {
      var _a;strs = __slice.call(arguments, 0);
      
      for (var i = 0; i < strs.length; i++) {
        if(strs[i] instanceof Array) {
          ((_a = this).$puts || $mm('puts')).apply(_a, [].concat((strs[i])))
        } else {
          __opal.puts(((_a = (strs[i])).$to_s || $mm('to_s')).call(_a));
        }
      }
    
      return nil;
    };

    def.$p = function(args) {
      var _a, _b;args = __slice.call(arguments, 0);
      console.log.apply(console, args);
      if (((_a = ((_b = args).$length || $mm('length')).call(_b))['$<='] || $mm('<=')).call(_a, 1)) {
        return ((_a = args)['$[]'] || $mm('[]')).call(_a, 0)
        } else {
        return args
      };
    };

    def.$print = def.$puts;

    def.$raise = function(exception, string) {
      var _a, _b;
      
      if (typeof(exception) === 'string') {
        exception = ((_a = ((_b = __scope.RuntimeError) == null ? __opal.cm("RuntimeError") : _b)).$new || $mm('new')).call(_a, exception);
      }
      else if (!((_a = exception)['$is_a?'] || $mm('is_a?')).call(_a, ((_b = __scope.Exception) == null ? __opal.cm("Exception") : _b))) {
        exception = ((_a = exception).$new || $mm('new')).call(_a, string);
      }

      throw exception;
    
    };

    def.$rand = function(max) {
      
      return max == null ? Math.random() : Math.floor(Math.random() * max);
    };

    def['$respond_to?'] = function(name) {
      
      return !!this['$' + name];
    };

    def.$send = def.$__send__;

    def.$singleton_class = function() {
      
      
      if (this._isClass) {
        if (this._singleton) {
          return this._singleton;
        }

        var meta = new __opal.Class;
        meta._klass = __opal.Class;
        this._singleton = meta;
        meta.prototype = this;

        return meta;
      }

      if (!this._isObject) {
        return this._klass;
      }

      if (this._singleton) {
        return this._singleton;
      }

      else {
        var orig_class = this._klass,
            class_id   = "#<Class:#<" + orig_class._name + ":" + orig_class._id + ">>";

        function Singleton() {};
        var meta = Opal.boot(orig_class, Singleton);
        meta._name = class_id;

        meta.prototype = this;
        this._singleton = meta;
        meta._klass = orig_class._klass;

        return meta;
      }
    
    };

    def.$sprintf = def.$format;

    def.$tap = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      if (block(this) === __breaker) return __breaker.$v;
      return this;
    };

    def.$to_json = function() {
      var _a, _b;
      return ((_a = ((_b = this).$to_s || $mm('to_s')).call(_b)).$to_json || $mm('to_json')).call(_a);
    };

    def.$to_proc = function() {
      
      return this;
    };

    def.$to_s = function() {
      
      return "#<" + this._klass._name + ":" + this._id + ">";
    };
        ;Kernel._donate(["$initialize", "$==", "$__send__", "$eql?", "$equal?", "$instance_eval", "$instance_exec", "$method_missing", "$=~", "$===", "$as_json", "$method", "$methods", "$Array", "$class", "$define_singleton_method", "$enum_for", "$equal?", "$extend", "$format", "$hash", "$inspect", "$instance_of?", "$instance_variable_defined?", "$instance_variable_get", "$instance_variable_set", "$instance_variables", "$is_a?", "$kind_of?", "$lambda", "$loop", "$nil?", "$object_id", "$printf", "$proc", "$puts", "$p", "$print", "$raise", "$rand", "$respond_to?", "$send", "$singleton_class", "$sprintf", "$tap", "$to_json", "$to_proc", "$to_s"]);
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __klass = __opal.klass;
  return (function(__base, __super){
    function NilClass() {};
    NilClass = __klass(__base, __super, "NilClass", NilClass);

    var def = NilClass.prototype, __scope = NilClass._scope;

    def['$&'] = function(other) {
      
      return false;
    };

    def['$|'] = function(other) {
      
      return other !== false && other !== nil;
    };

    def['$^'] = function(other) {
      
      return other !== false && other !== nil;
    };

    def['$=='] = function(other) {
      
      return other === nil;
    };

    def.$as_json = function() {
      
      return this;
    };

    def.$inspect = function() {
      
      return "nil";
    };

    def['$nil?'] = function() {
      
      return true;
    };

    def.$singleton_class = function() {
      var _a;
      return ((_a = __scope.NilClass) == null ? __opal.cm("NilClass") : _a);
    };

    def.$to_a = function() {
      
      return [];
    };

    def.$to_h = function() {
      
      return __opal.hash();
    };

    def.$to_i = function() {
      
      return 0;
    };

    def.$to_f = def.$to_i;

    def.$to_json = function() {
      
      return "null";
    };

    def.$to_native = function() {
      
      return null;
    };

    def.$to_s = function() {
      
      return "";
    };

    return nil;
  })(self, null)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __klass = __opal.klass;
  return (function(__base, __super){
    function Boolean() {};
    Boolean = __klass(__base, __super, "Boolean", Boolean);

    var def = Boolean.prototype, __scope = Boolean._scope;

    def._isBoolean = true;

    def['$&'] = function(other) {
      
      return (this == true) ? (other !== false && other !== nil) : false;
    };

    def['$|'] = function(other) {
      
      return (this == true) ? true : (other !== false && other !== nil);
    };

    def['$^'] = function(other) {
      
      return (this == true) ? (other === false || other === nil) : (other !== false && other !== nil);
    };

    def['$=='] = function(other) {
      
      return (this == true) === other.valueOf();
    };

    def.$as_json = function() {
      
      return this;
    };

    def.$singleton_class = def.$class;

    def.$to_json = function() {
      
      return (this == true) ? 'true' : 'false';
    };

    def.$to_s = function() {
      
      return (this == true) ? 'true' : 'false';
    };

    return nil;
  })(self, Boolean)
})(Opal);
(function(__opal) {
  var _a, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __klass = __opal.klass;
  (function(__base, __super){
    function Exception() {};
    Exception = __klass(__base, __super, "Exception", Exception);

    var def = Exception.prototype, __scope = Exception._scope;
    def.message = nil;

    def.$message = function() {
      
      return this.message
    }, nil;

    Exception._defs('$new', function(message) {
      if (message == null) {
        message = ""
      }
      
      var err = new Error(message);
      err._klass = this;
      err.name = this._name;
      return err;
    
    });

    def.$backtrace = function() {
      
      
      var backtrace = this.stack;

      if (typeof(backtrace) === 'string') {
        return backtrace.split("\n").slice(0, 15);
      }
      else if (backtrace) {
        return backtrace.slice(0, 15);
      }

      return [];
    
    };

    def.$inspect = function() {
      var _a, _b;
      return "#<" + (((_a = ((_b = this).$class || $mm('class')).call(_b)).$name || $mm('name')).call(_a)) + ": '" + (this.message) + "'>";
    };

    return def.$to_s = def.$message;
  })(self, Error);
  (function(__base, __super){
    function StandardError() {};
    StandardError = __klass(__base, __super, "StandardError", StandardError);

    var def = StandardError.prototype, __scope = StandardError._scope;

    return nil
  })(self, ((_a = __scope.Exception) == null ? __opal.cm("Exception") : _a));
  (function(__base, __super){
    function RuntimeError() {};
    RuntimeError = __klass(__base, __super, "RuntimeError", RuntimeError);

    var def = RuntimeError.prototype, __scope = RuntimeError._scope;

    return nil
  })(self, ((_a = __scope.Exception) == null ? __opal.cm("Exception") : _a));
  (function(__base, __super){
    function LocalJumpError() {};
    LocalJumpError = __klass(__base, __super, "LocalJumpError", LocalJumpError);

    var def = LocalJumpError.prototype, __scope = LocalJumpError._scope;

    return nil
  })(self, ((_a = __scope.Exception) == null ? __opal.cm("Exception") : _a));
  (function(__base, __super){
    function TypeError() {};
    TypeError = __klass(__base, __super, "TypeError", TypeError);

    var def = TypeError.prototype, __scope = TypeError._scope;

    return nil
  })(self, ((_a = __scope.Exception) == null ? __opal.cm("Exception") : _a));
  (function(__base, __super){
    function NameError() {};
    NameError = __klass(__base, __super, "NameError", NameError);

    var def = NameError.prototype, __scope = NameError._scope;

    return nil
  })(self, ((_a = __scope.Exception) == null ? __opal.cm("Exception") : _a));
  (function(__base, __super){
    function NoMethodError() {};
    NoMethodError = __klass(__base, __super, "NoMethodError", NoMethodError);

    var def = NoMethodError.prototype, __scope = NoMethodError._scope;

    return nil
  })(self, ((_a = __scope.Exception) == null ? __opal.cm("Exception") : _a));
  (function(__base, __super){
    function ArgumentError() {};
    ArgumentError = __klass(__base, __super, "ArgumentError", ArgumentError);

    var def = ArgumentError.prototype, __scope = ArgumentError._scope;

    return nil
  })(self, ((_a = __scope.Exception) == null ? __opal.cm("Exception") : _a));
  (function(__base, __super){
    function IndexError() {};
    IndexError = __klass(__base, __super, "IndexError", IndexError);

    var def = IndexError.prototype, __scope = IndexError._scope;

    return nil
  })(self, ((_a = __scope.Exception) == null ? __opal.cm("Exception") : _a));
  (function(__base, __super){
    function KeyError() {};
    KeyError = __klass(__base, __super, "KeyError", KeyError);

    var def = KeyError.prototype, __scope = KeyError._scope;

    return nil
  })(self, ((_a = __scope.Exception) == null ? __opal.cm("Exception") : _a));
  (function(__base, __super){
    function RangeError() {};
    RangeError = __klass(__base, __super, "RangeError", RangeError);

    var def = RangeError.prototype, __scope = RangeError._scope;

    return nil
  })(self, ((_a = __scope.Exception) == null ? __opal.cm("Exception") : _a));
  return (function(__base, __super){
    function StopIteration() {};
    StopIteration = __klass(__base, __super, "StopIteration", StopIteration);

    var def = StopIteration.prototype, __scope = StopIteration._scope;

    return nil
  })(self, ((_a = __scope.Exception) == null ? __opal.cm("Exception") : _a));
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __klass = __opal.klass, __gvars = __opal.gvars;
  (function(__base, __super){
    function Regexp() {};
    Regexp = __klass(__base, __super, "Regexp", Regexp);

    var def = Regexp.prototype, __scope = Regexp._scope;

    Regexp._defs('$escape', function(string) {
      
      return string.replace(/([.*+?^=!:${}()|[]\/\])/g, '\$1');
    });

    Regexp._defs('$new', function(string, options) {
      
      return new RegExp(string, options);
    });

    def['$=='] = function(other) {
      
      return other.constructor == RegExp && this.toString() === other.toString();
    };

    def['$==='] = def.test;

    def['$=~'] = function(string) {
      var _a;
      
      var result = this.exec(string);

      if (result) {
        result.$to_s    = match_to_s;
        result.$inspect = match_inspect;
        result._klass = ((_a = __scope.MatchData) == null ? __opal.cm("MatchData") : _a);

        __gvars["~"] = result;
      }
      else {
        __gvars["~"] = nil;
      }

      return result ? result.index : nil;
    
    };

    def['$eql?'] = def['$=='];

    def.$inspect = def.toString;

    def.$match = function(pattern, pos) {
      var _a;
      
      var result  = this.exec(pattern);

      if (result) {
        result.$to_s    = match_to_s;
        result.$inspect = match_inspect;
        result._klass = ((_a = __scope.MatchData) == null ? __opal.cm("MatchData") : _a);

        return __gvars["~"] = result;
      }
      else {
        return __gvars["~"] = nil;
      }
    
    };

    def.$to_s = function() {
      
      return this.source;
    };

    
    function match_to_s() {
      return this[0];
    }

    function match_inspect() {
      return "<#MatchData " + this[0].$inspect() + ">";
    }
  
  })(self, RegExp);
  return (function(__base, __super){
    function MatchData() {};
    MatchData = __klass(__base, __super, "MatchData", MatchData);

    var def = MatchData.prototype, __scope = MatchData._scope;

    return nil
  })(self, null);
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module;
  return (function(__base){
    function Comparable() {};
    Comparable = __module(__base, "Comparable", Comparable);
    var def = Comparable.prototype, __scope = Comparable._scope;

    def['$<'] = function(other) {
      var _a, _b;
      return ((_a = ((_b = this)['$<=>'] || $mm('<=>')).call(_b, other))['$=='] || $mm('==')).call(_a, -1);
    };

    def['$<='] = function(other) {
      var _a, _b;
      return ((_a = ((_b = this)['$<=>'] || $mm('<=>')).call(_b, other))['$<='] || $mm('<=')).call(_a, 0);
    };

    def['$=='] = function(other) {
      var _a, _b;
      return ((_a = ((_b = this)['$<=>'] || $mm('<=>')).call(_b, other))['$=='] || $mm('==')).call(_a, 0);
    };

    def['$>'] = function(other) {
      var _a, _b;
      return ((_a = ((_b = this)['$<=>'] || $mm('<=>')).call(_b, other))['$=='] || $mm('==')).call(_a, 1);
    };

    def['$>='] = function(other) {
      var _a, _b;
      return ((_a = ((_b = this)['$<=>'] || $mm('<=>')).call(_b, other))['$>='] || $mm('>=')).call(_a, 0);
    };

    def['$between?'] = function(min, max) {
      var _a, _b;
      return ((_a = ((_b = this)['$>'] || $mm('>')).call(_b, min)) ? ((_b = this)['$<'] || $mm('<')).call(_b, max) : _a);
    };
        ;Comparable._donate(["$<", "$<=", "$==", "$>", "$>=", "$between?"]);
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module;
  return (function(__base){
    function Enumerable() {};
    Enumerable = __module(__base, "Enumerable", Enumerable);
    var def = Enumerable.prototype, __scope = Enumerable._scope;

    def['$all?'] = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var result = true, proc;

      if (block !== nil) {
        proc = function(obj) {
          var value;

          if ((value = block(obj)) === __breaker) {
            return __breaker.$v;
          }

          if (value === false || value === nil) {
            result = false;
            __breaker.$v = nil;

            return __breaker;
          }
        }
      }
      else {
        proc = function(obj) {
          if (obj === false || obj === nil) {
            result = false;
            __breaker.$v = nil;

            return __breaker;
          }
        }
      }

      this.$each(proc);

      return result;
    
    };

    def['$any?'] = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var result = false, proc;

      if (block !== nil) {
        proc = function(obj) {
          var value;

          if ((value = block(obj)) === __breaker) {
            return __breaker.$v;
          }

          if (value !== false && value !== nil) {
            result       = true;
            __breaker.$v = nil;

            return __breaker;
          }
        }
      }
      else {
        proc = function(obj) {
          if (obj !== false && obj !== nil) {
            result      = true;
            __breaker.$v = nil;

            return __breaker;
          }
        }
      }

      this.$each(proc);

      return result;
    
    };

    def.$collect = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var result = [];

      var proc = function() {
        var obj = __slice.call(arguments), value;

        if ((value = block.apply(null, obj)) === __breaker) {
          return __breaker.$v;
        }

        result.push(value);
      };

      this.$each(proc);

      return result;
    
    };

    def.$reduce = function(object, block) {
      var BLOCK_IDX = arguments.length - 1;
      if (typeof(arguments[BLOCK_IDX]) === 'function' && arguments[BLOCK_IDX]._s !== undefined) { block = arguments[BLOCK_IDX] } else { block = nil }if (object === block && typeof(object) === 'function') { object = undefined; }
      
      var result = object == undefined ? 0 : object;

      var proc = function() {
        var obj = __slice.call(arguments), value;

        if ((value = block.apply(null, [result].concat(obj))) === __breaker) {
          result = __breaker.$v;
          __breaker.$v = nil;

          return __breaker;
        }

        result = value;
      };

      this.$each(proc);

      return result;
    
    };

    def.$count = function(object, block) {
      var _a;var BLOCK_IDX = arguments.length - 1;
      if (typeof(arguments[BLOCK_IDX]) === 'function' && arguments[BLOCK_IDX]._s !== undefined) { block = arguments[BLOCK_IDX] } else { block = nil }if (object === block && typeof(object) === 'function') { object = undefined; }
      
      var result = 0;

      if (object != null) {
        block = function(obj) { return ((_a = (obj))['$=='] || $mm('==')).call(_a, object); };
      }
      else if (block === nil) {
        block = function() { return true; };
      }

      var proc = function(obj) {
        var value;

        if ((value = block(obj)) === __breaker) {
          return __breaker.$v;
        }

        if (value !== false && value !== nil) {
          result++;
        }
      }

      this.$each(proc);

      return result;
    
    };

    def.$detect = function(ifnone, block) {
      var _a;var BLOCK_IDX = arguments.length - 1;
      if (typeof(arguments[BLOCK_IDX]) === 'function' && arguments[BLOCK_IDX]._s !== undefined) { block = arguments[BLOCK_IDX] } else { block = nil }if (ifnone === block && typeof(ifnone) === 'function') { ifnone = undefined; }
      
      var result = nil;

      this.$each(function(obj) {
        var value;

        if ((value = block(obj)) === __breaker) {
          return __breaker.$v;
        }

        if (value !== false && value !== nil) {
          result      = obj;
          __breaker.$v = nil;

          return __breaker;
        }
      });

      if (result !== nil) {
        return result;
      }

      if (typeof(ifnone) === 'function') {
        return ((_a = ifnone).$call || $mm('call')).call(_a);
      }

      return ifnone == null ? nil : ifnone;
    
    };

    def.$drop = function(number) {
      
      
      var result  = [],
          current = 0;

      this.$each(function(obj) {
        if (number < current) {
          result.push(e);
        }

        current++;
      });

      return result;
    
    };

    def.$drop_while = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var result = [];

      this.$each(function(obj) {
        var value;

        if ((value = block(obj)) === __breaker) {
          return __breaker;
        }

        if (value === false || value === nil) {
          result.push(obj);
          return value;
        }

        return __breaker;
      });

      return result;
    
    };

    def.$each_slice = function(n, block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var all = [];

      this.$each(function(obj) {
        all.push(obj);

        if (all.length == n) {
          block(all.slice(0));
          all = [];
        }
      });

      // our "last" group, if smaller than n then wont have been yielded
      if (all.length > 0) {
        block(all.slice(0));
      }

      return nil;
    
    };

    def.$each_with_index = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var index = 0;

      this.$each(function(obj) {
        var value;

        if ((value = block(obj, index)) === __breaker) {
          return __breaker.$v;
        }

        index++;
      });

      return nil;
    
    };

    def.$each_with_object = function(object, block) {
      if (typeof(block) !== 'function') { block = nil }
      
      this.$each(function(obj) {
        var value;

        if ((value = block(obj, object)) === __breaker) {
          return __breaker.$v;
        }
      });

      return object;
    
    };

    def.$entries = function() {
      
      
      var result = [];

      this.$each(function(obj) {
        result.push(obj);
      });

      return result;
    
    };

    def.$find = def.$detect;

    def.$find_all = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var result = [];

      this.$each(function(obj) {
        var value;

        if ((value = block(obj)) === __breaker) {
          return __breaker.$v;
        }

        if (value !== false && value !== nil) {
          result.push(obj);
        }
      });

      return result;
    
    };

    def.$find_index = function(object, block) {
      var _a;var BLOCK_IDX = arguments.length - 1;
      if (typeof(arguments[BLOCK_IDX]) === 'function' && arguments[BLOCK_IDX]._s !== undefined) { block = arguments[BLOCK_IDX] } else { block = nil }if (object === block && typeof(object) === 'function') { object = undefined; }
      
      var proc, result = nil, index = 0;

      if (object != null) {
        proc = function (obj) {
          if (((_a = (obj))['$=='] || $mm('==')).call(_a, object)) {
            result = index;
            return __breaker;
          }
          index += 1;
        };
      }
      else {
        proc = function(obj) {
          var value;

          if ((value = block(obj)) === __breaker) {
            return __breaker.$v;
          }

          if (value !== false && value !== nil) {
            result     = index;
            __breaker.$v = index;

            return __breaker;
          }
          index += 1;
        };
      }

      this.$each(proc);

      return result;
    
    };

    def.$first = function(number) {
      
      
      var result = [],
          current = 0,
          proc;

      if (number == null) {
        result = nil;
        proc = function(obj) {
            result = obj; return __breaker;
          };
      } else {
        proc = function(obj) {
            if (number <= current) {
              return __breaker;
            }

            result.push(obj);

            current++;
          };
      }

      this.$each(proc);

      return result;
    
    };

    def.$grep = function(pattern, block) {
      var _a;if (typeof(block) !== 'function') { block = nil }
      
      var result = [];

      this.$each(block !== nil
        ? function(obj) {
            var value = ((_a = pattern)['$==='] || $mm('===')).call(_a, obj);

            if (value !== false && value !== nil) {
              if ((value = block(obj)) === __breaker) {
                return __breaker.$v;
              }

              result.push(value);
            }
          }
        : function(obj) {
            var value = ((_a = pattern)['$==='] || $mm('===')).call(_a, obj);

            if (value !== false && value !== nil) {
              result.push(obj);
            }
          });

      return result;
    
    };

    def.$group_by = function(block) {
      var hash = nil, TMP_1, _a, _b, TMP_2;if (typeof(block) !== 'function') { block = nil }
      hash = ((_a = ((_b = __scope.Hash) == null ? __opal.cm("Hash") : _b)).$new || $mm('new')).call(_a, (TMP_1 = function(h, k) {

        var self = TMP_1._s || this, _a;
        if (h == null) h = nil;
if (k == null) k = nil;

        return ((_a = h)['$[]='] || $mm('[]=')).call(_a, k, [])
      }, TMP_1._s = this, TMP_1));
      ((_a = this).$each || $mm('each')).call(_a, (TMP_2 = function(el) {

        var self = TMP_2._s || this, _a, _b, _c;
        if (el == null) el = nil;

        return ((_a = ((_b = hash)['$[]'] || $mm('[]')).call(_b, ((_c = block).$call || $mm('call')).call(_c, el)))['$<<'] || $mm('<<')).call(_a, el)
      }, TMP_2._s = this, TMP_2));
      return hash;
    };

    def.$map = def.$collect;

    def.$select = def.$find_all;

    def.$take = def.$first;

    def.$to_a = def.$entries;

    def.$inject = def.$reduce;
        ;Enumerable._donate(["$all?", "$any?", "$collect", "$reduce", "$count", "$detect", "$drop", "$drop_while", "$each_slice", "$each_with_index", "$each_with_object", "$entries", "$find", "$find_all", "$find_index", "$first", "$grep", "$group_by", "$map", "$select", "$take", "$to_a", "$inject"]);
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __klass = __opal.klass;
  return (function(__base, __super){
    function Array() {};
    Array = __klass(__base, __super, "Array", Array);

    var def = Array.prototype, __scope = Array._scope, _a, _b;

    ((_a = Array).$include || $mm('include')).call(_a, ((_b = __scope.Enumerable) == null ? __opal.cm("Enumerable") : _b));

    def._isArray = true;

    Array._defs('$[]', function(objects) {
      objects = __slice.call(arguments, 0);
      return objects
    });

    Array._defs('$new', function(size, obj, block) {
      var BLOCK_IDX = arguments.length - 1;
      if (typeof(arguments[BLOCK_IDX]) === 'function' && arguments[BLOCK_IDX]._s !== undefined) { block = arguments[BLOCK_IDX] } else { block = nil }if (size === block && typeof(size) === 'function') { size = undefined; }if (obj == null || obj === block) {
        obj = nil
      }
      
      var arr = [];

      if (size && size._isArray) {
        for (var i = 0; i < size.length; i++) {
          arr[i] = size[i];
        }
      }
      else {
        if (block === nil) {
          for (var i = 0; i < size; i++) {
            arr[i] = obj;
          }
        }
        else {
          for (var i = 0; i < size; i++) {
            arr[i] = block(i);
          }
        }
      }

      return arr;
    
    });

    Array._defs('$try_convert', function(obj) {
      
      
      if (obj._isArray) {
        return obj;
      }

      return nil;
    
    });

    def['$&'] = function(other) {
      
      
      var result = [],
          seen   = {};

      for (var i = 0, length = this.length; i < length; i++) {
        var item = this[i];

        if (!seen[item]) {
          for (var j = 0, length2 = other.length; j < length2; j++) {
            var item2 = other[j];

            if ((item === item2) && !seen[item]) {
              seen[item] = true;

              result.push(item);
            }
          }
        }
      }

      return result;
    
    };

    def['$*'] = function(other) {
      
      
      if (typeof(other) === 'string') {
        return this.join(other);
      }

      var result = [];

      for (var i = 0; i < other; i++) {
        result = result.concat(this);
      }

      return result;
    
    };

    def['$+'] = function(other) {
      
      return this.slice().concat(other.slice());
    };

    def['$-'] = function(other) {
      var TMP_1, _a;
      return ((_a = this).$reject || $mm('reject')).call(_a, (TMP_1 = function(i) {

        var self = TMP_1._s || this, _a;
        if (i == null) i = nil;

        return ((_a = other)['$include?'] || $mm('include?')).call(_a, i)
      }, TMP_1._s = this, TMP_1));
    };

    def['$<<'] = function(object) {
      
      this.push(object);
      return this;
    };

    def['$<=>'] = function(other) {
      var _a;
      
      if (((_a = this).$hash || $mm('hash')).call(_a) === ((_a = other).$hash || $mm('hash')).call(_a)) {
        return 0;
      }

      if (this.length != other.length) {
        return (this.length > other.length) ? 1 : -1;
      }

      for (var i = 0, length = this.length, tmp; i < length; i++) {
        if ((tmp = ((_a = (this[i]))['$<=>'] || $mm('<=>')).call(_a, other[i])) !== 0) {
          return tmp;
        }
      }

      return 0;
    
    };

    def['$=='] = function(other) {
      var _a;
      
      if (!other || (this.length !== other.length)) {
        return false;
      }

      for (var i = 0, length = this.length; i < length; i++) {
        if (!((_a = (this[i]))['$=='] || $mm('==')).call(_a, other[i])) {
          return false;
        }
      }

      return true;
    
    };

    def['$[]'] = function(index, length) {
      var _a;
      
      var size = this.length;

      if (typeof index !== 'number') {
        if (index._isRange) {
          var exclude = index.exclude;
          length      = index.end;
          index       = index.begin;

          if (index > size) {
            return nil;
          }

          if (length < 0) {
            length += size;
          }

          if (!exclude) length += 1;
          return this.slice(index, length);
        }
        else {
          ((_a = this).$raise || $mm('raise')).call(_a, "bad arg for Array#[]");
        }
      }

      if (index < 0) {
        index += size;
      }

      if (length !== undefined) {
        if (length < 0 || index > size || index < 0) {
          return nil;
        }

        return this.slice(index, index + length);
      }
      else {
        if (index >= size || index < 0) {
          return nil;
        }

        return this[index];
      }
    
    };

    def['$[]='] = function(index, value) {
      
      
      var size = this.length;

      if (index < 0) {
        index += size;
      }

      return this[index] = value;
    
    };

    def.$assoc = function(object) {
      var _a;
      
      for (var i = 0, length = this.length, item; i < length; i++) {
        if (item = this[i], item.length && ((_a = (item[0]))['$=='] || $mm('==')).call(_a, object)) {
          return item;
        }
      }

      return nil;
    
    };

    def.$at = function(index) {
      
      
      if (index < 0) {
        index += this.length;
      }

      if (index < 0 || index >= this.length) {
        return nil;
      }

      return this[index];
    
    };

    def.$clear = function() {
      
      this.splice(0, this.length);
      return this;
    };

    def.$clone = function() {
      
      return this.slice();
    };

    def.$collect = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var result = [];

      for (var i = 0, length = this.length, value; i < length; i++) {
        if ((value = block(this[i])) === __breaker) {
          return __breaker.$v;
        }

        result.push(value);
      }

      return result;
    
    };

    def['$collect!'] = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      for (var i = 0, length = this.length, val; i < length; i++) {
        if ((val = block(this[i])) === __breaker) {
          return __breaker.$v;
        }

        this[i] = val;
      }
    
      return this;
    };

    def.$compact = function() {
      
      
      var result = [];

      for (var i = 0, length = this.length, item; i < length; i++) {
        if ((item = this[i]) !== nil) {
          result.push(item);
        }
      }

      return result;
    
    };

    def['$compact!'] = function() {
      
      
      var original = this.length;

      for (var i = 0, length = this.length; i < length; i++) {
        if (this[i] === nil) {
          this.splice(i, 1);

          length--;
          i--;
        }
      }

      return this.length === original ? nil : this;
    
    };

    def.$concat = function(other) {
      
      
      for (var i = 0, length = other.length; i < length; i++) {
        this.push(other[i]);
      }
    
      return this;
    };

    def.$count = function(object) {
      var _a;
      
      if (object == null) {
        return this.length;
      }

      var result = 0;

      for (var i = 0, length = this.length; i < length; i++) {
        if (((_a = (this[i]))['$=='] || $mm('==')).call(_a, object)) {
          result++;
        }
      }

      return result;
    
    };

    def.$delete = function(object) {
      var _a;
      
      var original = this.length;

      for (var i = 0, length = original; i < length; i++) {
        if (((_a = (this[i]))['$=='] || $mm('==')).call(_a, object)) {
          this.splice(i, 1);

          length--;
          i--;
        }
      }

      return this.length === original ? nil : object;
    
    };

    def.$delete_at = function(index) {
      
      
      if (index < 0) {
        index += this.length;
      }

      if (index < 0 || index >= this.length) {
        return nil;
      }

      var result = this[index];

      this.splice(index, 1);

      return result;
    
    };

    def.$delete_if = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      for (var i = 0, length = this.length, value; i < length; i++) {
        if ((value = block(this[i])) === __breaker) {
          return __breaker.$v;
        }

        if (value !== false && value !== nil) {
          this.splice(i, 1);

          length--;
          i--;
        }
      }
    
      return this;
    };

    def.$drop = function(number) {
      
      return this.slice(number);
    };

    def.$dup = def.$clone;

    def.$each = function(block) {
      var _a;if (typeof(block) !== 'function') { block = nil }
      if (block === nil) {
        return ((_a = this).$enum_for || $mm('enum_for')).call(_a, "each")
      };
      for (var i = 0, length = this.length; i < length; i++) {
      if (block(this[i]) === __breaker) return __breaker.$v;
      };
      return this;
    };

    def.$each_index = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      for (var i = 0, length = this.length; i < length; i++) {
      if (block(i) === __breaker) return __breaker.$v;
      };
      return this;
    };

    def['$empty?'] = function() {
      
      return !this.length;
    };

    def.$fetch = function(index, defaults, block) {
      var _a;var BLOCK_IDX = arguments.length - 1;
      if (typeof(arguments[BLOCK_IDX]) === 'function' && arguments[BLOCK_IDX]._s !== undefined) { block = arguments[BLOCK_IDX] } else { block = nil }if (defaults === block && typeof(defaults) === 'function') { defaults = undefined; }
      
      var original = index;

      if (index < 0) {
        index += this.length;
      }

      if (index >= 0 && index < this.length) {
        return this[index];
      }

      if (defaults != null) {
        return defaults;
      }

      if (block !== nil) {
        return block(original);
      }

      ((_a = this).$raise || $mm('raise')).call(_a, "Array#fetch");
    
    };

    def.$fill = function(obj, block) {
      var BLOCK_IDX = arguments.length - 1;
      if (typeof(arguments[BLOCK_IDX]) === 'function' && arguments[BLOCK_IDX]._s !== undefined) { block = arguments[BLOCK_IDX] } else { block = nil }if (obj === block && typeof(obj) === 'function') { obj = undefined; }
      
      if (block !== nil) {
        for (var i = 0, length = this.length; i < length; i++) {
          this[i] = block(i);
        }
      }
      else {
        for (var i = 0, length = this.length; i < length; i++) {
          this[i] = obj;
        }
      }
    
      return this;
    };

    def.$first = function(count) {
      
      
      if (count != null) {
        return this.slice(0, count);
      }

      return this.length === 0 ? nil : this[0];
    
    };

    def.$flatten = function(level) {
      var _a;
      
      var result = [];

      for (var i = 0, length = this.length, item; i < length; i++) {
        item = this[i];

        if (item._isArray) {
          if (level == null) {
            result = result.concat(((_a = (item)).$flatten || $mm('flatten')).call(_a));
          }
          else if (level === 0) {
            result.push(item);
          }
          else {
            result = result.concat(((_a = (item)).$flatten || $mm('flatten')).call(_a, level - 1));
          }
        }
        else {
          result.push(item);
        }
      }

      return result;
    
    };

    def['$flatten!'] = function(level) {
      var _a, _b;
      
      var size = this.length;
      ((_a = this).$replace || $mm('replace')).call(_a, ((_b = this).$flatten || $mm('flatten')).call(_b, level));

      return size === this.length ? nil : this;
    
    };

    def.$hash = function() {
      
      return this._id || (this._id = Opal.uid());
    };

    def['$include?'] = function(member) {
      var _a;
      
      for (var i = 0, length = this.length; i < length; i++) {
        if (((_a = (this[i]))['$=='] || $mm('==')).call(_a, member)) {
          return true;
        }
      }

      return false;
    
    };

    def.$index = function(object, block) {
      var _a;var BLOCK_IDX = arguments.length - 1;
      if (typeof(arguments[BLOCK_IDX]) === 'function' && arguments[BLOCK_IDX]._s !== undefined) { block = arguments[BLOCK_IDX] } else { block = nil }if (object === block && typeof(object) === 'function') { object = undefined; }
      
      if (object != null) {
        for (var i = 0, length = this.length; i < length; i++) {
          if (((_a = (this[i]))['$=='] || $mm('==')).call(_a, object)) {
            return i;
          }
        }
      }
      else if (block !== nil) {
        for (var i = 0, length = this.length, value; i < length; i++) {
          if ((value = block(this[i])) === __breaker) {
            return __breaker.$v;
          }

          if (value !== false && value !== nil) {
            return i;
          }
        }
      }

      return nil;
    
    };

    def.$insert = function(index, objects) {
      var _a;objects = __slice.call(arguments, 1);
      
      if (objects.length > 0) {
        if (index < 0) {
          index += this.length + 1;

          if (index < 0) {
            ((_a = this).$raise || $mm('raise')).call(_a, "" + (index) + " is out of bounds");
          }
        }
        if (index > this.length) {
          for (var i = this.length; i < index; i++) {
            this.push(nil);
          }
        }

        this.splice.apply(this, [index, 0].concat(objects));
      }
    
      return this;
    };

    def.$inspect = function() {
      var _a;
      
      var i, inspect, el, el_insp, length, object_id;

      inspect = [];
      object_id = ((_a = this).$object_id || $mm('object_id')).call(_a);
      length = this.length;

      for (i = 0; i < length; i++) {
        el = ((_a = this)['$[]'] || $mm('[]')).call(_a, i);

        // Check object_id to ensure it's not the same array get into an infinite loop
        el_insp = ((_a = (el)).$object_id || $mm('object_id')).call(_a) === object_id ? '[...]' : ((_a = (el)).$inspect || $mm('inspect')).call(_a);

        inspect.push(el_insp);
      }
      return '[' + inspect.join(', ') + ']';
    
    };

    def.$join = function(sep) {
      var _a;if (sep == null) {
        sep = ""
      }
      
      var result = [];

      for (var i = 0, length = this.length; i < length; i++) {
        result.push(((_a = (this[i])).$to_s || $mm('to_s')).call(_a));
      }

      return result.join(sep);
    
    };

    def.$keep_if = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      for (var i = 0, length = this.length, value; i < length; i++) {
        if ((value = block(this[i])) === __breaker) {
          return __breaker.$v;
        }

        if (value === false || value === nil) {
          this.splice(i, 1);

          length--;
          i--;
        }
      }
    
      return this;
    };

    def.$last = function(count) {
      var _a;
      
      var length = this.length;

      if (count == null) {
        return length === 0 ? nil : this[length - 1];
      }
      else if (count < 0) {
        ((_a = this).$raise || $mm('raise')).call(_a, "negative count given");
      }

      if (count > length) {
        count = length;
      }

      return this.slice(length - count, length);
    
    };

    def.$length = function() {
      
      return this.length;
    };

    def.$map = def.$collect;

    def['$map!'] = def['$collect!'];

    def.$pop = function(count) {
      var _a;
      
      var length = this.length;

      if (count == null) {
        return length === 0 ? nil : this.pop();
      }

      if (count < 0) {
        ((_a = this).$raise || $mm('raise')).call(_a, "negative count given");
      }

      return count > length ? this.splice(0, this.length) : this.splice(length - count, length);
    
    };

    def.$push = function(objects) {
      objects = __slice.call(arguments, 0);
      
      for (var i = 0, length = objects.length; i < length; i++) {
        this.push(objects[i]);
      }
    
      return this;
    };

    def.$rassoc = function(object) {
      var _a;
      
      for (var i = 0, length = this.length, item; i < length; i++) {
        item = this[i];

        if (item.length && item[1] !== undefined) {
          if (((_a = (item[1]))['$=='] || $mm('==')).call(_a, object)) {
            return item;
          }
        }
      }

      return nil;
    
    };

    def.$reject = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var result = [];

      for (var i = 0, length = this.length, value; i < length; i++) {
        if ((value = block(this[i])) === __breaker) {
          return __breaker.$v;
        }

        if (value === false || value === nil) {
          result.push(this[i]);
        }
      }
      return result;
    
    };

    def['$reject!'] = function(block) {
      var _a;if (typeof(block) !== 'function') { block = nil }
      
      var original = this.length;
      ((_a = this).$delete_if || $mm('delete_if')).call(_a, ((_a = block).$to_proc || $mm('to_proc')).call(_a));
      return this.length === original ? nil : this;
    
    };

    def.$replace = function(other) {
      
      
      this.splice(0, this.length);
      this.push.apply(this, other);
      return this;
    
    };

    def.$reverse = def.reverse;

    def['$reverse!'] = function() {
      var _a;
      
      this.splice(0);
      this.push.apply(this, ((_a = this).$reverse || $mm('reverse')).call(_a));
      return this;
    
    };

    def.$reverse_each = function(block) {
      var _a, _b;if (typeof(block) !== 'function') { block = nil }
      ((_a = ((_b = this).$reverse || $mm('reverse')).call(_b)).$each || $mm('each')).call(_a, ((_a = block).$to_proc || $mm('to_proc')).call(_a));
      return this;
    };

    def.$rindex = function(object, block) {
      var _a;var BLOCK_IDX = arguments.length - 1;
      if (typeof(arguments[BLOCK_IDX]) === 'function' && arguments[BLOCK_IDX]._s !== undefined) { block = arguments[BLOCK_IDX] } else { block = nil }if (object === block && typeof(object) === 'function') { object = undefined; }
      
      if (block !== nil) {
        for (var i = this.length - 1, value; i >= 0; i--) {
          if ((value = block(this[i])) === __breaker) {
            return __breaker.$v;
          }

          if (value !== false && value !== nil) {
            return i;
          }
        }
      }
      else {
        for (var i = this.length - 1; i >= 0; i--) {
          if (((_a = (this[i]))['$=='] || $mm('==')).call(_a, object)) {
            return i;
          }
        }
      }

      return nil;
    
    };

    def.$select = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var result = [];

      for (var i = 0, length = this.length, item, value; i < length; i++) {
        item = this[i];

        if ((value = block(item)) === __breaker) {
          return __breaker.$v;
        }

        if (value !== false && value !== nil) {
          result.push(item);
        }
      }

      return result;
    
    };

    def['$select!'] = function(block) {
      var _a;if (typeof(block) !== 'function') { block = nil }
      
      var original = this.length;
      ((_a = this).$keep_if || $mm('keep_if')).call(_a, ((_a = block).$to_proc || $mm('to_proc')).call(_a));
      return this.length === original ? nil : this;
    
    };

    def.$shift = function(count) {
      
      
      if (this.length === 0) {
        return nil;
      }

      return count == null ? this.shift() : this.splice(0, count)
    
    };

    def.$size = def.$length;

    def.$shuffle = function() {
      
      
        for (var i = this.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = this[i];
          this[i] = this[j];
          this[j] = tmp;
        }

        return this;
    
    };

    def.$slice = def['$[]'];

    def['$slice!'] = function(index, length) {
      
      
      if (index < 0) {
        index += this.length;
      }

      if (length != null) {
        return this.splice(index, length);
      }

      if (index < 0 || index >= this.length) {
        return nil;
      }

      return this.splice(index, 1)[0];
    
    };

    def.$sort = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var copy = this.slice();

      if (block !== nil) {
        return copy.sort(block);
      }

      return copy.sort();
    
    };

    def['$sort!'] = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      if (block !== nil) {
        return this.sort(block);
      }

      return this.sort();
    
    };

    def.$take = function(count) {
      
      return this.slice(0, count);
    };

    def.$take_while = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var result = [];

      for (var i = 0, length = this.length, item, value; i < length; i++) {
        item = this[i];

        if ((value = block(item)) === __breaker) {
          return __breaker.$v;
        }

        if (value === false || value === nil) {
          return result;
        }

        result.push(item);
      }

      return result;
    
    };

    def.$to_a = function() {
      
      return this;
    };

    def.$to_ary = def.$to_a;

    def.$to_json = function() {
      var _a;
      
      var result = [];

      for (var i = 0, length = this.length; i < length; i++) {
        result.push(((_a = (this[i])).$to_json || $mm('to_json')).call(_a));
      }

      return '[' + result.join(', ') + ']';
    
    };

    def.$to_native = function() {
      var _a;
      
      var result = [], obj

      for (var i = 0, len = this.length; i < len; i++) {
        obj = this[i];

        if (obj.$to_native) {
          result.push(((_a = (obj)).$to_native || $mm('to_native')).call(_a));
        }
        else {
          result.push(obj);
        }
      }

      return result;
    
    };

    def.$to_s = def.$inspect;

    def.$uniq = function() {
      
      
      var result = [],
          seen   = {};

      for (var i = 0, length = this.length, item, hash; i < length; i++) {
        item = this[i];
        hash = item;

        if (!seen[hash]) {
          seen[hash] = true;

          result.push(item);
        }
      }

      return result;
    
    };

    def['$uniq!'] = function() {
      
      
      var original = this.length,
          seen     = {};

      for (var i = 0, length = original, item, hash; i < length; i++) {
        item = this[i];
        hash = item;

        if (!seen[hash]) {
          seen[hash] = true;
        }
        else {
          this.splice(i, 1);

          length--;
          i--;
        }
      }

      return this.length === original ? nil : this;
    
    };

    def.$unshift = function(objects) {
      objects = __slice.call(arguments, 0);
      
      for (var i = objects.length - 1; i >= 0; i--) {
        this.unshift(objects[i]);
      }

      return this;
    
    };

    def.$zip = function(others, block) {
      var block;others = __slice.call(arguments, 0);
      if (typeof(others[others.length - 1]) === 'function') { block = others.pop(); } else { block = nil; }
      
      
      var result = [], size = this.length, part, o;

      for (var i = 0; i < size; i++) {
        part = [this[i]];

        for (var j = 0, jj = others.length; j < jj; j++) {
          o = others[j][i];

          if (o == null) {
            o = nil;
          }

          part[j + 1] = o;
        }

        result[i] = part;
      }

      if (block !== nil) {
        for (var i = 0; i < size; i++) {
          block(result[i]);
        }

        return nil;
      }

      return result;
    
    };

    return nil;
  })(self, Array)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __klass = __opal.klass;
  return (function(__base, __super){
    function Hash() {};
    Hash = __klass(__base, __super, "Hash", Hash);

    var def = Hash.prototype, __scope = Hash._scope, _a, _b;
    def.proc = def.none = nil;

    ((_a = Hash).$include || $mm('include')).call(_a, ((_b = __scope.Enumerable) == null ? __opal.cm("Enumerable") : _b));

    
    __hash = Opal.hash = function() {
      var hash   = new Hash,
          args   = __slice.call(arguments),
          keys   = [],
          assocs = {};

      hash.map   = assocs;
      hash.keys  = keys;

      for (var i = 0, length = args.length, key; i < length; i++) {
        var key = args[i], obj = args[++i];

        if (assocs[key] == null) {
          keys.push(key);
        }

        assocs[key] = obj;
      }

      return hash;
    };
  

    
    __hash2 = Opal.hash2 = function(keys, map) {
      var hash = new Hash;
      hash.keys = keys;
      hash.map = map;
      return hash;
    };
  

    var __hasOwn = {}.hasOwnProperty;

    Hash._defs('$[]', function(objs) {
      objs = __slice.call(arguments, 0);
      return __hash.apply(null, objs);
    });

    Hash._defs('$allocate', function() {
      
      return __hash();
    });

    Hash._defs('$from_native', function(obj) {
      
      
      var hash = __hash(), map = hash.map, keys = hash.keys;

      for (var key in obj) {
        keys.push(key);
        map[key] = obj[key];
      }

      return hash;
    
    });

    Hash._defs('$new', function(defaults, block) {
      var BLOCK_IDX = arguments.length - 1;
      if (typeof(arguments[BLOCK_IDX]) === 'function' && arguments[BLOCK_IDX]._s !== undefined) { block = arguments[BLOCK_IDX] } else { block = nil }if (defaults === block && typeof(defaults) === 'function') { defaults = undefined; }
      
      var hash = __hash();

      if (defaults != null) {
        hash.none = defaults;
      }
      else if (block !== nil) {
        hash.proc = block;
      }

      return hash;
    
    });

    def['$=='] = function(other) {
      var _a, _b;
      
      if (this === other) {
        return true;
      }

      if (!other.map || !other.keys) {
        return false;
      }

      if (this.keys.length !== other.keys.length) {
        return false;
      }

      var map  = this.map,
          map2 = other.map;

      for (var i = 0, length = this.keys.length; i < length; i++) {
        var key = this.keys[i], obj = map[key], obj2 = map2[key];

        if ((_a = ((_b = (obj))['$=='] || $mm('==')).call(_b, obj2), (_a === nil || _a === false))) {
          return false;
        }
      }

      return true;
    
    };

    def['$[]'] = function(key) {
      var _a;
      
      var bucket = this.map[key];

      if (bucket != null) {
        return bucket;
      }

      var proc = this.proc;

      if (proc !== nil) {
        return ((_a = (proc)).$call || $mm('call')).call(_a, this, key);
      }

      return this.none;
    
    };

    def['$[]='] = function(key, value) {
      
      
      var map = this.map;

      if (!__hasOwn.call(map, key)) {
        this.keys.push(key);
      }

      map[key] = value;

      return value;
    
    };

    def.$assoc = function(object) {
      var _a;
      
      var keys = this.keys, key;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if (((_a = (key))['$=='] || $mm('==')).call(_a, object)) {
          return [key, this.map[key]];
        }
      }

      return nil;
    
    };

    def.$clear = function() {
      
      
      this.map = {};
      this.keys = [];
      return this;
    
    };

    def.$clone = function() {
      
      
      var result = __hash(),
          map    = this.map,
          map2   = result.map,
          keys2  = result.keys;

      for (var i = 0, length = this.keys.length; i < length; i++) {
        keys2.push(this.keys[i]);
        map2[this.keys[i]] = map[this.keys[i]];
      }

      return result;
    
    };

    def.$default = function(val) {
      
      return this.none;
    };

    def['$default='] = function(object) {
      
      return this.none = object;
    };

    def.$default_proc = function() {
      
      return this.proc;
    };

    def['$default_proc='] = function(proc) {
      
      return this.proc = proc;
    };

    def.$delete = function(key) {
      
      
      var map  = this.map, result = map[key];

      if (result != null) {
        delete map[key];
        this.keys.$delete(key);

        return result;
      }

      return nil;
    
    };

    def.$delete_if = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var map = this.map, keys = this.keys, value;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key];

        if ((value = block(key, obj)) === __breaker) {
          return __breaker.$v;
        }

        if (value !== false && value !== nil) {
          keys.splice(i, 1);
          delete map[key];

          length--;
          i--;
        }
      }

      return this;
    
    };

    def.$dup = def.$clone;

    def.$each = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var map = this.map, keys = this.keys;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];

        if (block(key, map[key]) === __breaker) {
          return __breaker.$v;
        }
      }

      return this;
    
    };

    def.$each_key = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var keys = this.keys;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];

        if (block(key) === __breaker) {
          return __breaker.$v;
        }
      }

      return this;
    
    };

    def.$each_pair = def.$each;

    def.$each_value = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var map = this.map, keys = this.keys;

      for (var i = 0, length = keys.length; i < length; i++) {
        if (block(map[keys[i]]) === __breaker) {
          return __breaker.$v;
        }
      }

      return this;
    
    };

    def['$empty?'] = function() {
      
      
      return this.keys.length === 0;
    
    };

    def['$eql?'] = def['$=='];

    def.$fetch = function(key, defaults, block) {
      var _a;var BLOCK_IDX = arguments.length - 1;
      if (typeof(arguments[BLOCK_IDX]) === 'function' && arguments[BLOCK_IDX]._s !== undefined) { block = arguments[BLOCK_IDX] } else { block = nil }if (defaults === block && typeof(defaults) === 'function') { defaults = undefined; }
      
      var value = this.map[key];

      if (value != null) {
        return value;
      }

      if (block !== nil) {
        var value;

        if ((value = block(key)) === __breaker) {
          return __breaker.$v;
        }

        return value;
      }

      if (defaults != null) {
        return defaults;
      }

      ((_a = this).$raise || $mm('raise')).call(_a, "key not found");
    
    };

    def.$flatten = function(level) {
      var _a;
      
      var map = this.map, keys = this.keys, result = [];

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], value = map[key];

        result.push(key);

        if (value._isArray) {
          if (level == null || level === 1) {
            result.push(value);
          }
          else {
            result = result.concat(((_a = (value)).$flatten || $mm('flatten')).call(_a, level - 1));
          }
        }
        else {
          result.push(value);
        }
      }

      return result;
    
    };

    def['$has_key?'] = function(key) {
      
      return this.map[key] != null;
    };

    def['$has_value?'] = function(value) {
      var _a;
      
      for (var assoc in this.map) {
        if (((_a = (this.map[assoc]))['$=='] || $mm('==')).call(_a, value)) {
          return true;
        }
      }

      return false;
    
    };

    def.$hash = function() {
      
      return this._id;
    };

    def['$include?'] = def['$has_key?'];

    def.$index = function(object) {
      var _a;
      
      var map = this.map, keys = this.keys;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];

        if (((_a = object)['$=='] || $mm('==')).call(_a, map[key])) {
          return key;
        }
      }

      return nil;
    
    };

    def.$indexes = function(keys) {
      keys = __slice.call(arguments, 0);
      
      var result = [], map = this.map, val;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], val = map[key];

        if (val != null) {
          result.push(val);
        }
        else {
          result.push(this.none);
        }
      }

      return result;
    
    };

    def.$indices = def.$indexes;

    def.$inspect = function() {
      var _a;
      
      var inspect = [], keys = this.keys, map = this.map;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];
        inspect.push(((_a = (key)).$inspect || $mm('inspect')).call(_a) + '=>' + ((_a = (map[key])).$inspect || $mm('inspect')).call(_a));
      }

      return '{' + inspect.join(', ') + '}';
    
    };

    def.$invert = function() {
      
      
      var result = __hash(), keys = this.keys, map = this.map,
          keys2 = result.keys, map2 = result.map;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key];

        keys2.push(obj);
        map2[obj] = key;
      }

      return result;
    
    };

    def.$keep_if = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var map = this.map, keys = this.keys, value;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key];

        if ((value = block(key, obj)) === __breaker) {
          return __breaker.$v;
        }

        if (value === false || value === nil) {
          keys.splice(i, 1);
          delete map[key];

          length--;
          i--;
        }
      }

      return this;
    
    };

    def.$key = def.$index;

    def['$key?'] = def['$has_key?'];

    def.$keys = function() {
      
      
      return this.keys.slice(0);
    
    };

    def.$length = function() {
      
      
      return this.keys.length;
    
    };

    def['$member?'] = def['$has_key?'];

    def.$merge = function(other, block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var keys = this.keys, map = this.map,
          result = __hash(), keys2 = result.keys, map2 = result.map;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];

        keys2.push(key);
        map2[key] = map[key];
      }

      var keys = other.keys, map = other.map;

      if (block === nil) {
        for (var i = 0, length = keys.length; i < length; i++) {
          var key = keys[i];

          if (map2[key] == null) {
            keys2.push(key);
          }

          map2[key] = map[key];
        }
      }
      else {
        for (var i = 0, length = keys.length; i < length; i++) {
          var key = keys[i];

          if (map2[key] == null) {
            keys2.push(key);
            map2[key] = map[key];
          }
          else {
            map2[key] = block(key, map2[key], map[key]);
          }
        }
      }

      return result;
    
    };

    def['$merge!'] = function(other, block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var keys = this.keys, map = this.map,
          keys2 = other.keys, map2 = other.map;

      if (block === nil) {
        for (var i = 0, length = keys2.length; i < length; i++) {
          var key = keys2[i];

          if (map[key] == null) {
            keys.push(key);
          }

          map[key] = map2[key];
        }
      }
      else {
        for (var i = 0, length = keys2.length; i < length; i++) {
          var key = keys2[i];

          if (map[key] == null) {
            keys.push(key);
            map[key] = map2[key];
          }
          else {
            map[key] = block(key, map[key], map2[key]);
          }
        }
      }

      return this;
    
    };

    def.$rassoc = function(object) {
      var _a;
      
      var keys = this.keys, map = this.map;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key];

        if (((_a = (obj))['$=='] || $mm('==')).call(_a, object)) {
          return [key, obj];
        }
      }

      return nil;
    
    };

    def.$reject = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var keys = this.keys, map = this.map,
          result = __hash(), map2 = result.map, keys2 = result.keys;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key], value;

        if ((value = block(key, obj)) === __breaker) {
          return __breaker.$v;
        }

        if (value === false || value === nil) {
          keys2.push(key);
          map2[key] = obj;
        }
      }

      return result;
    
    };

    def.$replace = function(other) {
      
      
      var map = this.map = {}, keys = this.keys = [];

      for (var i = 0, length = other.keys.length; i < length; i++) {
        var key = other.keys[i];
        keys.push(key);
        map[key] = other.map[key];
      }

      return this;
    
    };

    def.$select = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var keys = this.keys, map = this.map,
          result = __hash(), map2 = result.map, keys2 = result.keys;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key], value;

        if ((value = block(key, obj)) === __breaker) {
          return __breaker.$v;
        }

        if (value !== false && value !== nil) {
          keys2.push(key);
          map2[key] = obj;
        }
      }

      return result;
    
    };

    def['$select!'] = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      var map = this.map, keys = this.keys, value, result = nil;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key];

        if ((value = block(key, obj)) === __breaker) {
          return __breaker.$v;
        }

        if (value === false || value === nil) {
          keys.splice(i, 1);
          delete map[key];

          length--;
          i--;
          result = this
        }
      }

      return result;
    
    };

    def.$shift = function() {
      
      
      var keys = this.keys, map = this.map;

      if (keys.length) {
        var key = keys[0], obj = map[key];

        delete map[key];
        keys.splice(0, 1);

        return [key, obj];
      }

      return nil;
    
    };

    def.$size = def.$length;

    def.$to_a = function() {
      
      
      var keys = this.keys, map = this.map, result = [];

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];
        result.push([key, map[key]]);
      }

      return result;
    
    };

    def.$to_hash = function() {
      
      return this;
    };

    def.$to_json = function() {
      var _a;
      
      var inspect = [], keys = this.keys, map = this.map;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];
        inspect.push(((_a = (key)).$to_json || $mm('to_json')).call(_a) + ': ' + ((_a = (map[key])).$to_json || $mm('to_json')).call(_a));
      }

      return '{' + inspect.join(', ') + '}';
    
    };

    def.$to_native = function() {
      var _a;
      
      var result = {}, keys = this.keys, map = this.map, bucket, value;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key];

        if (obj.$to_native) {
          result[key] = ((_a = (obj)).$to_native || $mm('to_native')).call(_a);
        }
        else {
          result[key] = obj;
        }
      }

      return result;
    
    };

    def.$to_s = def.$inspect;

    def.$update = def['$merge!'];

    def['$value?'] = function(value) {
      var _a;
      
      var map = this.map;

      for (var assoc in map) {
        var v = map[assoc];
        if (((_a = (v))['$=='] || $mm('==')).call(_a, value)) {
          return true;
        }
      }

      return false;
    
    };

    def.$values_at = def.$indexes;

    def.$values = function() {
      
      
      var map    = this.map,
          result = [];

      for (var key in map) {
        result.push(map[key]);
      }

      return result;
    
    };

    return nil;
  })(self, null)
})(Opal);
(function(__opal) {
  var _a, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __klass = __opal.klass, __gvars = __opal.gvars;
  (function(__base, __super){
    function String() {};
    String = __klass(__base, __super, "String", String);

    var def = String.prototype, __scope = String._scope, _a, _b;

    ((_a = String).$include || $mm('include')).call(_a, ((_b = __scope.Comparable) == null ? __opal.cm("Comparable") : _b));

    def._isString = true;

    String._defs('$try_convert', function(what) {
      var _a;
      try {
        return ((_a = what).$to_str || $mm('to_str')).call(_a)
      } catch ($err) {
      if (true) {
        nil}
      else { throw $err; }
      }
    });

    String._defs('$new', function(str) {
      if (str == null) {
        str = ""
      }
      
      return new String(str)
    ;
    });

    def['$%'] = function(data) {
      var _a, _b, _c;
      if ((_a = ((_b = data)['$is_a?'] || $mm('is_a?')).call(_b, ((_c = __scope.Array) == null ? __opal.cm("Array") : _c))) !== false && _a !== nil) {
        return ((_a = this).$format || $mm('format')).apply(_a, [this].concat(data))
        } else {
        return ((_a = this).$format || $mm('format')).call(_a, this, data)
      };
    };

    def['$*'] = function(count) {
      
      
      if (count < 1) {
        return '';
      }

      var result  = '',
          pattern = this.valueOf();

      while (count > 0) {
        if (count & 1) {
          result += pattern;
        }

        count >>= 1, pattern += pattern;
      }

      return result;
    
    };

    def['$+'] = function(other) {
      
      return this.toString() + other;
    };

    def['$<=>'] = function(other) {
      
      
      if (typeof other !== 'string') {
        return nil;
      }

      return this > other ? 1 : (this < other ? -1 : 0);
    
    };

    def['$<'] = function(other) {
      
      return this < other;
    };

    def['$<='] = function(other) {
      
      return this <= other;
    };

    def['$>'] = function(other) {
      
      return this > other;
    };

    def['$>='] = function(other) {
      
      return this >= other;
    };

    def['$=='] = function(other) {
      
      return other == String(this);
    };

    def['$==='] = def['$=='];

    def['$=~'] = function(other) {
      var _a;
      
      if (typeof other === 'string') {
        ((_a = this).$raise || $mm('raise')).call(_a, "string given");
      }

      return ((_a = other)['$=~'] || $mm('=~')).call(_a, this);
    
    };

    def['$[]'] = function(index, length) {
      
      
      var size = this.length;

      if (index._isRange) {
        var exclude = index.exclude,
            length  = index.end,
            index   = index.begin;

        if (index > size) {
          return nil;
        }

        if (length < 0) {
          length += size;
        }

        if (exclude) length -= 1;
        return this.substr(index, length);
      }

      if (index < 0) {
        index += this.length;
      }

      if (length == null) {
        if (index >= this.length || index < 0) {
          return nil;
        }

        return this.substr(index, 1);
      }

      if (index > this.length || index < 0) {
        return nil;
      }

      return this.substr(index, length);
    
    };

    def.$as_json = function() {
      
      return this;
    };

    def.$capitalize = function() {
      
      return this.charAt(0).toUpperCase() + this.substr(1).toLowerCase();
    };

    def.$casecmp = function(other) {
      
      
      if (typeof other !== 'string') {
        return other;
      }

      var a = this.toLowerCase(),
          b = other.toLowerCase();

      return a > b ? 1 : (a < b ? -1 : 0);
    
    };

    def.$chars = function(__yield) {
      if (typeof(__yield) !== 'function') { __yield = nil }
      
      for (var i = 0, length = this.length; i < length; i++) {
        if (__yield(this.charAt(i)) === __breaker) return __breaker.$v
      }
    
    };

    def.$chomp = function(separator) {
      if (separator == null) {
        separator = __gvars["/"]
      }
      
      if (separator === "\n") {
        return this.replace(/(\n|\r|\r\n)$/, '');
      }
      else if (separator === "") {
        return this.replace(/(\n|\r\n)+$/, '');
      }
      return this.replace(new RegExp(separator + '$'), '');
    
    };

    def.$chop = function() {
      
      return this.substr(0, this.length - 1);
    };

    def.$chr = function() {
      
      return this.charAt(0);
    };

    def.$count = function(str) {
      
      return (this.length - this.replace(new RegExp(str,"g"), '').length) / str.length;
    };

    def.$dasherize = function() {
      
      return this.replace(/[-\s]+/g, '-')
                .replace(/([A-Z\d]+)([A-Z][a-z])/g, '$1-$2')
                .replace(/([a-z\d])([A-Z])/g, '$1-$2')
                .toLowerCase();
    };

    def.$demodulize = function() {
      
      
      var idx = this.lastIndexOf('::');

      if (idx > -1) {
        return this.substr(idx + 2);
      }
      
      return this;
    
    };

    def.$downcase = def.toLowerCase;

    def.$each_char = def.$chars;

    def.$each_line = function(separator, __yield) {
      var BLOCK_IDX = arguments.length - 1;
      if (typeof(arguments[BLOCK_IDX]) === 'function' && arguments[BLOCK_IDX]._s !== undefined) { __yield = arguments[BLOCK_IDX] } else { __yield = nil }if (separator == null || separator === __yield) {
        separator = __gvars["/"]
      }
      
      var splitted = this.split(separator);

      for (var i = 0, length = splitted.length; i < length; i++) {
        if (__yield(splitted[i] + separator) === __breaker) return __breaker.$v
      }
    
    };

    def['$empty?'] = function() {
      
      return this.length === 0;
    };

    def['$end_with?'] = function(suffixes) {
      suffixes = __slice.call(arguments, 0);
      
      for (var i = 0, length = suffixes.length; i < length; i++) {
        var suffix = suffixes[i];

        if (this.lastIndexOf(suffix) === this.length - suffix.length) {
          return true;
        }
      }

      return false;
    
    };

    def['$eql?'] = def['$=='];

    def['$equal?'] = function(val) {
      
      return this.toString() === val.toString();
    };

    def.$getbyte = def.charCodeAt;

    def.$gsub = function(pattern, replace) {
      var _a, _b, _c;
      if ((_a = ((_b = pattern)['$is_a?'] || $mm('is_a?')).call(_b, ((_c = __scope.String) == null ? __opal.cm("String") : _c))) !== false && _a !== nil) {
        pattern = (new RegExp("" + ((_a = ((_b = __scope.Regexp) == null ? __opal.cm("Regexp") : _b)).$escape || $mm('escape')).call(_a, pattern)))
      };
      
      var pattern = pattern.toString(),
          options = pattern.substr(pattern.lastIndexOf('/') + 1) + 'g',
          regexp  = pattern.substr(1, pattern.lastIndexOf('/') - 1);

      return this.$sub(new RegExp(regexp, options), replace);
    
    };

    def.$hash = def.toString;

    def.$hex = function() {
      var _a;
      return ((_a = this).$to_i || $mm('to_i')).call(_a, 16);
    };

    def['$include?'] = function(other) {
      
      return this.indexOf(other) !== -1;
    };

    def.$index = function(what, offset) {
      var _a, _b;
      
      if (!what._isString && !what._isRegexp) {
        throw new Error('type mismatch');
      }

      var result = -1;

      if (offset != null) {
        if (offset < 0) {
          offset = this.length - offset;
        }

        if (((_a = what)['$is_a?'] || $mm('is_a?')).call(_a, ((_b = __scope.Regexp) == null ? __opal.cm("Regexp") : _b))) {
          result = ((_a = ((_b = what)['$=~'] || $mm('=~')).call(_b, this.substr(offset))), _a !== false && _a !== nil ? _a : -1)
        }
        else {
          result = this.substr(offset).indexOf(substr);
        }

        if (result !== -1) {
          result += offset;
        }
      }
      else {
        if (((_a = what)['$is_a?'] || $mm('is_a?')).call(_a, ((_b = __scope.Regexp) == null ? __opal.cm("Regexp") : _b))) {
          result = ((_a = ((_b = what)['$=~'] || $mm('=~')).call(_b, this)), _a !== false && _a !== nil ? _a : -1)
        }
        else {
          result = this.indexOf(substr);
        }
      }

      return result === -1 ? nil : result;
    
    };

    def.$inspect = function() {
      
      
      var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
          meta      = {
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
          };

      escapable.lastIndex = 0;

      return escapable.test(this) ? '"' + this.replace(escapable, function(a) {
        var c = meta[a];

        return typeof c === 'string' ? c :
          '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      }) + '"' : '"' + this + '"';
  
    };

    def.$intern = function() {
      
      return this;
    };

    def.$lines = def.$each_line;

    def.$length = function() {
      
      return this.length;
    };

    def.$ljust = function(integer, padstr) {
      var _a, _b;if (padstr == null) {
        padstr = " "
      }
      return ((_a = this).$raise || $mm('raise')).call(_a, ((_b = __scope.NotImplementedError) == null ? __opal.cm("NotImplementedError") : _b));
    };

    def.$lstrip = function() {
      
      return this.replace(/^\s*/, '');
    };

    def.$match = function(pattern, pos, block) {
      var _a, _b, _c, _d;var BLOCK_IDX = arguments.length - 1;
      if (typeof(arguments[BLOCK_IDX]) === 'function' && arguments[BLOCK_IDX]._s !== undefined) { block = arguments[BLOCK_IDX] } else { block = nil }if (pos === block && typeof(pos) === 'function') { pos = undefined; }
      return ((_a = (function() { if ((_b = ((_c = pattern)['$is_a?'] || $mm('is_a?')).call(_c, ((_d = __scope.Regexp) == null ? __opal.cm("Regexp") : _d))) !== false && _b !== nil) {
        return pattern
        } else {
        return (new RegExp("" + ((_b = ((_c = __scope.Regexp) == null ? __opal.cm("Regexp") : _c)).$escape || $mm('escape')).call(_b, pattern)))
      }; return nil; }).call(this)).$match || $mm('match')).call(_a, this, pos, ((_a = block).$to_proc || $mm('to_proc')).call(_a));
    };

    def.$next = function() {
      
      
      if (this.length === 0) {
        return "";
      }

      var initial = this.substr(0, this.length - 1);
      var last    = String.fromCharCode(this.charCodeAt(this.length - 1) + 1);

      return initial + last;
    
    };

    def.$ord = function() {
      
      return this.charCodeAt(0);
    };

    def.$partition = function(str) {
      
      
      var result = this.split(str);
      var splitter = (result[0].length === this.length ? "" : str);

      return [result[0], splitter, result.slice(1).join(str.toString())];
    
    };

    def.$reverse = function() {
      
      return this.split('').reverse().join('');
    };

    def.$rstrip = function() {
      
      return this.replace(/\s*$/, '');
    };

    def.$size = def.$length;

    def.$slice = def['$[]'];

    def.$split = function(pattern, limit) {
      var _a;if (pattern == null) {
        pattern = ((_a = __gvars[";"]), _a !== false && _a !== nil ? _a : " ")
      }
      return this.split(pattern, limit);
    };

    def['$start_with?'] = function(prefixes) {
      prefixes = __slice.call(arguments, 0);
      
      for (var i = 0, length = prefixes.length; i < length; i++) {
        if (this.indexOf(prefixes[i]) === 0) {
          return true;
        }
      }

      return false;
    
    };

    def.$strip = function() {
      
      return this.replace(/^\s*/, '').replace(/\s*$/, '');
    };

    def.$sub = function(pattern, replace, block) {
      var _a, _b;var BLOCK_IDX = arguments.length - 1;
      if (typeof(arguments[BLOCK_IDX]) === 'function' && arguments[BLOCK_IDX]._s !== undefined) { block = arguments[BLOCK_IDX] } else { block = nil }if (replace === block && typeof(replace) === 'function') { replace = undefined; }
      
      if (typeof(replace) === 'string') {
        return this.replace(pattern, replace);
      }
      if (block !== nil) {
        return this.replace(pattern, function(str, a) {
          __gvars["1"] = a;
          return block(str);
        });
      }
      else if (replace !== undefined) {
        if (((_a = replace)['$is_a?'] || $mm('is_a?')).call(_a, ((_b = __scope.Hash) == null ? __opal.cm("Hash") : _b))) {
          return this.replace(pattern, function(str) {
            var value = ((_a = replace)['$[]'] || $mm('[]')).call(_a, ((_b = this).$str || $mm('str')).call(_b));

            return (value == null) ? nil : ((_a = ((_b = this).$value || $mm('value')).call(_b)).$to_s || $mm('to_s')).call(_a);
          });
        }
        else {
          replace = ((_a = ((_b = __scope.String) == null ? __opal.cm("String") : _b)).$try_convert || $mm('try_convert')).call(_a, replace);

          if (replace == null) {
            ((_a = this).$raise || $mm('raise')).call(_a, ((_b = __scope.TypeError) == null ? __opal.cm("TypeError") : _b), "can't convert " + (((_b = replace).$class || $mm('class')).call(_b)) + " into String");
          }

          return this.replace(pattern, replace);
        }
      }
      else {
        return this.replace(pattern, replace.toString());
      }
    
    };

    def.$succ = def.$next;

    def.$sum = function(n) {
      if (n == null) {
        n = 16
      }
      
      var result = 0;

      for (var i = 0, length = this.length; i < length; i++) {
        result += (this.charCodeAt(i) % ((1 << n) - 1));
      }

      return result;
    
    };

    def.$swapcase = function() {
      var _a, _b;
      
      var str = this.replace(/([a-z]+)|([A-Z]+)/g, function($0,$1,$2) {
        return $1 ? $0.toUpperCase() : $0.toLowerCase();
      });

      if (this._klass === String) {
        return str;
      }

      return ((_a = ((_b = this).$class || $mm('class')).call(_b)).$new || $mm('new')).call(_a, str);
    
    };

    def.$to_a = function() {
      
      
      if (this.length === 0) {
        return [];
      }

      return [this];
    
    };

    def.$to_f = function() {
      
      
      var result = parseFloat(this);

      return isNaN(result) ? 0 : result;
    
    };

    def.$to_i = function(base) {
      if (base == null) {
        base = 10
      }
      
      var result = parseInt(this, base);

      if (isNaN(result)) {
        return 0;
      }

      return result;
    
    };

    def.$to_json = def.$inspect;

    def.$to_proc = function() {
      
      
      var name = '$' + this;

      return function(arg) { return arg[name](); };
    
    };

    def.$to_s = def.toString;

    def.$to_str = def.$to_s;

    def.$to_sym = def.$intern;

    def.$underscore = function() {
      
      return this.replace(/[-\s]+/g, '_')
            .replace(/([A-Z\d]+)([A-Z][a-z])/g, '$1_$2')
            .replace(/([a-z\d])([A-Z])/g, '$1_$2')
            .toLowerCase();
    };

    return def.$upcase = def.toUpperCase;
  })(self, String);
  return __scope.Symbol = ((_a = __scope.String) == null ? __opal.cm("String") : _a);
})(Opal);
(function(__opal) {
  var _a, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __klass = __opal.klass;
  (function(__base, __super){
    function Numeric() {};
    Numeric = __klass(__base, __super, "Numeric", Numeric);

    var def = Numeric.prototype, __scope = Numeric._scope, _a, _b;

    ((_a = Numeric).$include || $mm('include')).call(_a, ((_b = __scope.Comparable) == null ? __opal.cm("Comparable") : _b));

    def._isNumber = true;

    def['$+'] = function(other) {
      
      return this + other;
    };

    def['$-'] = function(other) {
      
      return this - other;
    };

    def['$*'] = function(other) {
      
      return this * other;
    };

    def['$/'] = function(other) {
      
      return this / other;
    };

    def['$%'] = function(other) {
      
      return this % other;
    };

    def['$&'] = function(other) {
      
      return this & other;
    };

    def['$|'] = function(other) {
      
      return this | other;
    };

    def['$^'] = function(other) {
      
      return this ^ other;
    };

    def['$<'] = function(other) {
      
      return this < other;
    };

    def['$<='] = function(other) {
      
      return this <= other;
    };

    def['$>'] = function(other) {
      
      return this > other;
    };

    def['$>='] = function(other) {
      
      return this >= other;
    };

    def['$<<'] = function(count) {
      
      return this << count;
    };

    def['$>>'] = function(count) {
      
      return this >> count;
    };

    def['$+@'] = function() {
      
      return +this;
    };

    def['$-@'] = function() {
      
      return -this;
    };

    def['$~'] = function() {
      
      return ~this;
    };

    def['$**'] = function(other) {
      
      return Math.pow(this, other);
    };

    def['$=='] = function(other) {
      
      return this == other;
    };

    def['$<=>'] = function(other) {
      
      
      if (typeof(other) !== 'number') {
        return nil;
      }

      return this < other ? -1 : (this > other ? 1 : 0);
    
    };

    def.$abs = function() {
      
      return Math.abs(this);
    };

    def.$as_json = function() {
      
      return this;
    };

    def.$ceil = function() {
      
      return Math.ceil(this);
    };

    def.$chr = function() {
      
      return String.fromCharCode(this);
    };

    def.$downto = function(finish, block) {
      if (typeof(block) !== 'function') { block = nil }
      
      for (var i = this; i >= finish; i--) {
        if (block(i) === __breaker) {
          return __breaker.$v;
        }
      }

      return this;
    
    };

    def['$eql?'] = def['$=='];

    def['$even?'] = function() {
      
      return this % 2 === 0;
    };

    def.$floor = function() {
      
      return Math.floor(this);
    };

    def.$hash = function() {
      
      return this.toString();
    };

    def['$integer?'] = function() {
      
      return this % 1 === 0;
    };

    def.$magnitude = def.$abs;

    def.$modulo = def['$%'];

    def.$next = function() {
      
      return this + 1;
    };

    def['$nonzero?'] = function() {
      
      return this === 0 ? nil : this;
    };

    def['$odd?'] = function() {
      
      return this % 2 !== 0;
    };

    def.$ord = function() {
      
      return this;
    };

    def.$pred = function() {
      
      return this - 1;
    };

    def.$succ = def.$next;

    def.$times = function(block) {
      if (typeof(block) !== 'function') { block = nil }
      
      for (var i = 0; i < this; i++) {
        if (block(i) === __breaker) {
          return __breaker.$v;
        }
      }

      return this;
    
    };

    def.$to_f = function() {
      
      return parseFloat(this);
    };

    def.$to_i = function() {
      
      return parseInt(this);
    };

    def.$to_json = function() {
      
      return this.toString();
    };

    def.$to_s = function(base) {
      if (base == null) {
        base = 10
      }
      return this.toString();
    };

    def.$upto = function(finish, block) {
      var _a;if (typeof(block) !== 'function') { block = nil }
      if (block === nil) {
        return ((_a = this).$enum_for || $mm('enum_for')).call(_a, "upto", finish)
      };
      
      for (var i = this; i <= finish; i++) {
        if (block(i) === __breaker) {
          return __breaker.$v;
        }
      }

      return this;
    
    };

    def['$zero?'] = function() {
      
      return this == 0;
    };

    return nil;
  })(self, Number);
  return __scope.Fixnum = ((_a = __scope.Numeric) == null ? __opal.cm("Numeric") : _a);
})(Opal);
(function(__opal) {
  var _a, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __klass = __opal.klass;
  (function(__base, __super){
    function Proc() {};
    Proc = __klass(__base, __super, "Proc", Proc);

    var def = Proc.prototype, __scope = Proc._scope;

    def._isProc = true;

    def.is_lambda = true;

    Proc._defs('$new', function(block) {
      if (typeof(block) !== 'function') { block = nil }
      if (block === nil) no_block_given();
      block.is_lambda = false;
      return block;
    });

    def.$call = function(args) {
      args = __slice.call(arguments, 0);
      return this.apply(null, args);
    };

    def['$[]'] = def.$call;

    def.$to_proc = function() {
      
      return this;
    };

    def['$lambda?'] = function() {
      
      return !!this.is_lambda;
    };

    def.$arity = function() {
      
      return this.length - 1;
    };

    return nil;
  })(self, Function);
  return (function(__base, __super){
    function Method() {};
    Method = __klass(__base, __super, "Method", Method);

    var def = Method.prototype, __scope = Method._scope;

    return nil
  })(self, ((_a = __scope.Proc) == null ? __opal.cm("Proc") : _a));
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __klass = __opal.klass;
  return (function(__base, __super){
    function Range() {};
    Range = __klass(__base, __super, "Range", Range);

    var def = Range.prototype, __scope = Range._scope, _a, _b;
    def.begin = def.end = nil;

    ((_a = Range).$include || $mm('include')).call(_a, ((_b = __scope.Enumerable) == null ? __opal.cm("Enumerable") : _b));

    
    Range.prototype._isRange = true;

    Opal.range = function(beg, end, exc) {
      var range         = new Range;
          range.begin   = beg;
          range.end     = end;
          range.exclude = exc;

      return range;
    };
  

    def.$begin = function() {
      
      return this.begin
    }, nil;

    def.$end = function() {
      
      return this.end
    }, nil;

    def.$initialize = function(min, max, exclude) {
      if (exclude == null) {
        exclude = false
      }
      this.begin = min;
      this.end = max;
      return this.exclude = exclude;
    };

    def['$=='] = function(other) {
      
      
      if (!other._isRange) {
        return false;
      }

      return this.exclude === other.exclude && this.begin == other.begin && this.end == other.end;
    
    };

    def['$==='] = function(obj) {
      
      return obj >= this.begin && (this.exclude ? obj < this.end : obj <= this.end);
    };

    def['$cover?'] = function(value) {
      var _a, _b, _c, _d;
      return ((_a = ((_b = (this.begin))['$<='] || $mm('<=')).call(_b, value)) ? ((_b = value)['$<='] || $mm('<=')).call(_b, (function() { if ((_c = ((_d = this)['$exclude_end?'] || $mm('exclude_end?')).call(_d)) !== false && _c !== nil) {
        return (_c = this.end, _d = 1, typeof(_c) === 'number' ? _c - _d : _c['$-'](_d))
        } else {
        return this.end;
      }; return nil; }).call(this)) : _a);
    };

    def.$each = function(block) {
      var current = nil, _a, _b, _c, _d, _e;if (typeof(block) !== 'function') { block = nil }
      current = ((_a = this).$min || $mm('min')).call(_a);
      while ((_b = (_c = ((_d = current)['$=='] || $mm('==')).call(_d, ((_e = this).$max || $mm('max')).call(_e)), (_c === nil || _c === false))) !== false && _b !== nil){if (block(current) === __breaker) return __breaker.$v;
      current = ((_b = current).$succ || $mm('succ')).call(_b);};
      if ((_a = ((_b = this)['$exclude_end?'] || $mm('exclude_end?')).call(_b)) === false || _a === nil) {
        if (block(current) === __breaker) return __breaker.$v
      };
      return this;
    };

    def['$eql?'] = function(other) {
      var _a, _b, _c;
      if ((_a = ((_b = ((_c = __scope.Range) == null ? __opal.cm("Range") : _c))['$==='] || $mm('===')).call(_b, other)) === false || _a === nil) {
        return false
      };
      return (_a = ((_a = ((_b = ((_c = this)['$exclude_end?'] || $mm('exclude_end?')).call(_c))['$=='] || $mm('==')).call(_b, ((_c = other)['$exclude_end?'] || $mm('exclude_end?')).call(_c))) ? ((_b = (this.begin))['$eql?'] || $mm('eql?')).call(_b, ((_c = other).$begin || $mm('begin')).call(_c)) : _a), _a !== false && _a !== nil ? ((_a = (this.end))['$eql?'] || $mm('eql?')).call(_a, ((_b = other).$end || $mm('end')).call(_b)) : _a);
    };

    def['$exclude_end?'] = function() {
      
      return this.exclude;
    };

    def['$include?'] = function(val) {
      
      return obj >= this.begin && obj <= this.end;
    };

    def.$max = def.$end;

    def.$min = def.$begin;

    def['$member?'] = def['$include?'];

    def.$step = function(n) {
      var _a, _b;if (n == null) {
        n = 1
      }
      return ((_a = this).$raise || $mm('raise')).call(_a, ((_b = __scope.NotImplementedError) == null ? __opal.cm("NotImplementedError") : _b));
    };

    def.$to_s = function() {
      
      return this.begin + (this.exclude ? '...' : '..') + this.end;
    };

    return def.$inspect = def.$to_s;
  })(self, null)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __klass = __opal.klass;
  return (function(__base, __super){
    function Time() {};
    Time = __klass(__base, __super, "Time", Time);

    var def = Time.prototype, __scope = Time._scope, _a, _b;

    ((_a = Time).$include || $mm('include')).call(_a, ((_b = __scope.Comparable) == null ? __opal.cm("Comparable") : _b));

    Time._defs('$at', function(seconds, frac) {
      if (frac == null) {
        frac = 0
      }
      return new Date(seconds * 1000 + frac);
    });

    Time._defs('$new', function(year, month, day, hour, minute, second, millisecond) {
      
      
      switch (arguments.length) {
        case 1:
          return new Date(year);
        case 2:
          return new Date(year, month - 1);
        case 3:
          return new Date(year, month - 1, day);
        case 4:
          return new Date(year, month - 1, day, hour);
        case 5:
          return new Date(year, month - 1, day, hour, minute);
        case 6:
          return new Date(year, month - 1, day, hour, minute, second);
        case 7:
          return new Date(year, month - 1, day, hour, minute, second, millisecond);
        default:
          return new Date();
      }
    
    });

    Time._defs('$now', function() {
      
      return new Date();
    });

    def['$+'] = function(other) {
      var _a, _b, _c, _d;
      return ((_a = ((_b = __scope.Time) == null ? __opal.cm("Time") : _b)).$allocate || $mm('allocate')).call(_a, (_b = ((_d = this).$to_f || $mm('to_f')).call(_d), _c = ((_d = other).$to_f || $mm('to_f')).call(_d), typeof(_b) === 'number' ? _b + _c : _b['$+'](_c)));
    };

    def['$-'] = function(other) {
      var _a, _b, _c, _d;
      return ((_a = ((_b = __scope.Time) == null ? __opal.cm("Time") : _b)).$allocate || $mm('allocate')).call(_a, (_b = ((_d = this).$to_f || $mm('to_f')).call(_d), _c = ((_d = other).$to_f || $mm('to_f')).call(_d), typeof(_b) === 'number' ? _b - _c : _b['$-'](_c)));
    };

    def['$<=>'] = function(other) {
      var _a, _b;
      return ((_a = ((_b = this).$to_f || $mm('to_f')).call(_b))['$<=>'] || $mm('<=>')).call(_a, ((_b = other).$to_f || $mm('to_f')).call(_b));
    };

    def.$day = def.getDate;

    def['$eql?'] = function(other) {
      var _a, _b;
      return (_a = ((_a = other)['$is_a?'] || $mm('is_a?')).call(_a, ((_b = __scope.Time) == null ? __opal.cm("Time") : _b)), _a !== false && _a !== nil ? ((_a = ((_b = this)['$<=>'] || $mm('<=>')).call(_b, other))['$zero?'] || $mm('zero?')).call(_a) : _a);
    };

    def['$friday?'] = function() {
      
      return this.getDay() === 5;
    };

    def.$hour = def.getHours;

    def.$inspect = def.toString;

    def.$mday = def.$day;

    def.$min = def.getMinutes;

    def.$mon = function() {
      
      return this.getMonth() + 1;
    };

    def['$monday?'] = function() {
      
      return this.getDay() === 1;
    };

    def.$month = def.$mon;

    def['$saturday?'] = function() {
      
      return this.getDay() === 6;
    };

    def.$sec = def.getSeconds;

    def['$sunday?'] = function() {
      
      return this.getDay() === 0;
    };

    def['$thursday?'] = function() {
      
      return this.getDay() === 4;
    };

    def.$to_f = function() {
      
      return this.getTime() / 1000;
    };

    def.$to_i = function() {
      
      return parseInt(this.getTime() / 1000);
    };

    def.$to_s = def.$inspect;

    def['$tuesday?'] = function() {
      
      return this.getDay() === 2;
    };

    def.$wday = def.getDay;

    def['$wednesday?'] = function() {
      
      return this.getDay() === 3;
    };

    return def.$year = def.getFullYear;
  })(self, Date)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module, __hash2 = __opal.hash2;
  var json_parse = JSON.parse, __hasOwn = Object.prototype.hasOwnProperty;
  return (function(__base){
    function JSON() {};
    JSON = __module(__base, "JSON", JSON);
    var def = JSON.prototype, __scope = JSON._scope;

    JSON._defs('$parse', function(source) {
      
      return to_opal(json_parse(source));
    });

    JSON._defs('$from_object', function(js_object) {
      
      return to_opal(js_object);
    });

    
    function to_opal(value) {
      switch (typeof value) {
        case 'string':
          return value;

        case 'number':
          return value;

        case 'boolean':
          return !!value;

        case 'null':
          return nil;

        case 'object':
          if (!value) return nil;

          if (value._isArray) {
            var arr = [];

            for (var i = 0, ii = value.length; i < ii; i++) {
              arr.push(to_opal(value[i]));
            }

            return arr;
          }
          else {
            var hash = __hash2([], {}), v, map = hash.map, keys = hash.keys;

            for (var k in value) {
              if (__hasOwn.call(value, k)) {
                v = to_opal(value[k]);
                keys.push(k);
                map[k] = v;
              }
            }
          }

          return hash;
      }
    };
  
    
  })(self);
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, def = self._klass.prototype, __breaker = __opal.breaker, __slice = __opal.slice, __gvars = __opal.gvars;
  __gvars["~"] = nil;
  __gvars["/"] = "\n";
  __scope.RUBY_ENGINE = "opal";
  __scope.RUBY_PLATFORM = "opal";
  self.$to_s = function() {
    
    return "main";
  };
  return self.$include = function(mod) {
    var _a, _b;
    return ((_a = ((_b = __scope.Object) == null ? __opal.cm("Object") : _b)).$include || $mm('include')).call(_a, mod);
  };
})(Opal);
