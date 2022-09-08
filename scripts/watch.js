/* ===========================================================================
    Build script for esbuild that will watch files
=========================================================================== */

import { build } from 'esbuild';
import config from './config.js';
import chalk from 'chalk';
import logSymbols from 'log-symbols';

// Set up the configuration for watching
let watchConfig = {
    watch: {
        onRebuild(error, result) {
            if (error) {
                console.log(logSymbols.error + ' ' + chalk.red('watch build failed: '), error);
            } else {
                let hasErrors = false;
                let hasWarnings = false;
                
                if (Array.isArray(result.errors) && result.errors.length > 0) {
                    hasErrors = true;
                } 
                if (Array.isArray(result.warnings) && result.warnings.length > 0) {
                    hasWarnings = true;
                }
                if (!hasErrors && !hasWarnings) {
                    console.log(logSymbols.success + ' ' + chalk.green('watch build succeeded'));
                } else {
                    if (hasErrors) {
                        console.log(logSymbols.error + ' ' . chalk.red(result.errors.length + ' error' + (result.errors.length > 1 ? 's' : '')));
                        result.errors.forEach((error) => {
                            console.log(chalk.red('- ', error));
                        });
                    }
                    if (hasWarnings) {
                        console.log(logSymbols.warning + ' ' . chalk.yellow(result.warnings.length + ' warning' + (result.warnings.length > 1 ? 's' : '')));
                        result.warnings.forEach((warning) => {
                            console.log(chalk.yellow('- ', warning));
                        });
                    }
                }
            }
        },
    }
};

// Build the files
build({ ...config, ...watchConfig })
    .then(() => {
        console.log(chalk.blue('Watching....'));
    })
    .catch(() => process.exit(1));