'use strict'
/**
 * CogniCity Server /reports endpoint
 * @module reports/timeseries/index
 **/
// const Sentry = require("@sentry/serverless");
// const Tracing = require("@sentry/tracing");
const timeseriesmodel = require('./model')
const { cacheResponse } = require('../../utils/utils')
const app = require('lambda-api')({ version: 'v1.0', base: 'v1' })
const config = require('../../config')
const db = require('../../utils/db')
/**
 * Methods to get  reports from database
 * @alias module:src/api/reports/index
 * @param {Object} config Server configuration
 * @param {Object} db sequilize database instance
 */

app.get('/', cacheResponse('1 minute'), (req, res) => {
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
    return timeseriesmodel(config, db)
        .count(req.query.start, req.query.end, req.query.admin)
        .then((data) => res.status(200).json({ statusCode: 200, result: data }))
        .catch((err) => {
            console.log('🚀 ~ file: index.js ~ line 46 ~ app.get ~ err', err)
            return res.status(400).json({
                statusCode: 400,
                result: 'Unable to process the request',
            })
            /* istanbul ignore next */
        })
})

// ----------------------------------------------------------------------------//
// Main router handler
// ----------------------------------------------------------------------------//
const timeseries = async (event, context, callback) => {
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

module.exports = timeseries
