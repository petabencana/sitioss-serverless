;('use strict')
/**
 * CogniCity Server /floods endpoint
 * @module floods/index
 **/
const floods = require('./model')
const config = require('../config')
const db = require('../utils/db')
const app = require('lambda-api')()
const archive = require('./archive/model')
const timeseries = require('./timeseries/model')
const Cap = require('../utils/cap')
const logger = require('../utils/logger')
const { cacheResponse, formatGeo, jwtCheck } = require('../utils/utils')

// Caching
const apicache = require('apicache')

const CACHE_GROUP_FLOODS = '/floods'
const CACHE_GROUP_FLOODS_STATES = '/floods/states'

const REM_STATES = {
    1: {
        severity: 'Unknown',
        levelDescription: 'AN UNKNOWN LEVEL OF FLOODING - USE CAUTION -',
    },
    2: {
        severity: 'Minor',
        levelDescription: 'FLOODING OF BETWEEN 10 and 70 CENTIMETERS',
    },
    3: {
        severity: 'Moderate',
        levelDescription: 'FLOODING OF BETWEEN 71 and 150 CENTIMETERS',
    },
    4: {
        severity: 'Severe',
        levelDescription: 'FLOODING OF OVER 150 CENTIMETERS',
    },
}

const clearCache = () => {
    apicache.clear(CACHE_GROUP_FLOODS)
    apicache.clear(CACHE_GROUP_FLOODS_STATES)
}

const cap = new Cap(config) // Setup our cap formatter

// To enable cors headers
app.use((req, res, next) => {
    res.cors()
    next()
})

/**
 * Methods to get  reports from database
 * @alias module:src/api/floods/index
 * @param {Object} config Server configuration
 * @param {Object} db sequilize database instance
 */

app.get(
    'floods/old',
    cacheResponse(config.CACHE_DURATION_FLOODS),
    (req, res) => {
        req.apicacheGroup = CACHE_GROUP_FLOODS
        if (req.query.geoformat === 'cap' && req.query.format !== 'xml') {
            return res.status(400).json({
                statusCode: 400,
                message: "format must be 'xml' when geoformat='cap'",
            })
        } else if (
            config.GEO_FORMATS.indexOf(req.query.geoformat) > -1 &&
            req.query.format !== 'json'
        ) {
            return res.status(400).json({
                statusCode: 400,
                message:
                    "format must be 'json' when geoformat " +
                    "IN ('geojson','topojson')",
            })
        } else {
            return floods(config, db)
                .allGeoRw(
                    req.query.admin,
                    req.query.minimum_state || null,
                    req.query.parent || null
                )
                .then((data) =>
                    req.query.geoformat === 'cap'
                        ? // If CAP format has been required convert to geojson then to CAP
                          formatGeo(data, 'geojson')
                              .then((formatted) =>
                                  res
                                      .status(200)
                                      .set('Content-Type', 'text/xml')
                                      .send(
                                          cap.geoJsonToAtomCap(
                                              formatted.features
                                          )
                                      )
                              )
                              /* istanbul ignore next */
                              .catch((err) => {
                                  logger.error('floods/old formatgeo with cap err',err)
                              })
                        : // Otherwise hand off to geo formatter
                          formatGeo(data, req.query.geoformat)
                              .then((formatted) =>
                                  res
                                      .status(200)
                                      .json({
                                          statusCode: 200,
                                          result: formatted,
                                      })
                              )
                              /* istanbul ignore next */
                              .catch((err) => {
                                logger.error('floods/old formatgeo without cap err',err)
                              })
                )
                .catch((err) => {
                    logger.error('/floods/old err',err)
                })
        }
    }
)

app.get('floods', cacheResponse(config.CACHE_DURATION_FLOODS), (req, res) => {
    req.apicacheGroup = CACHE_GROUP_FLOODS
    if (req.query.geoformat === 'cap' && req.query.format !== 'xml') {
        return res.status(400).json({
            statusCode: 400,
            message: "format must be 'xml' when geoformat='cap'",
        })
    } else if (
        config.GEO_FORMATS.indexOf(req.query.geoformat) > -1 &&
        req.query.format !== 'json'
    ) {
        return res.status(400).json({
            statusCode: 400,
            message:
                "format must be 'json' when geoformat " +
                "IN ('geojson','topojson')",
        })
    } else {
        return floods(config, db)
            .allGeo(
                req.query.admin,
                req.query.minimum_state || null,
                req.query.parent || null
            )
            .then((data) =>
                req.query.geoformat === 'cap'
                    ? // If CAP format has been required convert to geojson then to CAP
                      formatGeo(data, 'geojson')
                          .then((formatted) =>
                              res
                                  .status(200)
                                  .set('Content-Type', 'text/xml')
                                  .send(
                                      cap.geoJsonToAtomCap(formatted.features)
                                  )
                          )
                          /* istanbul ignore next */
                          .catch((err) => {
                            logger.error('/floods formatgeo with cap err',err)
                          })
                    : // Otherwise hand off to geo formatter
                      formatGeo(data, req.query.geoformat)
                          .then((formatted) =>
                              res
                                  .status(200)
                                  .json({ statusCode: 200, result: formatted })
                          )
                          /* istanbul ignore next */
                          .catch((err) => {
                            logger.error('/floods formatgeo without cap err',err)
                          })
            )
            .catch((err) => {
                logger.error('/floods err',err)
            })
    }
})

// Just get the states without the geographic boundaries
app.get(
    'floods/states',
    cacheResponse(config.CACHE_DURATION_FLOODS_STATES),
    (req, res, next) => {
        req.apicacheGroup = CACHE_GROUP_FLOODS_STATES
        return floods(config, db)
            .all(req.query.admin, req.query.minimum_state)
            .then((data) =>
                res.status(200).json({ statusCode: 200, result: data })
            )
            .catch((err) => {
                logger.error('/floods/states',err)
            })
    }
)

// Just get Districts, SubDistricts and Villages without geographic boundaries
app.get(
    'floods/places',
    cacheResponse(config.CACHE_DURATION_FLOODS_STATES),
    (req, res) => {
        req.apicacheGroup = CACHE_GROUP_FLOODS_STATES
        return floods(config, db)
            .allPlaces(req.query.admin, req.query.minimum_state)
            .then((data) =>
                res.status(200).json({ statusCode: 200, result: data })
            )
            .catch((err) => {
                logger.error('/floods/places',err)
            })
    }
)

// Update the flood status of a local area
app.put('floods/:localAreaId', (req, res) =>
    floods(config, db)
        .updateREMState(
            req.params.localAreaId,
            req.body.state,
            req.query.username
        )
        .then(() => {
            clearCache()
            return res.status(200).json({
                localAreaId: req.params.localAreaId,
                state: req.body.state,
                updated: true,
            })
        })
        /* istanbul ignore next */
        .catch((err) => {
            logger.error('/floods/:localAreaId',err)
        })
)

// Update the flood status of a local area by geomid
app.put('floods/geomid/:geomId', (req, res) =>
    floods(config, db)
        .placeByGeomId(req.params.geomId)
        .then((data) => {
            floods(config, db)
                .updateREMState(
                    data[0].pkey,
                    req.body.state,
                    req.query.username
                )
                .then(() => {
                    clearCache()
                    return res.status(200).json({
                        geomId: req.params.geomId,
                        state: req.body.state,
                        updated: true,
                    })
                })
        })
        /* istanbul ignore next */
        .catch((err) => {
            logger.error('/floods/geomid/:geomId',err)
        })
)

// Remove the flood status of a local and add a log entry for audit
app.delete('floods/:localAreaId', async (req, res) => {
    const accessToken = req.headers['authorization']
    let payload
    try {
        // If the token is not valid, an error is thrown:
        payload = await jwtCheck.verify(accessToken)
        logger.error('/floods/:localAreaId payload',err)
        return (
            floods(config, db)
                .clearREMState(req.params.localAreaId, req.query.username)
                .then(() => {
                    clearCache()
                    return res.status(200).json({
                        localAreaId: req.params.localAreaId,
                        state: null,
                        updated: true,
                    })
                })
                /* istanbul ignore next */
                .catch((err) => {
                logger.error('/floods/:localAreaId',err)
                    /* istanbul ignore next */
                })
        )
    } catch {
        // API Gateway wants this *exact* error message, otherwise it returns 500 instead of 401:
        throw new Error('Unauthorized')
    }
})

app.get('floods/archives/old', cacheResponse('1 minute'), (req, res) => {
    // validate the time window, if fails send 400 error
    let maxWindow =
        new Date(req.query.start).getTime() +
        config.API_REPORTS_TIME_WINDOW_MAX * 1000
    let end = new Date(req.query.end)
    if (end > maxWindow) {
        res.status(400).json({
            statusCode: 400,
            error: 'Bad Request',
            message:
                "child 'end' fails because [end is more than " +
                config.API_REPORTS_TIME_WINDOW_MAX +
                " seconds greater than 'start']",
            validation: {
                source: 'query',
                keys: ['end'],
            },
        })
        return
    }
    return archive(config, db)
        .maxstate(req.query.start, req.query.end, req.query.admin)
        .then((data) => res.status(200).json({ statusCode: 200, result: data }))
        .catch((err) => {
            logger.error('/floods/archives/old',err)
        })
})

// TODO add support for multiple cities
// Just get the states without the geographic boundaries
app.get('floods/archives', cacheResponse('1 minute'), (req, res) => {
    // validate the time window, if fails send 400 error
    let maxWindow =
        new Date(req.query.start).getTime() +
        config.API_REPORTS_TIME_WINDOW_MAX * 1000
    let end = new Date(req.query.end)
    if (end > maxWindow) {
        res.status(400).json({
            statusCode: 400,
            error: 'Bad Request',
            message:
                "child 'end' fails because [end is more than " +
                config.API_REPORTS_TIME_WINDOW_MAX +
                " seconds greater than 'start']",
            validation: {
                source: 'query',
                keys: ['end'],
            },
        })
        return
    }
    return archive(config, db)
        .maxstate(req.query.start, req.query.end, req.query.admin)
        .then((data) => res.status(200).json({ statusCode: 200, result: data }))
        .catch((err) => {
            logger.error('/floods/archives',err)
        })
})

app.get('floods/timeseries', cacheResponse('1 minute'), (req, res) => {
    // validate the time window, if fails send 400 error
    let maxWindow =
        new Date(req.query.start).getTime() +
        config.API_REPORTS_TIME_WINDOW_MAX * 1000
    let end = new Date(req.query.end)
    if (end > maxWindow) {
        res.status(400).json({
            statusCode: 400,
            error: 'Bad Request',
            message:
                "child 'end' fails because [end is more than " +
                config.API_REPORTS_TIME_WINDOW_MAX +
                " seconds greater than 'start']",
            validation: {
                source: 'query',
                keys: ['end'],
            },
        })
        return
    }

    return timeseries(config, db)
        .count(
            req.query.start,
            req.query.end,
            req.query.admin,
            req.query.parent
        )
        .then((data) => res.status(200).json({ statusCode: 200, result: data }))
        .catch((err) => {
            logger.error('/floods/timeseries',err)
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
        })
    // !!!IMPORTANT: Set this flag to false, otherwise the lambda function
    // won't quit until all DB connections are closed, which is not good
    // if you want to freeze and reuse these connections
    context.callbackWaitsForEmptyEventLoop = false

    return await app.run(event, context)

    // Run the request

    // app.run(event, context, callback);
} // end router handler
