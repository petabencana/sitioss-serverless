'use strict'
/**
 * CogniCity Server /floods endpoint
 * @module subscription/index
 **/
const subscriptions = require('./model')
const config = require('../config')
const db = require('../utils/db')
const app = require('lambda-api')()
const Cap = require('../utils/cap')
const AWS = require('aws-sdk')

AWS.config.region = config.AWS_REGION
const lambda = new AWS.Lambda()

/**
 * Methods to get  reports from database
 * @alias module:src/api/localarea/index
 * @param {Object} config Server configuration
 * @param {Object} db sequilize database instance
 */

const cap = new Cap(config) // Setup our cap formatter

app.use((req, res, next) => {
    res.cors()
    next()
})

app.get('subscriptions/count', (req, res, next) => {
    return subscriptions(config, db)
        .all(req.query?.start, req.query?.end, req.query?.city)
        .then((data) =>
            res.status(200).json({
                'Number of unique numbers': data[0].unique_user_count,
                'Number of unique cities': data[0].unique_region_count,
            })
        )
        .catch((err) => {
            console.log('🚀 ~ file: subscription-main.js:37 ~ err', err)
            return res.status(500).json({ message: 'Could not process request' })
            /* istanbul ignore next */
        })
})

app.post('subscriptions/add-subscriber', (req, res, next) => {
    if (!req?.body?.userId) {
        return res.status(400).json({ message: 'Bad Request , whatsapp number is needed' })
    }
    return subscriptions(config, db)
        .addNewSubscription(req.body)
        .then((data) => {
            const body = { card: {} }
            body.card.userId = req?.body?.userId
            body.card.notifyType = 'thank-you-subscriber'
            body.card.language = req?.body?.language
            return invokeNotify(config, body)
                .then(() => {
                    return res.status(200).json('Success')
                })
                .catch((err) => {
                    return res.status(200).json('Success')
                })
        })
        .catch((err) => {
            console.log('🚀 ~ file: subscription-main.js:37 ~ err', err)
            return res.status(500).json({ message: 'Could not process request' })
            /* istanbul ignore next */
        })
})

app.delete('subscriptions/delete-subscriber', (req, res, next) => {
    if (!req?.body?.phonenumber) {
        return res.status(400).json({ message: 'Bad Request , whatsapp number is needed' })
    }
    console.log('Coming inside delete method', req?.body?.phonenumber)
    return subscriptions(config, db)
        .deleteSubscription(req?.body?.phonenumber)
        .then((data) => res.status(200).json({ data: 'Successfully deleted' }))
        .catch((err) => {
            console.log('🚀 ~ file: subscription-main.js:37 ~ err', err)
            return res.status(500).json({ message: 'Could not process request' })
            /* istanbul ignore next */
        })
})

function invokeNotify(body) {
    return new Promise((resolve, reject) => {
        body.card.deployment = config.DEPLOYMENT
        body.card.network = 'whatsapp'
        const endpoint = `${config.NOTIFY_ENDPOINT + body.card.network}/send/`
        const eventPayload = {
            body,
            endpoint,
        }
        const params = {
            FunctionName: 'thank-you-notifier', // the lambda function we are going to invoke
            InvocationType: 'Event',
            Payload: JSON.stringify(eventPayload),
        }
        try {
            lambda.invoke(params, (err) => {
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
}

// ----------------------------------------------------------------------------//
// Main router handler
// ----------------------------------------------------------------------------//
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
