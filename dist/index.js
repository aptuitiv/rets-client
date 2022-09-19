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
import { XMLParser as XMLParser3 } from "fast-xml-parser";

// src/client/GetObjectHelper.ts
import Dicer from "dicer";
import StreamBuffers from "stream-buffers";
import { XMLParser as XMLParser2 } from "fast-xml-parser";

// src/client/requestError.ts
import { XMLParser } from "fast-xml-parser";
var handleRequestError = (error, defaultError) => {
  let returnValue = defaultError;
  if (error.response) {
    if (typeof error.response.headers["content-type"] !== "undefined") {
      const contentType = error.response.headers["content-type"].toLowerCase();
      if (contentType.includes("text/xml")) {
        const parser = new XMLParser({
          ignoreAttributes: false,
          removeNSPrefix: true,
          transformTagName: (tagName) => tagName.toLowerCase()
        });
        const data = parser.parse(error.response.data);
        if (typeof data.rets !== "undefined" && typeof data.rets["@_ReplyText"] !== "undefined") {
          returnValue = data.rets["@_ReplyText"];
          if (typeof data.rets["@_ReplyCode"] !== "undefined") {
            returnValue += ` (code ${data.rets["@_ReplyCode"]})`;
          }
        }
      }
    }
  } else if (typeof error.message !== "undefined") {
    returnValue = error.message;
  }
  return returnValue;
};
var requestError_default = handleRequestError;

// src/client/GetObjectHelper.ts
var GetObjectHelper = {
  setUpIds: (ids) => {
    let idString = "";
    if (typeof ids === "string") {
      idString = ids;
    } else if (Array.isArray(ids)) {
      idString = ids.join(",");
    } else if (typeof ids === "object") {
      const idArray = [];
      Object.keys(ids).forEach((resourceId) => {
        let objectId = ids[resourceId];
        if (Array.isArray(objectId)) {
          objectId = objectId.join(":");
        }
        if (objectId) {
          idArray.push(`${resourceId}:${objectId}`);
        } else {
          idArray.push(resourceId);
        }
      });
      idString = idArray.join(",");
    }
    return idString;
  },
  getLocation: (options) => {
    let location = 0;
    if (typeof options === "object") {
      if (typeof options.location === "string") {
        location = parseInt(options.location, 10);
      } else if (typeof options.location === "number") {
        location = options.location;
      }
    }
    if (location !== 0 && location !== 1) {
      location = 0;
    }
    return location;
  },
  getAcceptHeader: (options) => {
    let returnValue = "*/*";
    if (typeof options === "object") {
      if (typeof options.mime === "string") {
        returnValue = options.mime;
      }
    }
    return returnValue;
  },
  processMultiPart: (response, headerContentType) => new Promise((resolve) => {
    const RE_BOUNDARY = /boundary=(?:(?:"([^"]+)")|(?:[^\s]+))/i;
    const m = RE_BOUNDARY.exec(headerContentType);
    const objects = [];
    const d = new Dicer({ boundary: m[1] || m[2] });
    d.on("part", (part) => {
      const object = {
        contentType: "unknown",
        data: "",
        headers: {}
      };
      const writableStreamBuffer = new StreamBuffers.WritableStreamBuffer({
        initialSize: 100 * 1024,
        incrementAmount: 10 * 1024
      });
      part.on("header", (header) => {
        Object.keys(header).forEach((headerKey) => {
          let headerValue = header[headerKey];
          if (Array.isArray(headerValue)) {
            if (headerValue.length === 1) {
              headerValue = headerValue.shift();
            }
          }
          if (headerKey === "content-type") {
            object.contentType = headerValue;
          }
          object.headers[headerKey] = headerValue;
        });
      });
      part.on("data", (data) => {
        writableStreamBuffer.write(data);
      });
      part.on("end", () => {
        object.data = writableStreamBuffer.getContents();
        objects.push(object);
      });
    });
    d.on("finish", () => {
      resolve(objects);
    });
    response.data.pipe(d);
  }),
  processXmlResponse: (response) => new Promise((resolve, reject) => {
    const writableStreamBuffer = new StreamBuffers.WritableStreamBuffer({
      initialSize: 10 * 1024,
      incrementAmount: 10 * 1024
    });
    response.data.pipe(writableStreamBuffer);
    response.data.on("end", () => {
      const parser = new XMLParser2({
        ignoreAttributes: false,
        transformTagName: (tagName) => tagName.toLowerCase()
      });
      const xml = writableStreamBuffer.getContentsAsString("utf-8");
      if (typeof xml === "string") {
        resolve([{
          contentType: "text/xml",
          data: parser.parse(xml),
          headers: response.headers
        }]);
      } else {
        reject(new Error("There was an error processing the XML response"));
      }
    });
  }),
  processMediaResponse: (response, headerContentType) => new Promise((resolve, reject) => {
    const writableStreamBuffer = new StreamBuffers.WritableStreamBuffer({
      initialSize: 100 * 1024,
      incrementAmount: 10 * 1024
    });
    response.data.pipe(writableStreamBuffer);
    response.data.on("error", (error) => {
      const errorMessage = requestError_default(error, "There was an unknown error while processing the object stream");
      reject(new Error(errorMessage));
    });
    response.data.on("end", () => {
      resolve([{
        contentType: headerContentType,
        data: writableStreamBuffer.getContents(),
        headers: response.headers
      }]);
    });
  })
};
var GetObjectHelper_default = GetObjectHelper;

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
      return this.doRequest(requestUrl, config);
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
  constructor(loginUrl, options) {
    const url2 = new URL(loginUrl);
    this.url = url2.origin;
    this.loginUrl = loginUrl;
    this.actions = {};
    this.options = {
      authMethod: "digest",
      headers: {
        Accept: "application/json, text/plain, application/xml, */*",
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
      return new Promise((resolve, reject) => {
        const request = new Request_default();
        try {
          request.request(this.loginUrl, this.getRequestConfig()).then((response) => {
            const parser = new XMLParser3({
              transformTagName: (tagName) => tagName.toLowerCase()
            });
            const data = parser.parse(response.data);
            const actionKeys = [
              "getmetadata",
              "getobject",
              "login",
              "logout",
              "search"
            ];
            if (typeof data.rets["rets-response"] !== "undefined") {
              const lines = data.rets["rets-response"].split("\n");
              lines.forEach((line) => {
                const [key, value] = line.split("=");
                const keyL = key.toLocaleLowerCase();
                if (actionKeys.includes(keyL)) {
                  this.actions[keyL] = value;
                }
              });
            }
            resolve(true);
          }).catch((error) => {
            const errorMessage = requestError_default(error, "There was an unknown error while logging in");
            reject(new Error(errorMessage));
          });
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  getImage(resourceType, imageType, resourceId, imageNumber) {
    return __async(this, null, function* () {
      const ids = {
        [resourceId]: imageNumber
      };
      return new Promise((resolve, reject) => {
        this.getObjects(resourceType, imageType, ids).then((response) => {
          resolve(response.shift());
        }).catch((error) => {
          reject(error);
        });
      });
    });
  }
  getImages(resourceType, imageType, resourceId, imageNumber) {
    return __async(this, null, function* () {
      const ids = {
        [resourceId]: imageNumber
      };
      return this.getObjects(resourceType, imageType, ids);
    });
  }
  getObjects(resourceType, type, ids, options) {
    return __async(this, null, function* () {
      return new Promise((resolve, reject) => {
        if (typeof this.actions.getobject !== "undefined") {
          try {
            const requestConfig = this.getRequestConfig();
            const params = {
              Resource: resourceType,
              Type: type,
              ID: GetObjectHelper_default.setUpIds(ids),
              Location: GetObjectHelper_default.getLocation(options)
            };
            if (requestConfig.method === "GET") {
              requestConfig.params = params;
            } else {
              requestConfig.data = params;
            }
            requestConfig.headers.Accept = GetObjectHelper_default.getAcceptHeader(options);
            requestConfig.responseType = "stream";
            const request = new Request_default();
            request.request(this.url + this.actions.getobject, requestConfig).then((response) => __async(this, null, function* () {
              if (typeof response.headers["content-type"] !== "undefined") {
                const headerContentType = response.headers["content-type"];
                if (headerContentType.includes("multipart")) {
                  GetObjectHelper_default.processMultiPart(response, headerContentType).then((result) => {
                    resolve(result);
                  }).catch((error) => {
                    reject(new Error(error));
                  });
                } else if (headerContentType.includes("text/xml")) {
                  GetObjectHelper_default.processXmlResponse(response).then((result) => {
                    resolve(result);
                  }).catch((error) => {
                    reject(new Error(error));
                  });
                } else {
                  GetObjectHelper_default.processMediaResponse(response, headerContentType).then((result) => {
                    resolve(result);
                  }).catch((error) => {
                    reject(new Error(error));
                  });
                }
              }
            })).catch((error) => {
              const errorMessage = requestError_default(error, "There was an unknown error while getting the objects");
              reject(new Error(errorMessage));
            });
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error("The get object action is not defined. Make sure that you log in first."));
        }
      });
    });
  }
  logout() {
    return __async(this, null, function* () {
      return new Promise((resolve, reject) => {
        if (typeof this.actions.logout !== "undefined") {
          const request = new Request_default();
          try {
            request.request(this.url + this.actions.logout, this.getRequestConfig()).then(() => {
              resolve(true);
            }).catch((error) => {
              const errorMessage = requestError_default(error, "There was an unknown error while logging out");
              reject(new Error(errorMessage));
            });
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error("The logout action is not defined. Make sure that you log in first."));
        }
      });
    });
  }
};
var Client_default = Client;

// src/index.ts
var src_default = Client_default;
export {
  src_default as default
};
