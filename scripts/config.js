/* ===========================================================================
    Configiration for esbuild
=========================================================================== */

import eslint from 'esbuild-plugin-eslint';

const config = {
    bundle: true,
    entryPoints: ['src/index.ts'],
    format: 'esm',
    logLevel: 'info',
    outdir: 'dist',
    plugins: [
        eslint({
            fix: true
        })
    ]
};

export default config;
