/* ===========================================================================
    Configiration for esbuild
=========================================================================== */

import eslint from 'esbuild-plugin-eslint';

const config = {
    bundle: true,
    entryPoints: ['src/index.ts'],
    external: [
        'axios',
        'axios-cookiejar-support',
        'dicer',
        'fast-xml-parser',
        'stream-buffers',
        'tough-cookie'
    ],
    format: 'esm',
    logLevel: 'info',
    outdir: 'dist',
    platform: 'node',
    plugins: [
        eslint({
            fix: true
        })
    ]
};

export default config;
