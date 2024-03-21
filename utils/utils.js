const dbgeo = require('dbgeo')
// Caching
const apicache = require('apicache')

let cache = apicache.middleware
const { JwtRsaVerifier } = require('aws-jwt-verify')

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
                console.log(
                    '🚀 ~ file: utils.js ~ line 40 ~ dbgeo.parse ~ err',
                    err
                )
                reject(err)
            }
            resolve(formatted)
        })
    })

const getDisasterSeverity = (disasterType, reportData) => {
    let level = 'low'
    switch (disasterType) {
        case 'flood':
            reportData = reportData || { flood_depth: 0 }
            let depth = reportData.flood_depth || 0
            level = depth > 150 ? 'high' : 'low'
            break
        case 'earthquake':
            let subType = reportData.report_type
            if (subType === 'road') {
                reportData = reportData || { accessabilityFailure: 0 }
                let accessability = reportData.accessabilityFailure || 0
                level = accessability === 0 ? 'high' : 'low'
            } else if (subType === 'structure') {
                reportData = reportData || { structureFailure: 0 }
                let structureFailure = reportData.structureFailure || 0
                level = structureFailure >= 2 ? 'high' : 'low'
            }
            break
        case 'haze':
            switch (reportData.airQuality) {
                case 0:
                    level = 'low'
                    break
                case 1:
                    level = 'low'
                    break
                case 2:
                    level = 'normal'
                    break
                case 3:
                    level = 'high'
                    break
                case 4:
                    level = 'high'
                    break
                default:
                    level = 'low'
                    break
            }
            break
        case 'wind':
            reportData = reportData || { impact: 0 }
            let impact = reportData.impact || 0
            level = impact === 2 ? 'high' : 'low'
            break
        case 'volcano':
            level = 'high'
            break
        case 'fire':
            level = 'high'
            break
        default:
            break
    }
    return level
}

const filterReports = (data) => {
    const transformedReportCounts = []
    data.forEach((obj) => {
        if (!obj.is_training) {
            const regionCode = obj.tags.region_code
            const city = obj.tags.city
            const disasterType = obj.disaster_type
            const reportData = obj.report_data
            const disasterSeverity = getDisasterSeverity(
                disasterType,
                reportData
            )
            let existingRegion = transformedReportCounts.find(
                (item) =>
                    item.regionCode === regionCode &&
                    item.disasterType === disaster_type
            )
            if (existingRegion) {
                existingRegion.count =
                    disasterSeverity === 'high' ? 3 : existingRegion.count + 1
                // Set city only if it's not already present
                if (city && !existingRegion.city) {
                    existingRegion.city = city
                }
            } else {
                // If severity is high, set count to 3
                const count = disasterSeverity === 'high' ? 3 : 1
                transformedReportCounts.push({
                    regionCode,
                    count,
                    disasterType,
                    city: city || '',
                })
            }
        }
    })
    return transformedReportCounts
}

const handleResponse = (data, req, res) =>
    !data
        ? res.status(404).json({ message: 'Cards not found' })
        : res.status(200).json({ result: data })

// Handle a geo response, send back a correctly formatted json object with
// status 200 or not found 404, catch and forward any errors in the process
const handleGeoResponse = (data, req, res, next) =>
    !data
        ? res.status(404).json({ statusCode: 404, found: false, result: null })
        : formatGeo(data, req.query.geoformat)
              .then((formatted) =>
                  res.status(200).json({ statusCode: 200, result: formatted })
              )
              /* istanbul ignore next */
              .catch(
                  (err) =>
                      res
                          .status(400)
                          .json({ message: 'Could not format request' })
                  /* istanbul ignore next */
                  // next(err);
              )

// Handle a geo or cap response, send back a correctly formatted json object with
// status 200 or not found 404, catch and forward any errors in the process
const handleGeoCapResponse = (data, req, res, cap, next) =>
    !data
        ? res.status(404).json({ statusCode: 404, found: false, result: null })
        : req.query.geoformat === 'cap'
          ? // If CAP format has been required convert to geojson then to CAP
            formatGeo(data, 'geojson')
                .then((formatted) =>
                    res
                        .header('Content-Type', 'text/xml')
                        .send(cap.geoJsonToReportAtomCap(formatted.features))
                )

                /* istanbul ignore next */
                .catch((err) =>
                    console.log(
                        '🚀 ~ file: utils.js ~ line 77 ~ handleGeoCapResponse ~ err',
                        err
                    )
                )
          : // Otherwise hand off to geo formatter
            formatGeo(data, req.query.geoformat)
                .then((formatted) =>
                    res.status(200).json({ statusCode: 200, result: formatted })
                )
                .catch((err) => {
                    console.log(
                        '🚀 ~ file: utils.js ~ line 99 ~ formatGeo ~ err',
                        err
                    )
                    return res.status(400).json({
                        statusCode: 400,
                        error: 'Error while formating',
                    })
                })
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
            const isPointInCity = booleanPointInPolygon(
                [long, lat],
                formatted.features[0].geometry
            )
            // formatted['features'][0]['geometry']['coordinates'] = simplified;
            // console.log(formatted['features'][0]['properties']['name']);
            resolve({
                pointInCity: isPointInCity,
                cityName: formatted.features[0].properties.name,
            })
        })
    })

// simplify geometry for response
// status 200 or not found 404, catch and forward any errors in the process
const checkIfPointInGeometry = (data, req, res) =>
    !data
        ? res.status(404).json({ statusCode: 404, found: false, result: null })
        : simplifyGeoAndCheckPoint(
              data,
              req.query.geoformat,
              req.query.lat,
              req.query.long
          )
              .then((formatted) =>
                  res.status(200).json({ statusCode: 200, result: formatted })
              )
              /* istanbul ignore next */
              .catch((err) => {
                  console.log(
                      '🚀 ~ file: utils.js ~ line 129 ~ checkIfPointInGeometry ~ err',
                      err
                  )
                  res.status(400).json({
                      statusCode: 400,
                      message: 'Error while forming response',
                  })
              })

module.exports = {
    handleResponse,
    handleGeoResponse,
    handleGeoCapResponse,
    cacheResponse,
    jwtCheck,
    checkIfPointInGeometry,
    formatGeo,
    filterReports,
    getDisasterSeverity,
}
