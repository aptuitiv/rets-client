/* ===========================================================================
    Options for the Client class
=========================================================================== */

// Header values
export type ClientHeaders = {
    [key: string]: string
}

type ClientAuth = {
    password: string
    username: string
}

// For the options property in the Client class
export type ClientOptions = {
    auth?: ClientAuth
    authMethod: 'digest' | 'basic' | 'none'
    headers?: ClientHeaders
}

// For the options parameter in the Client constructor
export type ClientOptionsParam = {
    authMethod?: 'digest' | 'basic' | 'none'
    headers?: ClientHeaders
    password?: string
    product?: string
    productVersion?: string
    retsVersion?: string
    username?: string
    userAgentPassword?: string
}

// URL actions to get other data from the RETS endpoint
export type Actions = {
    [key: string]: string
}

// The different supported formats for the id value when getting objects
export type ObjectIds = 
    | string
    | string[]
    | {
        [key: string|number]: string|number|string[]|number[]
    }

export type GetObjectOptions = {
    mime?: string
    location: string|number
}

export type GetObjectItem = {
    contentType: string
    data: any
    headers: {
        [key:string]: any
    }
}

export type GetObjectResponse = GetObjectItem[];
