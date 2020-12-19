export class PersistentReactiveDict extends ReactiveDict {
  constructor() {
    if (typeof arguments[0] === 'string' && arguments[0].length > 0) {
      super();
      this.dictName = arguments[0];
    } else {
      throw new Error("Invalid PersistentReactiveDict argument: '" + arguments[0] + "'");
    }
    if (arguments[1] === 'temporary' || arguments[1] === 'persistent' || arguments[1] === 'authenticated') {
      this.mode = arguments[1];
    } else {
      if (arguments[1] === void 0) {
        this.mode = 'persistent';
      } else {
        throw new Error("Invalid PersistentReactiveDict mode: '" + arguments[0] + "', must be one of: ['temporary', 'persistent', 'authenticated']");
      }
    }
    this.psKeys = {};
    this.psKeyList = [];
    this.psaKeys = {};
    this.psaKeyList = [];
    this.load();
    Tracker.autorun((function (_this) {
      return function () {
        if (Meteor.userId !== void 0 && !Meteor.userId) {
          return _this.clearAuth();
        }
      };
    })(this));
  }
  load() {
    var psList, psaList;
    psList = amplify.store("__" + this.dictName + "_PSKEYS__");
    if (typeof psList === 'object' && psList.length !== void 0) {
      _.each(psList, (function (_this) {
        return function (key, i) {
          var val;
          if (!_.has(_this.keys, key)) {
            val = _this.get(key);
            return _this.set(key, val, true, false);
          }
        };
      })(this));
    }
    psaList = amplify.store("__" + this.dictName + "_PSAKEYS__");
    if (typeof psaList === 'object' && psaList.length !== void 0) {
      return _.each(psaList, (function (_this) {
        return function (key, i) {
          var val;
          if (!_.has(_this.keys, key)) {
            val = _this.get(key);
            return _this.setAuth(key, val, true, false);
          }
        };
      })(this));
    }
  }
  store(type, key, value) {
    this.psKeyList = amplify.store("__" + this.dictName + "_PSKEYS__") || [];
    this.psaKeyList = amplify.store("__" + this.dictName + "_PSAKEYS__") || [];
    if (type === 'get') {
      return amplify.store("__" + this.dictName + "_" + key + "__");
    } else {
      this.psKeyList = _.without(this.psKeyList, key);
      this.psaKeyList = _.without(this.psaKeyList, key);
      delete this.psKeys[key];
      delete this.psaKeys[key];
      if (value === void 0 || value === null || type === 'temporary') {
        value = null;
      } else if (type === 'persistent') {
        this.psKeys[key] = EJSON.stringify(value);
        this.psKeyList = _.union(this.psKeyList, [key]);
      } else if (type === 'authenticated') {
        this.psaKeys[key] = EJSON.stringify(value);
        this.psaKeyList = _.union(this.psaKeyList, [key]);
      }
      amplify.store("__" + this.dictName + "_PSKEYS__", this.psKeyList);
      amplify.store("__" + this.dictName + "_PSAKEYS__", this.psaKeyList);
      amplify.store("__" + this.dictName + "_" + key + "__", value);
    }
  }
  get(key) {
    var psVal, val;
    val = super.get.call(this, key);
    psVal = this.store('get', key);
    if (psVal === void 0) {
      return val;
    }
    return psVal;
  }
  set(key, value, persist, auth) {
    var type;
    super.set.call(this, key, value);
    type = 'temporary';
    if (persist || persist === void 0 && (this.mode === 'persistent' || this.mode === 'authenticated')) {
      if (auth || persist === void 0 && auth === void 0 && this.mode === 'authenticated') {
        type = 'authenticated';
      } else {
        type = 'persistent';
      }
    }
    return this.store(type, key, value);
  }
  setTemporary(key, value) {
    return this.setTemp(key, value);
  }
  setTemp(key, value) {
    return this.set(key, value, false, false);
  }
  setPersist(key, value) {
    return this.setPersist(key, value);
  }
  setPersistent(key, value) {
    return this.set(key, value, true, false);
  }
  setAuthenticated(key, value) {
    return this.setAuth(key, value);
  }
  setAuth(key, value) {
    return this.set(key, value, true, true);
  }
  makeTemporary(key) {
    return this.makeTemp(key);
  }
  makeTemp(key) {
    return this.store('temporary', key);
  }
  makePersistent(key) {
    return this.makePersist(key);
  }
  makePersist(key) {
    var val;
    val = this.get(key);
    return this.store('persistent', key, val);
  }
  makeAuthenticated(key) {
    return this.makeAuth(key);
  }
  makeAuth(key) {
    var val;
    val = this.get(key);
    return this.store('authenticated', key, val);
  }
  clear(key, list) {
    var k;
    if (key === void 0) {
      if (list === void 0) {
        list = this.keys;
      }
      for (k in list) {
        this.set(k, void 0, false, false);
      }
    } else {
      this.set(key, void 0, false, false);
    }
  }
  clearTemporary() {
    return this.clearTemp();
  }
  clearTemp() {
    return this.clear(void 0, _.keys(_.omit(this.keys, this.psKeys, this.psaKeys)));
  }
  clearPersistent() {
    return this.clearPersist();
  }
  clearPersist() {
    return this.clear(void 0, this.psKeys);
  }
  clearAuthenticated() {
    return this.clearAuth();
  }
  clearAuth() {
    return this.clear(void 0, this.psaKeys);
  }
  update(key, value) {
    var auth, persist;
    persist = void 0;
    auth = void 0;
    if (_.indexOf(this.psaKeyList, key) >= 0) {
      auth = true;
    }
    if (auth || _.indexOf(this.psKeyList, key) >= 0) {
      persist = true;
    }
    return this.set(key, value, persist, auth);
  }
  setDefault(key, value, persist, auth) {
    if (this.get(key) === void 0) {
      return this.set(key, value, persist, auth);
    }
  }
  setDefaultTemporary(key, value) {
    return this.setDefaultTemp(key, value);
  }
  setDefaultTemp(key, value) {
    return this.setDefault(key, value, false, false);
  }
  setDefaultPersistent(key, value) {
    return this.setDefaultPersist(key, value);
  }
  setDefaultPersist(key, value) {
    return this.setDefault(key, value, true, false);
  }
  setDefaultAuthenticated(key, value) {
    return this.setDefaultAuth(key, value);
  }
  setDefaultAuth(key, value) {
    return this.setDefault(key, value, true, true);
  }
};
