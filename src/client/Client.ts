/* ===========================================================================
    RETS Client object
    This is the main interface for interacting with the RETS server
=========================================================================== */

import * as crypto from 'crypto';
import { XMLParser } from 'fast-xml-parser';
import { AxiosRequestConfig } from 'axios';

import {
  Actions, ClientHeaders, ClientOptions, ClientOptionsParam, ObjectIds, GetObjectOptions, GetObjectItem, GetObjectResponse,
} from '../types/client';
import GetObjectHelper from './GetObjectHelper';
import handleRequestError from './requestError';
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
   * The login url
   */
  private loginUrl: string;

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
   * @param {string} loginUrl The URL for the RETS API
   * @param {ClientOptionsParam} options The settings/options to pass to the Client object
   */
  constructor(loginUrl: string, options: ClientOptionsParam) {
    // Get the root URL from the login URL
    const url = new URL(loginUrl);
    this.url = url.origin;

    // Set the login URL
    this.loginUrl = loginUrl;
    // Set the default actions value
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
  private getRequestConfig(method?: string): AxiosRequestConfig {
    let requestMethod = isStringWithValue(method) ? method.toUpperCase() : 'GET';
    if (requestMethod !== 'GET' && requestMethod !== 'POST') {
      requestMethod = 'GET';
    }
    const config: AxiosRequestConfig = {
      headers: this.options.headers,
      method: requestMethod,
    };
    // Set up the basic authentication
    if (typeof this.options.auth !== 'undefined') {
      config.auth = this.options.auth;
    }
    return config;
  }

  /**
   * Handles logging into the RETS server
   * @return {Promise}
   */
  public async login(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const request = new Request();
      try {
        request.request(this.loginUrl, this.getRequestConfig())
          .then((response) => {
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
            // There was an error while making the request. The error would be an axios error
            const errorMessage = handleRequestError(error, 'There was an unknown error while logging in');
            reject(new Error(errorMessage));
          });
      } catch (error) {
        // There was an error making the request
        reject(error);
      }
    });
  }

  /**
   * Get a single image for a resource
   *
   * @param {string} resourceType The resource type that the image is for. "Property" is the usual value.
   * @param {string} imageType The type of image to get. Could be Thumbnail, Photo, HiRes. Get metadata from the RETS server to get the valid values
   * @param {string|number} resourceId The ID of the resource that photos are assigned to. This could be the property id.
   * @param {string|number} imageNumber The image number to get. For example, 1 or 3
   * @returns {Promise}
   */
  async getImage(
    resourceType: string,
    imageType: string,
    resourceId: string | number,
    imageNumber?: string | number,
  ): Promise<GetObjectItem> {
    const ids = {
      [resourceId]: imageNumber,
    };
    return new Promise((resolve, reject) => {
      this.getObjects(resourceType, imageType, ids)
        .then((response) => {
          // The response is an array of object. This will return just one image so get the first one
          resolve(response.shift());
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /**
   * Get one or more images for a resource
   *
   * @param {string} resourceType The resource type that the image is for. "Property" is the usual value.
   * @param {string} imageType The type of image to get. Could be Thumbnail, Photo, HiRes. Get metadata from the RETS server to get the valid values
   * @param {string|number} resourceId The ID of the resource that photos are assigned to. This could be the property id.
   * @param {string|number} imageNumber The image number(s) to get. For example, 1 or 3 or a single image. Or, an array of numbers for multiple images. [1, 3]. Or "*" for all images.
   * @returns {Promise}
   */
  async getImages(
    resourceType: string,
    imageType: string,
    resourceId: string | number,
    imageNumber?: string | number | string[] | number[],
  ): Promise<GetObjectResponse> {
    const ids = {
      [resourceId]: imageNumber,
    };
    return this.getObjects(resourceType, imageType, ids);
  }

  /**
   * Gets one or more objects
   *
   * @param {string} resourceType The resource type that the object is for. "Property" is the usual value.
   * @param {string} type The type of object to get
   * @param {string|object|Array} ids The ids information
   * @param {object} options Options for the request
   * @returns {Promise}
   */
  async getObjects(resourceType: string, type: string, ids: ObjectIds, options?: GetObjectOptions): Promise<GetObjectResponse> {
    return new Promise((resolve, reject) => {
      if (typeof this.actions.getobject !== 'undefined') {
        try {
          const requestConfig = this.getRequestConfig();

          // Set the request parameters
          const params = {
            Resource: resourceType,
            Type: type,
            ID: GetObjectHelper.setUpIds(ids),
            Location: GetObjectHelper.getLocation(options),
          };
          if (requestConfig.method === 'GET') {
            // GET request
            requestConfig.params = params;
          } else {
            // POST request
            requestConfig.data = params;
          }

          // Set the request headers
          requestConfig.headers.Accept = GetObjectHelper.getAcceptHeader(options);

          requestConfig.responseType = 'stream';

          // Get the object(s)
          const request = new Request();
          request.request(this.url + this.actions.getobject, requestConfig)
            .then(async (response) => {
              if (typeof response.headers['content-type'] !== 'undefined') {
                const headerContentType = response.headers['content-type'];
                if (headerContentType.includes('multipart')) {
                  GetObjectHelper.processMultiPart(response, headerContentType)
                    .then((result) => {
                      resolve(result);
                    })
                    .catch((error) => {
                      reject(new Error(error));
                    });
                } else if (headerContentType.includes('text/xml')) {
                  // Process the response as XML
                  GetObjectHelper.processXmlResponse(response)
                    .then((result) => {
                      resolve(result);
                    })
                    .catch((error) => {
                      reject(new Error(error));
                    });
                } else {
                  // This is likely an image.
                  GetObjectHelper.processMediaResponse(response, headerContentType)
                    .then((result) => {
                      resolve(result);
                    })
                    .catch((error) => {
                      reject(new Error(error));
                    });
                }
              }
            })
            .catch((error) => {
              // There was an error while making the request. The error would be an axios error
              const errorMessage = handleRequestError(error, 'There was an unknown error while getting the objects');
              reject(new Error(errorMessage));
            });
        } catch (error) {
          // There was an error making the request
          reject(error);
        }
      } else {
        reject(new Error('The get object action is not defined. Make sure that you log in first.'));
      }
    });
  }

  /**
   * Handles logging the session out
   *
   * @returns {Promise}
   */
  async logout(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (typeof this.actions.logout !== 'undefined') {
        const request = new Request();
        try {
          request.request(this.url + this.actions.logout, this.getRequestConfig())
            .then(() => {
              resolve(true);
            })
            .catch((error) => {
              // There was an error while making the request. The error would be an axios error
              const errorMessage = handleRequestError(error, 'There was an unknown error while logging out');
              reject(new Error(errorMessage));
            });
        } catch (error) {
          // There was an error making the request
          reject(error);
        }
      } else {
        reject(new Error('The logout action is not defined. Make sure that you log in first.'));
      }
    });
  }
}

export default Client;
