/* ===========================================================================
    Utility functions for determining a variable's type and if it can be used

    In this file, type guarding is extemely helpful to let Typescript know
    of the runtime restrictions that the JS logically places, if
    Typescript isn't automatically able to detect it.

    For instance, by returning the type `thing is object` from a function,
    Typescript will be aware the result can and should be treated as an
    object

    e.g.

    type someType = { someProperty: any } | string;

    if (isObject(someType)) { // Type guarding, ensuring type is an object
        doSomething(someType.someProperty); // No TS error, as must be object
    } else {
        someType.slice(); // No TS error, as must be string
    }

    For more info:
    https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates

=========================================================================== */

/*  eslint-disable @typescript-eslint/no-explicit-any  */

/**
 * Returns if the value is defined
 *
 * Template trick from: https://stackoverflow.com/a/62753258
 *
 * @param {mixed} thing The value to test
 * @returns {boolean}
 */
export const isDefined = <T>(thing: T | undefined): thing is T => typeof thing !== 'undefined';

/**
 * Returns if the value is an object
 *
 * @link https://attacomsian.com/blog/javascript-check-variable-is-object
 *
 * @param {mixed} thing The value to test
 * @returns {boolean}
 */
export const isObject = (thing: any): thing is object => Object.prototype.toString.call(thing) === '[object Object]';

/**
 * Returns if the value is a string
 *
 * @param {mixed} thing The value to test
 * @returns {boolean}
 */
export const isString = (thing: any): thing is string => typeof thing === 'string';

/**
  * Returns if the value is string and has a length greater than 0
  *
  * @param {mixed} thing The value to test
  * @returns {boolean}
  */
export const isStringWithValue = (thing: any): thing is string => isString(thing) && thing.length > 0;
