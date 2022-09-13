/* ===========================================================================
    RETS Client object
    This is the main interface for interacting with the RETS server
=========================================================================== */

import * as crypto from 'crypto';
import { XMLParser } from 'fast-xml-parser';
import { AxiosError } from 'axios';
import {
  Actions, ClientHeaders, ClientOptions, ClientOptionsParam,
} from '../types/client';
import { RequestConfig } from '../types/request';
import Request from './Request';
import { isObject, isStringWithValue } from '../lib/types';

/**
 * Provides an interface for interacting with the RETS API
 */
class Client {
  /**
   * The base RETS URL
   */
  private url: string;

  /**
   * Holds the options for interfacing with the RETS API
   */
  private options: ClientOptions;

  /**
   * Holds the value of the RETS-Session-ID header that is returned
   * from the RETS server if the RETS-UA-Authorization header is used.
   * This should be set in the login method.
   */
  private sessionId?: string;

  /**
   * Holds the URL actions to get data from the RETS server
   */
  private actions?: Actions;

  /**
   * Class constructor
   *
   * Options
   * - headers: An object containing the exact headers to set
   * - password: The password to log in with
   * - username: The username to log in with
   * - userAgegnt: The name of the user agent to use in the request. Used to set the User-Agent header.
   * - version: The RETS version to use. It's used to set the RETS-Version header.
   *
   * @param {string} url The URL for the RETS API
   * @param {ClientClientOptionsParamOptions} options The settings/options to pass to the Client object
   */
  constructor(url: string, options: ClientOptionsParam) {
    this.url = url;
    this.actions = {};

    // Initialize the options
    this.options = {
      authMethod: 'digest',
      headers: {
        Accept: 'application/json, text/plain, application/xml, */*',
        'User-Agent': 'RETS node-client',
        'RETS-Version': 'RETS/1.7.2',
      },
    };

    // Set up the options
    if (isObject(options)) {
      const keys = Object.keys(options);
      keys.forEach((key) => {
        switch (key) {
          case 'authMethod':
            if (['basic', 'digest', 'none'].includes(options.authMethod)) {
              this.options.authMethod = options.authMethod;
            }
            break;
          case 'headers':
            this.setHeaders(options[key]);
            break;
          case 'retsVersion':
            this.addHeader('RETS-Version', options.retsVersion);
            break;
          default:
        }
      });
    }

    // Set the user agent header
    if (isStringWithValue(options.product)) {
      let userAgent = options.product;
      if (isStringWithValue(options.productVersion)) {
        userAgent += `/${options.productVersion}`;
      }
      this.addHeader('User-Agent', userAgent);
    }

    // Set up the authentication
    if (isStringWithValue(options.userAgentPassword)) {
      /**
       * The RETS User Agent Authorization digest response value is used in the RETS-UAAuthorization header
       * to authenticate the request.
       * It is computed as follows:
       * a1 ::= MD5( product : UserAgent-Password )
       * ua-digest-response::= HEX( MD5( HEX(a1):RETS-Request-ID : session-id : version-info))
       *
       * The parts are as follows:
       * product: The name of the product used in the the User-Agent header (not including the product version).
       * UserAgent-Password: The secret shared between the client and server.
       * RETS-Request-ID: This value MUST be the same as that sent with the RETS-Request-ID header.
       * If the client does not use the RETS-Request-ID header, this token is empty in the calculation.
       * session-id: If the server has sent a Set-Cookie header with a cookie name of RETS-Session-ID,
       * session-id is the value of that cookie. If the server has not sent a cookie with that name, or if the cookie
       * by that name has expired, this token is empty in the calculation.
       * version-info: The value of the RETS-Version header sent by the client with this transaction.
       * Each individual value in the concatenated string is included with whitespace removed
       * from the beginning and end of that element, that is, there is no whitespace on either side of
       * the delimiting colon characters.
       */
      const product = options.product || this.options.headers['User-Agent'];
      const requestId = typeof this.options.headers['RETS-Request-ID'] !== 'undefined' ? this.options.headers['RETS-Request-ID'] : '';
      const sessionId = this.sessionId || '';
      const version = options.retsVersion || this.options.headers['RETS-Version'];
      const a1 = crypto.createHash('md5').update(`${product}:${options.userAgentPassword}`).digest('hex');
      const retsUaAuth = crypto.createHash('md5').update(`${a1}:${requestId}:${sessionId}:${version}`).digest('hex');
      this.addHeader('RETS-UA-Authorization', `Digest ${retsUaAuth}`);
    } else if (isStringWithValue(options.password) && isStringWithValue(options.username)) {
      // Set the auth values to pass to axios for the BASIC authentication
      this.options.auth = {
        password: options.password,
        username: options.username,
      };
    }
  }

  /**
   * Set the headers for each request to the RETS server
   *
   * @param {ClientHeaders} headers An object of headers where the key is the header name and the value is the header value
   */
  public setHeaders(headers: ClientHeaders) {
    if (isObject(headers)) {
      Object.keys(headers).forEach((header) => {
        if (isStringWithValue(headers[header])) {
          this.addHeader(header, headers[header]);
        }
      });
    }
  }

  /**
   * Add a single header
   *
   * @param {string} header The header name
   * @param {string} value The header value
   */
  public addHeader(header: string, value: string) {
    this.options.headers[header] = value;
  }

  /**
   * Gets the configuration for the request
   *
   * @param {string} [method] The request method. 'GET', 'POST'
   * @returns {RequestConfig}
   */
  private getRequestConfig(method?: string): RequestConfig {
    let requestMethod = isStringWithValue(method) ? method.toUpperCase() : 'GET';
    if (requestMethod !== 'GET' && requestMethod !== 'POST') {
      requestMethod = 'GET';
    }
    const config: RequestConfig = {
      headers: this.options.headers,
      method: requestMethod,
    };
    // Set up the  basic authentication
    if (typeof this.options.auth !== 'undefined') {
      config.auth = this.options.auth;
    }
    return config;
  }

  /**
   * Handles logging into the RETS server
   * @return {Promise}
   */
  public async login(): Promise<string|boolean> {
    return new Promise((resolve, reject) => {
      const request = new Request();
      try {
        request.request(this.url, this.getRequestConfig())
          .then((response) => {
            // console.log('response: ', response);

            // Convert the XML to JSON
            const parser = new XMLParser({
              transformTagName: (tagName) => tagName.toLowerCase(),
            });
            const data = parser.parse(response.data);

            // Object keys that hold the action URLs in the response data
            const actionKeys = [
              'getmetadata',
              'getobject',
              'login',
              'logout',
              'search',
            ];

            // Get the data from the response
            if (typeof data.rets['rets-response'] !== 'undefined') {
              const lines = data.rets['rets-response'].split('\n');

              lines.forEach((line: string) => {
                const [key, value] = line.split('=');
                const keyL = key.toLocaleLowerCase();
                if (actionKeys.includes(keyL)) {
                  this.actions[keyL] = value;
                }
              });
            }
            resolve(true);
          })
          .catch((error) => {
            // There was an error while making the request. It most likely returned a 4xx or 5xx response
            // The error would be an axios error
            const errorMessage = Client.handleRequestError(error, 'There was an unknown error while logging in');
            reject(new Error(errorMessage));
          });
      } catch (error) {
        // There was an error making the request
        reject(error);
      }
    });
  }

  async logout() {
    return false;
  }

  /**
   * Handles the error response from making a request
   *
   * @param {AxiosError} error The axios error object
   * @param {string} defaultError The default error message to use if the response error message can't be determined
   * @returns {string}
   */
  private static handleRequestError(error: AxiosError, defaultError: string): string {
    let returnValue = defaultError;
    if (error.response) {
      if (typeof error.response.headers['content-type'] !== 'undefined') {
        const contentType = error.response.headers['content-type'].toLowerCase();
        if (contentType.includes('text/xml')) {
          const parser = new XMLParser({
            ignoreAttributes: false,
            removeNSPrefix: true,
            transformTagName: (tagName) => tagName.toLowerCase(),
          });
          const data = parser.parse(error.response.data as string);
          if (typeof data.rets !== 'undefined' && typeof data.rets['@_ReplyText'] !== 'undefined') {
            returnValue = data.rets['@_ReplyText'];
            if (typeof data.rets['@_ReplyCode'] !== 'undefined') {
              returnValue += ` (code ${data.rets['@_ReplyCode']})`;
            }
          }
        }
      }
    } else if (typeof error.message !== 'undefined') {
      returnValue = error.message;
    }
    return returnValue;
  }
}

export default Client;
