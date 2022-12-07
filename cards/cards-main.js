;('use strict')
/**
 * CogniCity Server /cards endpoint
 * @module cards/cards-main
 **/
const cards = require('./model')
const config = require('../config')
const db = require('../utils/db')
const app = require('lambda-api')()
const AWS = require('aws-sdk')
const { handleResponse } = require('../utils/utils')

AWS.config.region = config.AWS_REGION
let lambda = new AWS.Lambda()

let s3 = new AWS.S3({
	accessKeyId: config.AWS_S3_ACCESS_KEY_ID,
	secretAccessKey: config.AWS_S3_SECRET_ACCESS_KEY,
	signatureVersion: config.AWS_S3_SIGNATURE_VERSION,
	region: config.AWS_REGION,
})
/**
 * CogniCity Server /cards endpoint
 * @param {Object} config Server configuration
 * @param {Object} db Sequileze database instance
 * @return {Object} lambda-api router object for cards route
 **/

// For enabling cors headers

app.use((req, res, next) => {
	// do something
	res.cors()
	next()
})

/**
 * create cards
 */
app.post('cards', (req, res) => {
	return cards(config, db)
		.create(req.body)
		.then((data) => (data ? res.status(200).json({ cardId: data.card_id, created: true }) : res.status(400).json({ error: 'Failed to create a card' })))
		.catch((err) => {
			res.status(400).json({ error: 'Failed to create a card' })
		})
})

// Check for the existence of a card
app.head('cards/:cardId', (req, res) => {
	return cards(config, db)
		.byCardId(req.params.cardId)
		.then((data) => (data ? res.status(200).json({ message: 'Found card' }) : res.status(404).json({ message: 'Could not find card' })))
		.catch((err) => {
			console.log('🚀 ~ file: cards-main.js ~ line 49 ~ app.head ~ err', err)
		})
})

// Get all just expired report cards
app.get('cards/expiredcards', (req, res) => {
	return cards(config, db)
		.expiredCards()
		.then((data) => handleResponse(data, req, res))
		.catch((err) => {
			console.log('🚀 ~ file: cards-main.js ~ line 66 ~ app.get ~ err', err)
			res.status(400).json({ error: 'Failed to fetch expired card' })
		})
})

// Return a card
app.get('cards/:cardId', (req, res) => {
	return cards(config, db)
		.byCardId(req.params.cardId)
		.then((data) => handleResponse(data, req, res))
		.catch((err) => {
			console.log('🚀 ~ file: cards-main.js ~ line 74 ~ api.get ~ err', err)
		})
})

// Update a card record with a report
app.put('cards/:cardId', (req, res, next) => {
	try {
		// First get the card we wish to update
		return cards(config, db)
			.byCardId(req.params.cardId)
			.then((card) => {
			  console.log("🚀 ~ file: cards-main.js ~ line 145 ~ .then ~ card", card)
				// If the card does not exist then return an error message
				if (!card) {
					return res.status(404).json({
						cardId: req.params.cardId,
						message: `No card exists with id '${req.params.cardId}'`,
					})
				} else if (card && card.received) {
					if (req.body.sub_submission && req.body.disaster_type == 'earthquake') {
						// If card already has received status and disaster is earthquake add new card for other subtype
						return cards(config, db)
							.create({
								username: card.username,
								network: card.network,
								language: card.language,
							})
							.then((data) => {
								return data
									? createReport(
											config,
											db,
											//   logger,
											{
												card_id: data.card_id,
											},
											req,
											res
											//   next
									  )
									: res.status(400).json({
											message: `Error while creating report`,
									  })
							})
							.catch((err) => {
								console.log('🚀 ~ file: cards-main.js ~ line 120 ~ .then ~ err', err)
								return res.status(400).json({
									message: `Error while creating report`,
								})
							})
					} else {
						// If card already has received status then return an error message
						return res.status(400).json({
							cardId: req.params.cardId,
							message: `Report already received for '+
              ' card '${req.params.cardId}'`,
						})
					}
				} else return createReport(config, db, card, req, res)
			})
	} catch (err) {
		console.log("🚀 ~ file: cards-main.js ~ line 137 ~ app.put ~ err", err)
		return res.status(400).json({
			message: `Error while creating report`,
			// /* istanbul ignore next */
			// logger.error(err);
			// /* istanbul ignore next */
			// next(err);
		})
	}
})

function getSignedUrlPromise(req) {
	return new Promise((resolve, reject) => {
		let s3params = {
			Bucket: config.IMAGES_BUCKET,
			Key: 'originals/' + req.params.cardId + '.' + req.headers['content-type'].split('/')[1],
			ContentType: req.query.file_type,
		}
		// Call AWS S3 library
		s3.getSignedUrl('putObject', s3params, (err, data) => {
			if (err) {
				reject(err)
			} else {
				let returnData
				returnData = {
					signedRequest: data,
					url: 'https://s3.' + config.AWS_REGION + '.amazonaws.com/' + config.IMAGES_BUCKET + '/' + s3params.Key,
				}
				resolve(returnData)
			}
		})
	})
}

// Gives an s3 signed url for the frontend to upload an image to
app.get('cards/:cardId/images', (req, res) =>
	// first, check card exists
	cards(config, db)
		.byCardId(req.params.cardId)
		.then((card) => {
			if (!card) {
				// Card was not found, return error
				return res.status(404).json({
					statusCode: 404,
					cardId: req.params.cardId,
					message: `No card exists with id '${req.params.cardId}'`,
				})
			}
			return getSignedUrlPromise(req)
				.then((data) => res.status(200).json(data))
				.catch((err) =>
					res.status(400).json({
						statusCode: 400,
						message: 'Error while uploading to s3',
					})
				)
		})
)

// Update a card report with new details including the image URL
app.patch('cards/:cardId', (req, res) => {
  console.log("Imge url" , req.body.image_url)
	// First get the card we wish to update
	try {
		return cards(config, db)
			.byCardId(req.params.cardId)
			.then((card) => {
         console.log("🚀 ~ file: cards-main.js ~ line 245 ~ app.patch ~ card", card)
					// If the card does not exist then return an error message
					if (!card) {
						return res.status(404).json({
							cardId: req.params.cardId,
							message: `No card exists with id '${req.params.cardId}'`,
						})
					}
					// We have a card
					// Verify that we can add an image to card report
					if (card.received === false || card.report.image_url !== null) {
						return res.status(400).json({
							error: 'Card report not received or image exists already',
						})
					}
					// Try and submit the report and update the card
					req.body.image_url = 'https://' + config.IMAGES_HOST + '/' + req.body.image_url + '.jpg'
					return cards(config, db)
						.updateReport(card, req.body)
						.then((data) => {
							// clearCache();
							return res.status(200).json({
								cardId: req.params.cardId,
								updated: true,
							})
						})
						.catch((err) => {
							console.log('🚀 ~ file: cards-main.js ~ line 255 ~ .then ~ err', err)
							return res.status(400).json({
								error: 'Error while processing request',
							})
							/* istanbul ignore next */
							// logger.error(err);
							/* istanbul ignore next */
							// next(err);
						})
			})
	} catch (err) {
		console.log('🚀 ~ file: cards-main.js ~ line 269 ~ app.patch ~ err', err)
	}
})

async function createReport(config, db, card, req, res) {
	{
		return cards(config, db)
			.submitReport(card, req.body)
			.then(async (data) => {
				data.card = card

				// Invokes a notifier lambda to notify the user report received
				return invokeNotify(config, data)
					.then(() => {
						return res.status(200).json({
							cardId: req.params.cardId,
							created: true,
						})
					})
					.catch(() => {
						return res.status(200).json({
							cardId: req.params.cardId,
							created: true,
						})
					})
			})
			.catch((err) => {
				console.log('🚀 ~ file: cards-main.js ~ line 176 ~ createReport ~ err', err)
				return res.status(400).json({
					message: `Error while creating report`,
				})
				// /* istanbul ignore next */
				// logger.error(err);
				// /* istanbul ignore next */
				// next(err);
			})
	}
}

function invokeNotify(config, body) {
	return new Promise((resolve, reject) => {
		body.card.userId = body.card.username
		body.card.deployment = 'ph'
		delete body.card.username
		const endpoint = config.NOTIFY_ENDPOINT + body.card.network + '/send/'
		const eventPayload = {
			body: body,
			endpoint: endpoint,
		}
		const params = {
			FunctionName: 'thank-you-notifier', // the lambda function we are going to invoke
			InvocationType: 'Event',
			Payload: JSON.stringify(eventPayload),
		}
		lambda.invoke(params, function (err, data) {
			if (err) {
				reject()
				console.log('Error while invoking lambda', err)
			} else {
				resolve()
				console.log('Lambda invoked')
			}
		})
	})
}

//----------------------------------------------------------------------------//
// Main router handler
//----------------------------------------------------------------------------//
module.exports.main = async (event, context) => {
	await db.authenticate()
	// !!!IMPORTANT: Set this flag to false, otherwise the lambda function
	// won't quit until all DB connections are closed, which is not good
	// if you want to freeze and reuse these connections
	context.callbackWaitsForEmptyEventLoop = false

	// Run the request
	return await app.run(event, context)
	// app.run(event, context, callback);
} // end router handler
