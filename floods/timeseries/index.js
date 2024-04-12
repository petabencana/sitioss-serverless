;('use strict')
/**
 * CogniCity Server /floods/archive archive endpoint
 * @module src/api/floods/timeseries/index
 **/
const timeseries = require('./model')
const config = require('../config')
const db = require('../utils/db')
const app = require('lambda-api')({ version: 'v1.0', base: 'v1' })
const logger = require('../utils/logger')
const { cacheResponse } = require('../utils/utils')

/**
 * Methods to get  reports from database
 * @alias module:src/api/floods/timeseries/index
 * @param {Object} config Server configuration
 * @param {Object} db sequilize database instance
 */

app.get('/', cacheResponse('1 minute'), (req, res, next) => {
    // validate the time window, if fails send 400 error
    let maxWindow =
        new Date(req.query.start).getTime() +
        config.API_REPORTS_TIME_WINDOW_MAX * 1000
    let end = new Date(req.query.end)
    if (end > maxWindow) {
        res.status(400).json({
            statusCode: 400,
            error: 'Bad Request',
            message:
                "child 'end' fails because [end is more than " +
                config.API_REPORTS_TIME_WINDOW_MAX +
                " seconds greater than 'start']",
            validation: {
                source: 'query',
                keys: ['end'],
            },
        })
        return
    }

    return timeseries(config, db)
        .count(
            req.query.start,
            req.query.end,
            req.query.admin,
            req.query.parent
        )
        .then((data) => res.status(200).json({ statusCode: 200, result: data }))
        .catch((err) => {
            logger.error('/ cacheResponse',err)
        })
})

//----------------------------------------------------------------------------//
// Main router handler
//----------------------------------------------------------------------------//
module.exports.main = async (event, context, callback) => {
    await db
        .authenticate()
        .then(() => {
            logger.info('Database connected.')
        })
        .catch((err) => {
            logger.error('Unable to connect to the database:', err)
        })
    // !!!IMPORTANT: Set this flag to false, otherwise the lambda function
    // won't quit until all DB connections are closed, which is not good
    // if you want to freeze and reuse these connections
    context.callbackWaitsForEmptyEventLoop = false

    return await app.run(event, context)

    // Run the request

    // app.run(event, context, callback);
} // end router handler
