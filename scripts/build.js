/* ===========================================================================
    Build script for esbuild
=========================================================================== */

import { build } from 'esbuild';
import config from './config.js';

build(config)
    .catch(() => process.exit(1));