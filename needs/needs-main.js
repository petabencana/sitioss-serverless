;('use strict')
/**
 * CogniCity Server /needs endpoint
 * @module needs/index
 **/
const needs = require('./model')
const config = require('../config')
const db = require('../utils/db')
const app = require('lambda-api')()
const AWS = require('aws-sdk')

AWS.config.region = config.AWS_REGION
let lambda = new AWS.Lambda()

const { handleGeoResponse } = require('../utils/utils')

/**
 * Methods to get need reports from database
 * @alias module:src/api/needs/index
 * @param {Object} config Server configuration
 * @param {Object} db sequilize database instance
 */

app.use((req, res, next) => {
    res.cors()
    next()
})

// Get a list of all needs in geo response
app.get('needs/', (req, res) =>
    needs(config, db)
        .all()
        .then((data) => {
            // To map requested items against requested quantities
            const formattedData = data.map((entry) => {
                const items_requested = []
                entry.all_items_requested.reverse().forEach((item, index) => {
                    items_requested.push({
                        'item-name': item,
                        quantity: `${entry.all_quantities_requested[index]}`,
                        units: `${entry.all_units[index]}`,
                        description: entry.all_descriptions[index] || '',
                    })
                })
                entry.items_requested = items_requested

                // Delete the unnecessary items for the response
                delete entry.all_quantities_requested
                delete entry.all_descriptions
                delete entry.all_items_requested
                delete entry.all_units
                return entry
            })
            return handleGeoResponse(formattedData, req, res)
        })
        .catch((err) => {
            console.log('🚀 ~ file: index.js ~ line 29 ~ err', err)
            return res.status(400).json({ error: 'Error while fetching data' })
            /* istanbul ignore next */
        })
)

app.get('needs/need', (req, res) =>
    needs(config, db)
        .getByNeedId(req.query)
        .then((data) => res.json(data))
        .catch((err) => {
            console.log('🚀 ~ file: index.js ~ line 29 ~ err', err)
            return res.status(400).json({ error: 'Error while fetching data' })
            /* istanbul ignore next */
        })
)

app.patch('needs/need/:id', (req, res) =>
    needs(config, db)
        .updateNeed(req.body, req.params)
        .then((data) => res.json(data))
        .catch((err) => {
            console.log('🚀 ~ file: index.js ~ line 29 ~ err', err)
            return res.status(400).json({ error: 'Error while fetching data' })
            /* istanbul ignore next */
        })
)

app.post('needs/create-need', (req, res) =>
    needs(config, db)
        .addNewNeedReport(req.body)
        .then((data) => {
            let body = {}
            console.log('req.body', req.body)
            const userId = req.body[0]['user_id']
            const need_language = req.body[0]['need_language']
            body.userId = userId
            body.notifyType = 'need-submitted'
            body.language = need_language
            return invokeNotify(body)
                .then(() => {
                    return res.status(200).json({ message: 'Need requested' })
                })
                .catch((err) => {
                    return res.status(200).json({ message: 'Need requested' })
                })
        })
        .catch((err) => {
            console.log('🚀 ~ file: index.js ~ line 29 ~ err', err)
            return res
                .status(400)
                .json({ message: 'Could not process request' })
            /* istanbul ignore next */
        })
)

app.post('needs/update-giver', (req, res) =>
    needs(config, db)
        .addGiverReport(req.body)
        .then((data) =>
            res
                .status(200)
                .json({ message: 'Giver details updated successfully' })
        )
        .catch((err) => {
            console.log('🚀 ~ file: index.js ~ line 29 ~ err', err)
            return res
                .status(400)
                .json({ message: 'Could not process request' })
            /* istanbul ignore next */
        })
)

function invokeNotify(body) {
    try {
        return new Promise((resolve, reject) => {
            const eventPayload = {
                body: body,
            }
            const params = {
                FunctionName: 'logistics-whatsapp-bot-replies', // the lambda function we are going to invoke
                InvocationType: 'Event',
                Payload: JSON.stringify(eventPayload),
            }
            try {
                lambda.invoke(params, function (err, data) {
                    if (err) {
                        console.log('Err', err)
                        reject(err)
                    } else {
                        resolve('Lambda invoked')
                        console.log('Lambda invoked')
                    }
                })
            } catch (err) {
                console.log('error: ', err)
            }
        })
    } catch (err) {
        console.log('Error invoking lambda', err)
    }
}

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
