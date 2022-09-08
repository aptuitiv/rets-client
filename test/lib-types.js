/* ===========================================================================
    Test the lib/types functions
=========================================================================== */

import { expect } from 'chai';
import { isObject } from '../src/lib/types.ts';

describe('Tests', () => {
  context('isObject', () => {
    it('should be an object', () => {
      expect(isObject({})).to.be.true;
      expect(isObject({ blah: 'foo' })).to.be.true;
    });
    it('should not be an object', () => {
      expect(isObject(true)).to.be.false;
      expect(isObject(null)).to.be.false;
      expect(isObject('string')).to.be.false;
      expect(isObject(3)).to.be.false;
      expect(isObject()).to.be.false;
    });
  });
});
