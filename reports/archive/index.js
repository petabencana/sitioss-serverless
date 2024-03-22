'use strict'
/**
 * CogniCity Server /reports endpoint
 * @module reports/index
 **/
// const Sentry = require("@sentry/serverless");
// const Tracing = require("@sentry/tracing");
const archives = require('./model')
const { cacheResponse, handleGeoResponse } = require('../../utils/utils')
const app = require('lambda-api')({ version: 'v1.0', base: 'v1' })
const config = require('../../config')
const db = require('../../utils/db')
/**
 * Methods to get  reports from database
 * @alias module:src/api/reports/index
 * @param {Object} config Server configuration
 * @param {Object} db sequilize database instance
 */

app.get('archive', cacheResponse('1 minute'), (req, res) => {
    console.log('coming to archive get request')
    // validate the time window, if fails send 400 error
    const maxWindow = new Date(req.query.start).getTime() + config.API_REPORTS_TIME_WINDOW_MAX * 1000
    const end = new Date(req.query.end)
    if (end > maxWindow) {
        return res.status(400).json({
            statusCode: 400,
            error: 'Bad Request',
            message: `child 'end' fails because [end is more than ${config.API_REPORTS_TIME_WINDOW_MAX} seconds greater than 'start']`,
            validation: {
                source: 'query',
                keys: ['end'],
            },
        })
    }
    return archives(config, db)
        .all(req.query.start, req.query.end, req.query.admin, req.query.disaster, req.query.training)
        .then((data) => handleGeoResponse(data, req, res))
        .catch(() => {
            return res.status(400).json({
                statusCode: 400,
                error: 'Could not process the Request',
            })
        })
})

// ----------------------------------------------------------------------------//
// Main router handler
// ----------------------------------------------------------------------------//

const archive = async (event, context) => {
    console.log('coming to archive')
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
} // end router handler

module.exports = archive
