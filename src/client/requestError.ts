/* ===========================================================================
    Helper function to process error responses from the RETS server
=========================================================================== */

import { AxiosError } from 'axios';
import { XMLParser } from 'fast-xml-parser';

/**
   * Handles the error response from making a request
   *
   * @param {AxiosError} error The axios error object
   * @param {string} defaultError The default error message to use if the response error message can't be determined
   * @returns {string}
   */
const handleRequestError = (error: AxiosError, defaultError: string): string => {
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
};

export default handleRequestError;
