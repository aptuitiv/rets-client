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

// src/client/Client.ts
import * as crypto2 from "crypto";

// src/client/Request.ts
import * as crypto from "crypto";
import * as url from "url";
import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
var Request = class {
  constructor() {
    const jar = new CookieJar();
    this.axios = wrapper(axios.create({ jar }));
    this.count = 0;
  }
  request(requestUrl, config) {
    return __async(this, null, function* () {
      this.count = 0;
      try {
        const response = yield this.doRequest(requestUrl, config);
        console.log("response: ", response);
      } catch (error) {
        throw new Error(error);
      }
    });
  }
  doRequest(requestUrl, config) {
    return __async(this, null, function* () {
      var _a, _b;
      if (this.count <= 1) {
        try {
          return yield this.axios(requestUrl, config);
        } catch (responseError) {
          if (responseError.response === void 0 || responseError.response.status !== 401 || !((_a = responseError.response.headers["www-authenticate"]) == null ? void 0 : _a.includes("nonce")) || typeof config.auth === "undefined") {
            throw responseError;
          }
          const authHeader = responseError.response.headers["www-authenticate"].split(",").map((v) => v.split("="));
          this.count += 1;
          const nonceCount = `00000000${this.count}`.slice(-8);
          const cnonce = crypto.randomBytes(24).toString("hex");
          const realm = authHeader.find((el) => el[0].toLowerCase().indexOf("realm") > -1)[1].replace(/"/g, "");
          const nonce = authHeader.find((el) => el[0].toLowerCase().indexOf("nonce") > -1)[1].replace(/"/g, "");
          const ha1 = crypto.createHash("md5").update(`${config.auth.username}:${realm}:${config.auth.password}`).digest("hex");
          const path = url.parse(requestUrl).pathname;
          const ha2 = crypto.createHash("md5").update(`${(_b = config.method) != null ? _b : "GET"}:${path}`).digest("hex");
          const response = crypto.createHash("md5").update(`${ha1}:${nonce}:${nonceCount}:${cnonce}:auth:${ha2}`).digest("hex");
          const authorization = `Digest username="${config.auth.username}",realm="${realm}",nonce="${nonce}",uri="${path}",qop="auth",algorithm="MD5",response="${response}",nc="${nonceCount}",cnonce="${cnonce}"`;
          const newConfig = config;
          if (typeof newConfig.auth !== "undefined") {
            delete newConfig.auth;
          }
          if (config.headers) {
            newConfig.headers.authorization = authorization;
          } else {
            newConfig.headers = { authorization };
          }
          return this.doRequest(requestUrl, newConfig);
        }
      } else {
        throw new Error("Too many requests");
      }
    });
  }
};
var Request_default = Request;

// src/lib/types.ts
var isObject = (thing) => Object.prototype.toString.call(thing) === "[object Object]";
var isString = (thing) => typeof thing === "string";
var isStringWithValue = (thing) => isString(thing) && thing.length > 0;

// src/client/Client.ts
var Client = class {
  constructor(url2, options) {
    this.url = url2;
    this.options = {
      authMethod: "digest",
      headers: {
        "User-Agent": "RETS node-client",
        "RETS-Version": "RETS/1.7.2"
      }
    };
    if (isObject(options)) {
      const keys = Object.keys(options);
      keys.forEach((key) => {
        switch (key) {
          case "authMethod":
            if (["basic", "digest", "none"].includes(options.authMethod)) {
              this.options.authMethod = options.authMethod;
            }
            break;
          case "headers":
            this.setHeaders(options[key]);
            break;
          case "retsVersion":
            this.addHeader("RETS-Version", options.retsVersion);
            break;
          default:
        }
      });
    }
    if (isStringWithValue(options.product)) {
      let userAgent = options.product;
      if (isStringWithValue(options.productVersion)) {
        userAgent += `/${options.productVersion}`;
      }
      this.addHeader("User-Agent", userAgent);
    }
    if (isStringWithValue(options.userAgentPassword)) {
      const product = options.product || this.options.headers["User-Agent"];
      const requestId = typeof this.options.headers["RETS-Request-ID"] !== "undefined" ? this.options.headers["RETS-Request-ID"] : "";
      const sessionId = this.sessionId || "";
      const version = options.retsVersion || this.options.headers["RETS-Version"];
      const a1 = crypto2.createHash("md5").update(`${product}:${options.userAgentPassword}`).digest("hex");
      const retsUaAuth = crypto2.createHash("md5").update(`${a1}:${requestId}:${sessionId}:${version}`).digest("hex");
      this.addHeader("RETS-UA-Authorization", `Digest ${retsUaAuth}`);
    } else if (isStringWithValue(options.password) && isStringWithValue(options.username)) {
      this.options.auth = {
        password: options.password,
        username: options.username
      };
    }
  }
  setHeaders(headers) {
    if (isObject(headers)) {
      Object.keys(headers).forEach((header) => {
        if (isStringWithValue(headers[header])) {
          this.addHeader(header, headers[header]);
        }
      });
    }
  }
  addHeader(header, value) {
    this.options.headers[header] = value;
  }
  getRequestConfig(method) {
    let requestMethod = isStringWithValue(method) ? method.toUpperCase() : "GET";
    if (requestMethod !== "GET" && requestMethod !== "POST") {
      requestMethod = "GET";
    }
    const config = {
      headers: this.options.headers,
      method: requestMethod
    };
    if (typeof this.options.auth !== "undefined") {
      config.auth = this.options.auth;
    }
    return config;
  }
  login() {
    return __async(this, null, function* () {
      const request = new Request_default();
      const result = request.request(this.url, this.getRequestConfig());
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
