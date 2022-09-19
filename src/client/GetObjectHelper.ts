/* ===========================================================================
    Header functions for getting objects
=========================================================================== */

import { AxiosResponse } from 'axios';
import Dicer from 'dicer';
import StreamBuffers from 'stream-buffers';
import { XMLParser } from 'fast-xml-parser';

import {
  ObjectIds, GetObjectOptions, GetObjectItem, GetObjectResponse,
} from '../types/client';
import handleRequestError from './requestError';

const GetObjectHelper = {
  /**
     * Sets up the object ids as a string use in the request
     *
     * @param {string|number|object|Array} ids The object ids to get
     * @returns {string}
     */
  setUpIds: (ids: ObjectIds): string => {
    // Format the ID value
    let idString = '';
    if (typeof ids === 'string') {
      // Getting a single object based on a single id
      idString = ids;
    } else if (Array.isArray(ids)) {
      // Getting one or more objects based on their ids
      idString = ids.join(',');
    } else if (typeof ids === 'object') {
      // Getting one or more objects based on their id and object number.
      // ids is an object where the key is the resource id and the value is the values to get (i.e. the image numbers to get)
      // Example getting photos
      // ids = {
      //    111111: 3 // get photo 3 for resource id 111111
      //    222222: [1,2,3] // get photos 1, 2, and 3 for resource id 222222
      //    333333: '*' // Get all photos for resource id 333333
      //    444444: '0' // Get the 'preferred' photo for resource id 444444
      //    555555: '' // Get just the resource id object
      // }
      const idArray = [];
      Object.keys(ids).forEach((resourceId) => {
        let objectId = ids[resourceId];
        if (Array.isArray(objectId)) {
          objectId = objectId.join(':');
        }
        if (objectId) {
          idArray.push(`${resourceId}:${objectId}`);
        } else {
          idArray.push(resourceId);
        }
      });
      idString = idArray.join(',');
    }
    return idString;
  },

  /**
   * Gets the correct "Location" value for the getObjects request.
   *
   * @param {object} [options] The options for getting objects
   * @returns {Number}
   */
  getLocation: (options?: GetObjectOptions): number => {
    let location = 0;
    if (typeof options === 'object') {
      if (typeof options.location === 'string') {
        location = parseInt(options.location, 10);
      } else if (typeof options.location === 'number') {
        location = options.location;
      }
    }
    if (location !== 0 && location !== 1) {
      location = 0;
    }
    return location;
  },

  /**
   * Gets the "Accept" header value
   *
   * @param {object} [options] The options for getting objects
   * @returns {string}
   */
  getAcceptHeader: (options?: GetObjectOptions): string => {
    let returnValue = '*/*';
    if (typeof options === 'object') {
      if (typeof options.mime === 'string') {
        returnValue = options.mime;
      }
    }
    return returnValue;
  },

  /**
   * Process the multipart response when getting multiple objects
   *
   * @param {AxiosResponse} response The Axios response
   * @param {string} headerContentType The "content-type" header value
   * @returns <Promise>
   */
  processMultiPart: (response: AxiosResponse, headerContentType: string): Promise<GetObjectResponse> => new Promise((resolve) => {
    // Regex to get the multipart boundary.
    // Based on https://www.npmjs.com/package/dicer
    const RE_BOUNDARY = /boundary=(?:(?:"([^"]+)")|(?:[^\s]+))/i;
    const m = RE_BOUNDARY.exec(headerContentType);

    // The array of objects to return
    const objects: GetObjectResponse = [];

    // Set up the Dicer object to parse the multipart response
    const d = new Dicer({ boundary: m[1] || m[2] });

    // For each part, get the headers and data
    d.on('part', (part) => {
      // Set up the individual object
      const object: GetObjectItem = {
        contentType: 'unknown',
        data: '',
        headers: {},
      };
        // Write to a Buffer to collect all of the stream data into one Buffer
      const writableStreamBuffer = new StreamBuffers.WritableStreamBuffer({
        initialSize: 100 * 1024,
        incrementAmount: 10 * 1024,
      });

      // "header" called when all headers are found
      part.on('header', (header) => {
        // "header" is an object containing all of the headers
        // Each header value is an array
        Object.keys(header).forEach((headerKey) => {
          let headerValue = header[headerKey];
          if (Array.isArray(headerValue)) {
            if (headerValue.length === 1) {
              headerValue = headerValue.shift();
            }
          }
          if (headerKey === 'content-type') {
            object.contentType = headerValue;
          }
          object.headers[headerKey] = headerValue;
        });
      });

      // Add the data to to the buffer
      part.on('data', (data) => {
        writableStreamBuffer.write(data);
      });

      // Finish this object and add to the array of objects
      part.on('end', () => {
        object.data = writableStreamBuffer.getContents();
        objects.push(object);
      });
    });

    // All done parsing the multi-part
    d.on('finish', () => {
      resolve(objects);
    });
    response.data.pipe(d);
  }),

  /**
   * Process the XML response and convert it to JSON
   *
   * @param {AxiosResponse} response The Axios response
   * @returns <Promise>
   */
  processXmlResponse: (response: AxiosResponse): Promise<GetObjectResponse> => new Promise((resolve, reject) => {
    const writableStreamBuffer = new StreamBuffers.WritableStreamBuffer({
      initialSize: 10 * 1024,
      incrementAmount: 10 * 1024,
    });
    response.data.pipe(writableStreamBuffer);

    response.data.on('end', () => {
      const parser = new XMLParser({
        ignoreAttributes: false,
        transformTagName: (tagName) => tagName.toLowerCase(),
      });
      const xml = writableStreamBuffer.getContentsAsString('utf-8');
      if (typeof xml === 'string') {
        resolve([{
          contentType: 'text/xml',
          data: parser.parse(xml),
          headers: response.headers,
        }]);
      } else {
        reject(new Error('There was an error processing the XML response'));
      }
    });
  }),

  /**
   * Process the media response when getting a single object
   *
   * @param {AxiosResponse} response The Axios response
   * @param {string} headerContentType The "content-type" header value
   * @returns <Promise>
   */
  processMediaResponse: (response: AxiosResponse, headerContentType: string): Promise<GetObjectResponse> => new Promise((resolve, reject) => {
    // This is likely an image.
    // Write to a Buffer to collect all of the stream data into one Buffer
    const writableStreamBuffer = new StreamBuffers.WritableStreamBuffer({
      initialSize: 100 * 1024,
      incrementAmount: 10 * 1024,
    });
    response.data.pipe(writableStreamBuffer);

    // Handle a stream error
    response.data.on('error', (error) => {
      const errorMessage = handleRequestError(error, 'There was an unknown error while processing the object stream');
      reject(new Error(errorMessage));
    });

    // Handle when the stream is finished
    response.data.on('end', () => {
      resolve([{
        contentType: headerContentType,
        // Data is a Buffer object
        // Use "base64" when outputting.
        // data.toString('base64')
        data: writableStreamBuffer.getContents(),
        headers: response.headers,
      }]);
    });
  }),
};

export default GetObjectHelper;
