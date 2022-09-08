/* ===========================================================================
    RETS Client object
    This is the main interface for interacting with the RETS server
=========================================================================== */

import { ClientOptions, ClientOptionHeaders } from '../types/ClientOptions';

import { isObject } from '../lib/types';

class Client {
  options: {};

  constructor(options: ClientOptions) {
    if (isObject(options)) {
      this.options = options;
    }
  }

  async login() {
    return true;
  }

  async logout() {
    return false;
  }
}

export default Client;
