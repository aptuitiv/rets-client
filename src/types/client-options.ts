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
