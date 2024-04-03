'use strict'
/**
 * CogniCity Server /floods endpoint
 * @module regions/index
 **/
const regions = require('./model')
const config = require('../config')
const db = require('../utils/db')
const app = require('lambda-api')()

const { cacheResponse, handleGeoResponse, handleGeoCapResponse } = require('../utils/utils')

const Cap = require('../utils/cap')

/**
 * Methods to get  reports from database
 * @alias module:src/api/cities/index
 * @param {Object} config Server configuration
 * @param {Object} db sequilize database instance
 */

const cap = new Cap(config) // Setup our cap formatter

app.use((req, res, next) => {
    res.cors()
    next()
})

app.get('regions', cacheResponse('1 day'), (req, res) => {
    return regions(config, db)
        .all()
        .then((data) => handleGeoCapResponse(data, req, res, cap))
        .catch((err) => {
            console.log('🚀 ~ file: index.js ~ line 26 ~ err', err)
        })
})

app.get('regions/bounds', cacheResponse('1 day'), (req, res) =>
    regions(config, db)
        .byID(req.query.admin)
        .then((data) => handleGeoResponse(data, req, res))
        .catch((err) => {
            console.log('🚀 ~ file: index.js ~ line 39 ~ err', err)
        })
)

// ----------------------------------------------------------------------------//
// Main router handler
// ----------------------------------------------------------------------------//
module.exports.main = async (event, context, callback) => {
    await db
        .authenticate()
        .then(() => {
            console.info('INFO - Database connected.')
        })
        .catch((err) => {
            console.error('ERROR - Unable to connect to the database:', err)
        })
    // !!!IMPORTANT: Set this flag to false, otherwise the lambda function
    // won't quit until all DB connections are closed, which is not good
    // if you want to freeze and reuse these connections
    context.callbackWaitsForEmptyEventLoop = false

    return await app.run(event, context)

    // Run the request

    // app.run(event, context, callback);
} // end router handler
