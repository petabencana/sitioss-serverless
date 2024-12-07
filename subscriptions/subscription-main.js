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

app.get('subscriptions/regions', (req, res, next) => {
    return subscriptions(config, db)
        .getRegionBySubscription(req.query?.id)
        .then((data) => res.status(200).json(data))
        .catch((err) => {
            console.log('🚀 ~ file: subscription-main.js:37 ~ err', err)
            return res.status(500).json({ message: 'Could not process request' })
            /* istanbul ignore next */
        })
})

app.post('subscriptions/add-subscriber', async (req, res, next) => {
    if (!req?.body?.userId) {
        await invokeSNSTopicLambda(req.body)
        return res.status(400).json({ message: 'Bad Request , whatsapp number is needed', code: 'no-whatsapp-number' })
    }
    return subscriptions(config, db)
        .addNewSubscription(req.body)
        .then(async (data) => {
            const body = { card: {} }
            body.card.userId = req?.body?.userId
            body.card.notifyType = 'thank-you-subscriber'
            body.card.language = req?.body?.language
            await invokeNotify(body)
            return res.status(200).json('Success')
        })
        .catch(async (err) => {
            console.log('Subscription Failed for', req.body, err)
            await invokeSNSTopicLambda(req.body)
            if (err.name === 'SequelizeUniqueConstraintError') {
                return res
                    .status(400)
                    .json({ message: 'Already Subscribed to the selected regions', code: 'same-region-select' })
            }
            return res.status(500).json({ message: 'Could not process request', code: 'server-error' })
            /* istanbul ignore next */
        })
})

app.delete('subscriptions/delete-subscriber', (req, res, next) => {
    if (!req?.body?.phonenumber) {
        return res.status(400).json({ message: 'Bad Request , whatsapp number is needed' })
    }
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

async function invokeSNSTopicLambda(requestBody) {
    return new Promise((resolve, reject) => {
        const params = {
            FunctionName: 'Publish_SNS_Topic', // the lambda function we are going to invoke
            InvocationType: 'Event',
            Payload: JSON.stringify({ requestBody }),
        }
        try {
            lambda.invoke(params, (err) => {
                if (err) {
                    reject(err)
                    console.log('Err', err)
                } else {
                    resolve('SNS Lambda invoked')
                    console.log('SNS Lambda invoked')
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
