/* ===========================================================================
  Test the basics of the Client object

  https://mochajs.org/
  https://www.chaijs.com/
  https://blog.logrocket.com/testing-node-js-mocha-chai/
=========================================================================== */

import { expect } from 'chai';
import {Client} from '../dist/index.js';
console.log('Client: ', Client);

describe('Client', () => {
  // Confirm that the Client value is a function (i.e. a class)
  it('Client should be a function', () => {
    expect(Client).to.be.a('function');
  });

  // Confirm that class properties are in the correct format
  context('Class properties', () => {
    const client = new Client({});
    it('Options should be an object', () => {
      expect(client.options).to.be.a('object');
    });
  });

  context('Login', () => {
    const client = new Client({});
    it('Login should pass', async () => {
      const pass = await client.login();
      expect(pass).to.be.true;
    });
  });
});
