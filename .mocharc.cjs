/* ===========================================================================
    Mocha configuration
=========================================================================== */

module.exports = {
    // Run tests with Typescript or Javascript files
    extension: ['js', 'ts'],
    // Support loading Typescript files
    // https://github.com/mochajs/mocha/issues/4726#issuecomment-903213780
    loader: "ts-node/esm",
    // Require the Typescript for node package
    // https://github.com/TypeStrong/ts-node
    // https://www.technicalfeeder.com/2022/03/how-to-start-unit-testing-in-typescript-with-mocha-and-chai/
    // https://journal.artfuldev.com/unit-testing-node-applications-with-typescript-using-mocha-and-chai-384ef05f32b2
    ///require: 'ts-node/register'
}