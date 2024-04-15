;('use strict')
/**
 * CogniCity Server /floods endpoint
 * @module floodgauges/index
 **/
const infrastructure = require('./model')
const config = require('../config')
const db = require('../utils/db')
const app = require('lambda-api')()
const logger = require('../utils/logger')
const { cacheResponse, handleGeoResponse } = require('../utils/utils')

/**
 * Methods to get  reports from database
 * @alias module:src/api/floods/index
 * @param {Object} config Server configuration
 * @param {Object} db sequilize database instance
 */

app.use((req, res, next) => {
    res.cors()
    next()
})

// Get a list of infrastructure by type for a given admin boundary
app.get(
    'infrastructure/:type',
    cacheResponse(config.CACHE_DURATION_INFRASTRUCTURE),
    (req, res) =>
        infrastructure(config, db)
            .all(req.query.admin, req.params.type)
            .then((data) => handleGeoResponse(data, req, res))
            .catch((err) => {
                logger.error('infrastructure/:type',err);
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
