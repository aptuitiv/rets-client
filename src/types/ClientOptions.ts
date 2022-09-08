/* ===========================================================================
    Options for the Client class
=========================================================================== */

export type ClientOptionHeaders = {
    [key: string]: string
}

export type ClientOptions = {
    headers?: ClientOptionHeaders[]
    password?: string
    url: string
    username?: string
}
