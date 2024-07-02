'use strict'
/**
 * CogniCity Server /reports endpoint
 * @module archive/index
 **/

const config = require('../config')
const db = require('../utils/db')
const app = require('lambda-api')()
const archives = require('./model')

const { handleGeoCapResponse } = require('../utils/utils')
const Cap = require('../utils/cap')
/**
 * Methods to get  reports from database
 * @alias module:src/api/reports/index
 * @param {Object} config Server configuration
 * @param {Object} db sequilize database instance
 */

const cap = new Cap(config) // Setup our cap formatter

app.use((req, res, next) => {
    // do something
    res.cors()
    next()
})

app.get('archive/reports', async (req, res) => {
    return archives(config, db)
        .all(req.query.start, req.query.end, req.query.admin, req.query.disaster, req.query.training)
        .then((data) => handleGeoCapResponse(data, req, res, cap))
        .catch((err) => {
            console.log('🚀 ~ file: index.js ~ line 46 ~ app.get ~ err', err)
            return res.status(400).json({
                statusCode: 400,
                error: 'Could not process the Request',
            })
            /* istanbul ignore next */
        })
})

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