;('use strict')
/**
 * CogniCity Server /floods endpoint
 * @module volcanos/index
 **/
const volcanos = require('./model')
const config = require('../config')
const db = require('../utils/db')
const app = require('lambda-api')()
const Cap = require('../utils/cap')
const logger = require('../utils/logger')
const { cacheResponse, handleGeoCapResponse } = require('../utils/utils')

/**
 * Methods to get  reports from database
 * @alias module:src/api/floods/index
 * @param {Object} config Server configuration
 * @param {Object} db sequilize database instance
 */

const cap = new Cap(config) // Setup our cap formatter

app.use((req, res, next) => {
    res.cors()
    next()
})

// Get a list of all volcano reports
app.get('volcanos/list-volcano', cacheResponse('1 minute'), (req, res, next) =>
    volcanos(config, db)
        .listVolcano()
        .then((data) => res.status(200).json({ statusCode: 200, result: data }))
        .catch((err) => {
            logger.error('/volcanos/list-volcano',err);
            return res
                .status(500)
                .json({ message: 'Could not process request' })
            /* istanbul ignore next */
        })
)

// Get a list of last eruption volcano reports
app.get('volcanos/last-eruption', cacheResponse('1 minute'), (req, res, next) =>
    volcanos(config, db)
        .lastEruption()
        .then((data) => handleGeoCapResponse(data, req, res, cap))
        .catch((err) => {
            logger.error('/volcanos/last-eruption',err)
            return res
                .status(500)
                .json({ message: 'Could not process request' })
            /* istanbul ignore next */
        })
)

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
