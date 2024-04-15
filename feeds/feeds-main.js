;('use strict')
/**
 * CogniCity Server /floods endpoint
 * @module feeds/index
 **/
const feeds = require('./model')
const config = require('../config')
const db = require('../utils/db')
const app = require('lambda-api')()
const logger = require('../utils/logger')

/**
 * Methods to get  reports from database
 * @alias module:src/api/feeds/index
 * @param {Object} config Server configuration
 * @param {Object} db sequilize database instance
 */

app.use((req, res, next) => {
    res.cors()
    next()
})

app.post('feeds/qlue', (req, res) =>
    feeds(config, db)
        .addQlueReport(req.body)
        .then((data) => res.json(data))
        .catch((err) => {
            logger.error('/feeds/qlue',err)
        })
)

// Create a new detik record in the database
// TODO: What is mandatory around title / text, any rules AND/OR?
// TODO: Bulk endpoint for multiple POSTs
app.post('feeds/detik', (req, res) =>
    feeds(config, db)
        .addDetikReport(req.body)
        .then((data) => res.json(data))
        .catch((err) => {
            logger.error('/feeds/detik',err)
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
