/* ===========================================================================
    Makes the requests to the RETS endpoint

    This supports Basic and Digest authentication.
    Digest authentication resources:
    - https://www.sitepoint.com/understanding-http-digest-access-authentication/
    - https://github.com/inorganik/digest-auth-request
=========================================================================== */

import * as crypto from 'crypto';
import * as url from 'url';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Sends requests with cookie support
 */
class Request {
  /**
   * The axios instance with cookie support
   */
  private axios: AxiosInstance;

  /**
   * Holds the number of requests
   */
  private count: number;

  /**
   * Class constructor
   */
  constructor() {
    const jar = new CookieJar();
    this.axios = wrapper(axios.create({ jar }));
    this.count = 0;
  }

  /**
   * Makes a request with Axios and handles the Digest authentication
   * if necessary.
   *
   * Based on https://github.com/mhoc/axios-digest-auth
   *
   * This will either return the response data (which should be XML)
   * or throw an error
   *
   * @param {string} requestUrl The URL to send the request to
   * @param {AxiosRequestConfig} config The Axios configuration
   * @returns {string}
   */
  public async request(requestUrl: string, config: AxiosRequestConfig): Promise<AxiosResponse> {
    // Reset the request count
    this.count = 0;
    return this.doRequest(requestUrl, config);
  }

  private async doRequest(requestUrl: string, config: AxiosRequestConfig) {
    if (this.count <= 1) {
      try {
        return await this.axios(requestUrl, config);
      } catch (responseError) {
        if (responseError.response === undefined
          || responseError.response.status !== 401
          || !responseError.response.headers['www-authenticate']?.includes('nonce')
          || typeof config.auth === 'undefined'
        ) {
          // The response error is not for a 401 authentication error that requires Digest authentication.
          throw responseError;
        }

        // The response includes the 'www-authenticate' header
        const authHeader = responseError.response.headers['www-authenticate'].split(',').map((v: string) => v.split('='));
        this.count += 1;
        const nonceCount = (`00000000${this.count}`).slice(-8);
        const cnonce = crypto.randomBytes(24).toString('hex');
        const realm = authHeader.find((el: any) => el[0].toLowerCase().indexOf('realm') > -1)[1].replace(/"/g, '');
        const nonce = authHeader.find((el: any) => el[0].toLowerCase().indexOf('nonce') > -1)[1].replace(/"/g, '');

        const ha1 = crypto.createHash('md5').update(`${config.auth.username}:${realm}:${config.auth.password}`).digest('hex');
        const path = url.parse(requestUrl).pathname;
        const ha2 = crypto.createHash('md5').update(`${config.method ?? 'GET'}:${path}`).digest('hex');
        const response = crypto.createHash('md5').update(`${ha1}:${nonce}:${nonceCount}:${cnonce}:auth:${ha2}`).digest('hex');
        const authorization = `Digest username="${config.auth.username}",realm="${realm}",`
          + `nonce="${nonce}",uri="${path}",qop="auth",algorithm="MD5",`
          + `response="${response}",nc="${nonceCount}",cnonce="${cnonce}"`;

        // Set up the new request configuration
        const newConfig = config;
        // Remove the Basic authentication so that the Digest authentication can be used
        if (typeof newConfig.auth !== 'undefined') {
          delete newConfig.auth;
        }
        // Set the authorization header
        if (config.headers) {
          newConfig.headers.authorization = authorization;
        } else {
          newConfig.headers = { authorization };
        }

        return this.doRequest(requestUrl, newConfig);
      }
    } else {
      throw new Error('Too many requests');
    }
  }
}

export default Request;
