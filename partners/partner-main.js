;('use strict')
const partners = require('./model')
const config = require('../config')
const db = require('../utils/db')
const app = require('lambda-api')()
const AWS = require('aws-sdk')
const multipart = require('aws-lambda-multipart-parser')
const logger = require('../utils/logger')
let s3 = new AWS.S3({
    accessKeyId: config.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_S3_SECRET_ACCESS_KEY,
    signatureVersion: config.AWS_S3_SIGNATURE_VERSION,
    region: config.AWS_REGION,
})

const uploadToS3 = (params) => {
    return new Promise((resolve, reject) => {
        s3.upload(params, (err, s3res) => {
            if (err) {
                logger.error('uploadToS3 err',err)
                reject(err)
            } else {
                logger.info('uploaded to s3', s3res)
                resolve(s3res)
            }
        })
    })
}

const s3util = (s3params) => {
    return new Promise(async (resolve, reject) => {
        await uploadToS3(s3params)
            .then((data) => {
                let params = {
                    Bucket: data.Bucket,
                    Key: data.Key,
                }
                s3.getSignedUrl('getObject', params, (err, data) => {
                    let returnData
                    if (err) {
                        /* istanbul ignore next */
                        reject(err)
                    } else {
                        returnData = {
                            signedRequest: data,
                            url:
                                'https://s3.' +
                                config.AWS_REGION +
                                '.amazonaws.com/' +
                                config.PARTNER_IMAGES_BUCKET +
                                '/' +
                                s3params.Key,
                        }
                        // Return signed URL
                        resolve(returnData.signedRequest)
                    }
                })
            })
            .catch((err) => {
                logger.error('s3util',err);
                reject('Error while uploading')
            })
    })
}

const getAndDeleteObject = (requestBody, params) => {
    partners(config, db)
        .getById(params)
        .then((data) => {
            let splitingUrl = data[0]['partner_icon'].split('?')

            let splitingFile = splitingUrl[0].split('/')

            let s3params = {
                Bucket: config.PARTNER_IMAGES_BUCKET,
                Key: splitingFile[splitingFile.length - 1],
            }
            s3.deleteObject(s3params, function (err, data) {
                if (err) {
                    logger.error('deleteObject err',err)
                }
            })
        })
        .catch((err) => {
            logger.error('getAndDeleteObject catch',err)
        })
}

app.use((req, res, next) => {
    // do something
    res.cors()
    next()
})

/**
 * create partners
 */
app.post('partners/create-partner', async (req, res) => {
    let body = multipart.parse(req, true)
    let ImageBuffer = Buffer.from(
        body.partner_icon.content,
        req.isBase64Encoded ? 'base64' : 'binary'
    )
    if (!body.partner_code || !body.partner_icon || !body.partner_name) {
        return res.status(400).json({ error: 'Invalid Request params' })
    }
    logger.info(
        '/partners/create-partner  request received with partner code ',
        ImageBuffer
    )

    //Forming a filename to post to s3
    const key = body.partner_code + '_' + body.partner_icon.filename

    let s3params = {
        Bucket: config.PARTNER_IMAGES_BUCKET,
        Key: key,
        ContentType: body.partner_icon.contentType,
        ContentEncoding: 'base64',
        Body: ImageBuffer,
    }
    await s3util(s3params)
        .then((response) => {
            body.partner_icon = response
            return partners(config, db)
                .addNewPartner(body)
                .then((data) => {
                    logger.info(
                        's3util newPartner data',
                        data
                    )

                    return res.status(200).json(data)
                })
                .catch((e) => {
                    logger.error('partners/create-partner new partner err',e)
                    return res
                        .status(400)
                        .json({ error: 'Error while processing request' })
                })
        })
        .catch((err) => {
            logger.error(
                'partners/create-partner err',
                err
            )
            return res
                .status(400)
                .json({ error: 'Error while uploading to icon to s3 bucket' })
        })
})

/**
 * get partners
 */
app.get('partners', async (req, res) => {
    return partners(config, db)
        .fetchAllPartners()
        .then((data) => data)
        .catch((e) => {
            logger.error('/partners', e)
            res.status(400).json({ error: 'Error while fetching data' })
        })
})

//Fetch with  partner code
app.get('partners/partner', (req, res) => {
    return partners(config, db)
        .getByCode(req.query)
        .then((data) => res.json(data))
        .catch((err) => {
            logger.error('/partners/partner', err)
            res.status(400).json({ error: 'Error while fetching data' })

            /* istanbul ignore next */
            /* istanbul ignore next */
        })
})

/**
 * Patch partner name , code and status
 */
app.patch('partners/partner/:id', (req, res) => {
    return partners(config, db)
        .updateRecord(req.body, req.params)
        .then((data) => {
            return res.json(data)
        })
        .catch((err) => {
            logger.error(
                'partners/partner/:id patch',
                err
            )
        })
})

/**
 * Put request to update the icon in s3 and as well as DB
 */
app.put('/partners/partner/:id', async (req, res) => {
    const body = parse(req, true)

    if (!body.partner_code || !body.partner_icon || !body.partner_name) {
        return res.status(400).json({ error: 'Invalid body' })
    }
    //Forming a filename to post to s3
    const key = body.partner_code + '_' + body.partner_icon.filename

    let s3params = {
        Bucket: config.PARTNER_IMAGES_BUCKET,
        Key: key,
        ContentType: body.partner_icon.contentType,
        ContentEncoding: 'base64',
        Body: body.partner_icon.content,
    }

    /// Deleting existing s3 Object
    getAndDeleteObject(body, req.params)

    // Call AWS S3 library to upload and get the signed url
    await s3util(s3params)
        .then((response) => {
            body.partner_icon = response
            return partners(config, db)
                .updateRecord(body, req.params)
                .then((data) => res.json(data))
                .catch((err) => {
                    res.status(400).json({ error: 'Error while updating' })
                    /* istanbul ignore next */
                })
        })
        .catch((err) => {
            /* istanbul ignore next */
            res.status(400).json({ error: 'Error while updating' })
        })
})

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
        }) // !!!IMPORTANT: Set this flag to false, otherwise the lambda function
    // won't quit until all DB connections are closed, which is not good
    // if you want to freeze and reuse these connections
    context.callbackWaitsForEmptyEventLoop = false

    // Run the request
    return await app.run(event, context)
    // app.run(event, context, callback);
} // end router handler
