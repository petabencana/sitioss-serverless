'use strict'
const dbgeo = require('dbgeo')
// Caching
const apicache = require('apicache')

const cache = apicache.middleware
const { JwtRsaVerifier } = require('aws-jwt-verify')
const booleanPointInPolygon = require('@turf/boolean-point-in-polygon')

const config = require('../config')

apicache.options({
    debug: config.LOG_LEVEL === 'debug',
    statusCodes: { include: [200] },
})
// Cache response if enabled
const cacheResponse = (duration) => cache(duration, config.CACHE)

const jwtCheck = JwtRsaVerifier.create({
    issuer: config.AUTH0_ISSUER,
    audience: config.AUTH0_AUDIENCE,
    jwksUri: `https://${config.AUTH0_ISSUER}/.well-known/jwks.json`,
})

// Setup dbgeo
dbgeo.defaults = {
    outputFormat: config.GEO_FORMAT_DEFAULT,
    geometryColumn: 'st_asbinary',
    geometryType: 'wkb',
    precision: config.GEO_PRECISION,
}

// Format the geographic response with the required geo format
const formatGeo = (body, outputFormat) =>
    new Promise((resolve, reject) => {
        // Check that body is an array, required by dbgeo.parse
        if (Object.prototype.toString.call(body) !== '[object Array]') {
            body = [body] // Force to array
        }
        dbgeo.parse(body, { outputFormat }, (err, formatted) => {
            if (err) {
                console.log('🚀 ~ file: utils.js ~ line 40 ~ dbgeo.parse ~ err', err)
                reject(err)
            }
            resolve(formatted)
        })
    })

const filterReports = (data) => {
    const transformedReportCounts = []
    data.forEach((obj) => {
        if (!obj.is_training) {
            const regionCode = obj.tags.region_code
            const city = obj.tags.city
            const disasterType = obj.disaster_type
            const existingRegion = transformedReportCounts.find(
                (item) => item.regionCode === regionCode && item.disasterType === disasterType
            )
            if (existingRegion) {
                existingRegion.count += 1
                // Set city only if it's not already present
                if (city && !existingRegion.city) {
                    existingRegion.city = city
                }
                existingRegion.pkey = obj.pkey
            } else {
                const count = 1
                transformedReportCounts.push({
                    regionCode,
                    count,
                    pkey: obj.pkey,
                    disasterType,
                    city: city || '',
                })
            }
        }
    })
    return transformedReportCounts
}

const handleResponse = (data, res) => {
    if (!data) {
        return res.status(404).json({ message: 'Cards not found' })
    }
    return res.status(200).json({ result: data })
}

// Handle a geo response, send back a correctly formatted json object with
// status 200 or not found 404, catch and forward any errors in the process
const handleGeoResponse = (data, req, res) => {
    if (!data) {
        return res.status(404).json({ statusCode: 404, found: false, result: null })
    }
    return (
        formatGeo(data, req.query.geoformat)
            .then((formatted) => res.status(200).json({ statusCode: 200, result: formatted }))
            /* istanbul ignore next */
            .catch(() => res.status(400).json({ message: 'Could not format request' }))
    )
}

// Handle a geo or cap response, send back a correctly formatted json object with
// status 200 or not found 404, catch and forward any errors in the process
const handleGeoCapResponse = async (data, req, res, cap) => {
    if (!data) {
        return res.status(404).json({ statusCode: 404, found: false, result: null })
    }
    try {
        const formatted = await formatGeo(data, req.query.geoformat === 'cap' ? 'geojson' : req.query.geoformat)
        if (req.query.geoformat === 'cap') {
            return res.header('Content-Type', 'text/xml').send(cap.geoJsonToReportAtomCap(formatted.features))
        }
        return res.status(200).json({ statusCode: 200, result: formatted })
    } catch (err) {
        console.log('🚀 ~ file: utils.js ~ line 77 ~ handleGeoCapResponse ~ err', err)
        return res.status(400).json({
            statusCode: 400,
            error: 'Error while formatting',
        })
    }
}

/* istanbul ignore next */
// .catch((err) => next(err));
// Simplifies the geometry and converts to required format
const simplifyGeoAndCheckPoint = (body, outputFormat, lat, long) =>
    new Promise((resolve, reject) => {
        // Check that body is an array, required by dbgeo.parse
        if (Object.prototype.toString.call(body) !== '[object Array]') {
            body = [body] // Force to array
        }
        dbgeo.parse(body, { outputFormat }, (err, formatted) => {
            if (err) reject(err)
            const isPointInCity = booleanPointInPolygon([long, lat], formatted.features[0].geometry)
            resolve({
                pointInCity: isPointInCity,
                cityName: formatted.features[0].properties.name,
            })
        })
    })

// simplify geometry for response
// status 200 or not found 404, catch and forward any errors in the process
const checkIfPointInGeometry = async (data, req, res) => {
    if (!data) {
        return res.status(404).json({ statusCode: 404, found: false, result: null })
    }
    try {
        const formatted = await simplifyGeoAndCheckPoint(data, req.query.geoformat, req.query.lat, req.query.long)
        return res.status(200).json({ statusCode: 200, result: formatted })
    } catch (err) {
        return res.status(400).json({
            statusCode: 400,
            message: 'Error while forming response',
        })
    }
}

module.exports = {
    handleResponse,
    handleGeoResponse,
    handleGeoCapResponse,
    cacheResponse,
    jwtCheck,
    checkIfPointInGeometry,
    formatGeo,
    filterReports,
}
