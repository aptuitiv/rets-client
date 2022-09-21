# RETS client for NodeJS

- [RETS client for NodeJS](#rets-client-for-nodejs)
  - [TODO](#todo)
  - [Initialize the RETS client object](#initialize-the-rets-client-object)
    - [Settings](#settings)
  - [Logging in and logging out](#logging-in-and-logging-out)
    - [login() return data](#login-return-data)
    - [logout() return data](#logout-return-data)
  - [Getting objects](#getting-objects)
    - [Get a single object](#get-a-single-object)
      - [getObject() Parameters](#getobject-parameters)
      - [getObject() return value](#getobject-return-value)
      - [getObject() example](#getobject-example)
    - [Get multiple objects](#get-multiple-objects)
      - [getObjects() Parameters](#getobjects-parameters)
      - [ids](#ids)
      - [options](#options)
    - [getObjects() return value](#getobjects-return-value)
      - [getObjects() example](#getobjects-example)
  - [Getting images](#getting-images)
    - [Get a single image](#get-a-single-image)
      - [getImage() Parameters](#getimage-parameters)
      - [getImage() return value](#getimage-return-value)
    - [Get multiple images](#get-multiple-images)
      - [getImages() Parameters](#getimages-parameters)
      - [getImages() return value](#getimages-return-value)
      - [getImages() example](#getimages-example)
  - [Testing](#testing)

`rets-client` provides an interface to log in and retrieve data from a RETS server.

Inspired by:

- [aeq/rets-client](https://github.com/aeq/rets-client)
- [martianboy/rets-client](https://github.com/martianboy/rets-client)
- [zacronos/rets-client](https://github.com/zacronos/rets-client)

Spec is based on <https://www.nar.realtor/retsorg.nsf/retsproto1.7d6.pdf> and <https://www.reso.org/rets-specifications/>.

## TODO

- get metadata
- search

## Initialize the RETS client object

The Client constructor takes the login URL and a settings object.

`new Client(loginUrl: string, options: object)`

### Settings

| Setting | Required | Description |
|---|---|---|
| headers | No | An object of custom headers to use in the RETS requests. |
| password | Yes* | The RETS password. *Required if `userAgentPassword` is not used. |
| product | Yes | The name of the software product that is interfacing with the RETS server. This is used to create the `User-Agent` header. |
| productVersion | No | The product version for the software product that is interfacing with the RETS server. This is used to create the `User-Agent` header. |
| retsVersion | Yes | The version of RETS to use. |
| username | Yes* | The RETS username.  *Required if `userAgentPassword` is not used. |
| userAgentPassword | No | The password value to use if the RETS server requires user agent authentication. |

```javascript
import Client from '@aptuitiv/rets-client';

const clientSettings = {
    username: 'myUserName',
    password: 'myPassword',
    headers: {
        'Custom-Header': 'headerValue'
    },
    product: 'YourProductName',
    retsVersion: 'RETS/1.7.2',
};

const client = new Client('https://retsdomain.com/path/Login', clientSettings);
```

## Logging in and logging out

`.login(): Promise<boolean>`

`.logout(): Promise<boolean>`

```javascript
client.login()
    .then(() => {
        // Do something here.

        // Log out
        client.logout()
            .catch((error) => {
                console.error('Error logging out: ', error);
            })
    })
    .catch((error) => {
        console.error('Error logging in: ', error);
    });
```

Alternately, you could use `await`.

```javascript
try {
    await client.login();
    // Do something here

    // Log out
    await client.logout();
} catch (error) {
    console.error(error);
}
```

### login() return data

The `login` method will return a Promise. The resolved value is `true`.

### logout() return data

The `logout` method will return a Promise. The resolved value is `true`.

## Getting objects

When getting objects you have the choice to get one object, multiple objects, or all of the objects for a resource.

### Get a single object

`.getObject(resourceType: string, type: string, resourceId: string|number, objectId: string|number): Promise<object>`

This will retrieve and return a single object.

Where [getObjects](#get-multiple-objects) returns an array of objects, this will return a single object. Even if multiple objects are retrieved, only the first object is returned.

#### getObject() Parameters

| Name | Type | Description |
|---|---|---|
| resourceType | string | The resource type. For example, "Property" |
| type | string | The object type. Example: "Photo" or "Thumbnail" |
| resourceId | string or number | The ids of the objects to retrieve combined with the resource id. |
| objectId | string or number | The identifier for the object. |

#### getObject() return value

The `getObject` method will return a promise. The resolved value is an object containing the retrieved object.

```javascript
{
    contentType: string,
    data: Buffer or string,
    headers: object
}
```

| Name | Type | Description |
|---|---|---|
| contentType | string | The value of the `Content-Type` header. |
| data | Buffer or object | If the object is a media type like an image then the value is a Buffer. If the returned object is XML then this will be a JSON representation of that XML. |
| headers | object | An object containing all of the headers in the response. The header names are normalized to lowercase. The key is the header name. The value is the header value. |

If the object has already been retrieved recently the RETS server may return an XML response indicating that nothing has changed since the last request.

#### getObject() example

```javascript
client.getObject('Property', 'Thumbnail', parts[3], parseInt(parts[4], 10))
    .then((objects) => {
        if (!objects.contentType.includes('xml')) {
            const writeStream = fs.createWriteStream(parts[4]);
            writeStream.write(objects.data, 'base64');
        }
        client.logout()
            .then(() => {
                console.log('LOGGED OUT');
            })
            .catch((error) => {
                console.log('error logging out');
            });
    })
    .catch((error) => {
        console.log('error getting image: ', error);
    })

```

### Get multiple objects

`.getObjects(resourceType: string, type: string, ids: string|string[]|object): Promise<object[]>`

#### getObjects() Parameters

| Name | Type | Description |
|---|---|---|
| resourceType | string | The resource type. For example, "Property" |
| type | string | The object type. Example: "Photo" or "Thumbnail" |
| ids | string, array, or object | The ids of the objects to retrieve combined with the resource id. |
| options | object | Configuration for getting objects |

#### ids

The `ids` value is a combination of the resource id and the identifier for the object to return For example, with images, it's typically the image number to return. "3" would refer to the third image. [3, 5] would refer to the third and fifth images.

The `ids` value can be set in a few different ways.

For the examples below we will use `1234567890` for the resource id and `3` for the object id. In this case it'll be the image id for the third image.

**In each case the resource id should be a string. If it's a number and it's large like most resource ids are, then it may get interpreted by Javascript as an exponent.**

- string: In this case only the single object that matches the identifier will be returned. It should be in this format: `RESOURCE_ID:OBJECT_ID`. For example `1234567890:3`.
- "*": This is a special string value that tells the RETS server to return all of the object type for the resource. It should be in this format: `RESOURCE_ID:*`. For example `'1234567890:*'`.
- array: This should be an array `RESOURCE_ID:OBJECT_ID` pairs. This will retrieve the objects that match the ids. For example: `['1234567890:1', '1234567890:2', '1234567890:3']`.
- object: This format is also for retrieving multiple objects. The key for is the resource id. The value could be a single object id, an array of object ids, or `*`. The resource id does not have to be the same value.

Below are some examples of how the `object` format could be used.

Single object id

```javascript
{
    RESOURCE_ID:OBJECT_ID
}

{
    '1234567890':3
}

{
    '1234567890':1,
    '1234567890':2,
    '1234567890':3
}
```

Array of object ids:

```javascript
{
    RESOURCE_ID:[OBJECT_ID, OBJECT_ID]
}

{
    '1234567890':[3,4,5],
    '2222244444':[1,2,3]
}
```

All objects with `*`

```javascript
{
    RESOURCE_ID:*
}

{
    '1234567890':'*'
}
```

#### options

The following values are available for the `options` parameter.

| Name | Type | Description |
|---|---|---|
| location | integer | Whether to include the location (URL) data for the object only. 0 or 1. Defaults to 0. If 1, then only the URL for the object will be returned. |
| mime | string | The mime type to accept. This is used to build out the `Accept` header. If not set then `*/*` is used. |

### getObjects() return value

The `getObjects` method will return a promise. The resolved value is an array containing the data for one or more retrieved objects.

```javascript
[
    {
        contentType: string,
        data: Buffer or string,
        headers: object
    }
]
```

| Name | Type | Description |
|---|---|---|
| contentType | string | The value of the `Content-Type` header. |
| data | Buffer or object | If the object is a media type like an image then the value is a Buffer. If the returned object is XML then this will be a JSON representation of that XML. |
| headers | object | An object containing all of the headers in the response. The header names are normalized to lowercase. The key is the header name. The value is the header value. |

If the object has already been retrieved recently the RETS server may return an XML response indicating that nothing has changed since the last request.

#### getObjects() example

```javascript
import fs from 'fs';

client.getObjects('Property', 'Photo', {
    '10190712134022552561000000':[1,2,3,4,5],
    '10190602181039375284000000':'7',
    '10190808180154120205000000':8
})
    .then((objects) => {
        if (Array.isArray(objects)) {
            objects.forEach((object) => {
                if (!object.contentType.includes('xml')) {
                    console.log('write to: ', `${object.headers['object-id']}.jpg`);
                    const writeStream = fs.createWriteStream(`${object.headers['object-id']}.jpg`);
                    writeStream.write(object.data, 'base64');
                } 
            });
        }
        client.logout()
            .then(() => {
                console.log('LOGGED OUT');
            })
            .catch((error) => {
                console.log('error logging out');
            })
    })
    .catch((error) => {
        console.log('error getting image: ', error);
    })
```

## Getting images

Images are a specific type of object that you can get. There are two helper functions to make it a little easier to get images.

- `getImage`: Get a single image
- `getImages`: Get one or more images.

### Get a single image

`.getImage(resourceType: string, imageType: string, resourceId: string|number, imageNumber: string|number): Promise<object>`

If you are only going to get a single image then it is recommended to use `getImage`. This will return an object with the image data.

#### getImage() Parameters

| Name | Type | Description |
|---|---|---|
| resourceType | string | The resource type. For example, "Property" |
| imageType | string | The image type. Example: "Photo" or "Thumbnail" |
| resourceId | string or number | The ids of the objects to retrieve combined with the resource id. |
| imageNumber | string or number | The identifier for the image. |

#### getImage() return value

The `getImage` method will return a promise. The resolved value is an object containing the retrieved image.

```javascript
{
    contentType: string,
    data: Buffer or string,
    headers: object
}
```

| Name | Type | Description |
|---|---|---|
| contentType | string | The value of the `Content-Type` header. |
| data | Buffer or object | If the object is a media type like an image then the value is a Buffer. If the returned object is XML then this will be a JSON representation of that XML. |
| headers | object | An object containing all of the headers in the response. The header names are normalized to lowercase. The key is the header name. The value is the header value. |

If the image has already been retrieved recently the RETS server may return an XML response indicating that nothing has changed since the last request.

```javascript
import fs from 'fs';

client.getImage('Property', 'Photo', '2013823934923493249324', '2')
    .then((image) => {
        if (!image.contentType.includes('xml')) {
            const writeStream = fs.createWriteStream('my-image.jpg');
            writeStream.write(object.data, 'base64');
        }
    })
```

Alternately, you could use `await`.

```javascript
import fs from 'fs';

try {
    const image = await client.getImage('Property', 'Thumbnail', '2013823934923493249324', '2');
    if (!image.contentType.includes('xml')) {
        const writeStream = fs.createWriteStream('my-image.jpg');
        writeStream.write(object.data, 'base64');
    }
} catch (error) {
    console.error(error);
}
```

### Get multiple images

`.getImages(resourceType: string, imageType: string, resourceId: string|number, imageNumber: string|number|string[]|number[]): Promise<object[]>`

The `getImages` method lets you get one or more images.

#### getImages() Parameters

| Name | Type | Description |
|---|---|---|
| resourceType | string | The resource type. For example, "Property" |
| type | string | The object type. Example: "Photo" or "Thumbnail" |
| resourceId | string or number | The ids of the objects to retrieve combined with the resource id. |
| imageNumber | string, number, array | The identifiers of the images to retrieve. |

The `imageNumber` parameter could be in the following format:

- *string*: `'3'`
- *number': `3`
- *array': `['3', '4']` or `[3, 4, 5]`, or `[3, '10', 11]`
- `*` to indicate all images for the resource.

#### getImages() return value

The `getImages` method will return a promise. The resolved value is an array containing the data for one or more retrieved objects.

```javascript
[
    {
        contentType: string,
        data: Buffer or string,
        headers: object
    }
]
```

| Name | Type | Description |
|---|---|---|
| contentType | string | The value of the `Content-Type` header. |
| data | Buffer or object | If the object is a media type like an image then the value is a Buffer. If the returned object is XML then this will be a JSON representation of that XML. |
| headers | object | An object containing all of the headers in the response. The header names are normalized to lowercase. The key is the header name. The value is the header value. |

If the image has already been retrieved recently the RETS server may return an XML response indicating that nothing has changed since the last request.

#### getImages() example

```javascript
import fs from 'fs';

client.getImages('Property', 'Photo', '2013823934923493249324', [1, 2, 3, 4, 5])
    .then((images) => {
        images.forEach((image) => {
            if (!image.contentType.includes('xml')) {
                const writeStream = fs.createWriteStream(`${image.headers['object-id']}.jpg`);
                writeStream.write(image.data, 'base64');
            }
        });
    })
```

Alternately, you could use `await`.

```javascript
import fs from 'fs';

try {
    const images = await client.getImages('Property', 'Photo', '2013823934923493249324', [1, 2, 3, 4, 5]);
    images.forEach((image) => {
        if (!image.contentType.includes('xml')) {
            const writeStream = fs.createWriteStream(`${image.headers['object-id']}.jpg`);
            writeStream.write(image.data, 'base64');
        }
    });
} catch (error) {
    console.error(error);
}
```

## Testing

Tests use [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/).

The tests are located in the `test` folder. They can be run with `npm run test`.
