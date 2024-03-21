;('use strict')
/**
 * CogniCity Server /floods endpoint
 * @module feeds/index
 **/
const feeds = require('./model')
const config = require('../config')
const db = require('../utils/db')
const app = require('lambda-api')()

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
            console.log('🚀 ~ file: index.js ~ line 29 ~ err', err)
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
            console.log('🚀 ~ file: index.js ~ line 41 ~ err', err)
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
