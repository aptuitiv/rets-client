var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/lib/types.ts
var isObject = (thing) => Object.prototype.toString.call(thing) === "[object Object]";

// src/client/Client.ts
var Client = class {
  constructor(options) {
    if (isObject(options)) {
      this.options = options;
    }
  }
  login() {
    return __async(this, null, function* () {
      return true;
    });
  }
  logout() {
    return __async(this, null, function* () {
      return false;
    });
  }
};
var Client_default = Client;
export {
  Client_default as Client
};
