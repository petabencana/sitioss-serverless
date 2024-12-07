;('use strict')
/**
 * CogniCity Server /floods endpoint
 * @module floodgauges/index
 **/
const floodgauges = require('./model')
const config = require('../config')
const db = require('../utils/db')
const app = require('lambda-api')()

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

// Get a list of all flood gauge reports
app.get('floodgauges', cacheResponse('1 minute'), (req, res, next) =>
    floodgauges(config, db)
        .all(req.query.admin)
        .then((data) => handleGeoResponse(data, req, res, next))
        .catch((err) => {
            console.log('🚀 ~ file: floodgauges-main.js ~ line 26 ~ err', err)
            /* istanbul ignore next */
        })
)

// Get a single flood gauge report
app.get('floodgauges/:id', cacheResponse('1 minute'), (req, res, next) =>
    floodgauges(config, db)
        .byId(req.params.id)
        .then((data) => handleGeoResponse(data, req, res, next))
        .catch((err) => {
            console.log('🚀 ~ file: index.js ~ line 39 ~ err', err)
        })
)

//----------------------------------------------------------------------------//
// Main router handler
//----------------------------------------------------------------------------//
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
