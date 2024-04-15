;('use strict')
/**
 * CogniCity Server /needs endpoint
 * @module needs/index
 **/
const needs = require('./model')
const config = require('../config')
const db = require('../utils/db')
const app = require('lambda-api')()
const logger = require('../utils/logger')
const { handleGeoResponse } = require('../utils/utils')

/**
 * Methods to get  reports from database
 * @alias module:src/api/needs/index
 * @param {Object} config Server configuration
 * @param {Object} db sequilize database instance
 */

app.use((req, res, next) => {
    res.cors()
    next()
})

// Get a list of infrastructure by type for a given admin boundary
app.get('needs/', (req, res) =>
    needs(config, db)
        .all()
        .then((data) => handleGeoResponse(data, req, res))
        .catch((err) => {
            logger.error('/needs',err)
            return res.status(400).json({ error: 'Error while fetching data' })
            /* istanbul ignore next */
        })
)

app.get('needs/need', (req, res) =>
    needs(config, db)
        .getByNeedId(req.query)
        .then((data) => res.json(data))
        .catch((err) => {
            logger.error('/needs/need',err)
            return res.status(400).json({ error: 'Error while fetching data' })
            /* istanbul ignore next */
        })
)

app.patch('needs/need/:id', (req, res) =>
    needs(config, db)
        .updateNeed(req.body, req.params)
        .then((data) => res.json(data))
        .catch((err) => {
            logger.error('/needs/need/:id',err)
            return res.status(400).json({ error: 'Error while fetching data' })
            /* istanbul ignore next */
        })
)

app.post('needs/create-need', (req, res) =>
    needs(config, db)
        .addNewNeedReport(req.body)
        .then((data) => res.status(200).json({ data: data }))
        .catch((err) => {
            logger.error('/needs/create-need',err)
            return res.status(400).json({ message: 'Could not process request' })
            /* istanbul ignore next */
        })
)

app.post('needs/update-giver', (req, res) =>
    needs(config, db)
        .addGiverReport(req.body)
        .then((data) => res.status(200).json({ message: 'Giver details updated successfully' }))
        .catch((err) => {
            logger.error('/needs/update-giver',err)
            return res.status(400).json({ message: 'Could not process request' })
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
