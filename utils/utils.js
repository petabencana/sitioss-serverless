const dbgeo = require("dbgeo");
// Import config
const config = require("../config");

// Caching
const apicache = require("apicache");

apicache.options({
  debug: config.LOG_LEVEL === "debug",
  statusCodes: { include: [200] },
});
let cache = apicache.middleware;
const { JwtRsaVerifier } = require("aws-jwt-verify");

// Cache response if enabled
const cacheResponse = (duration) => cache(duration, config.CACHE);

const jwtCheck = JwtRsaVerifier.create({
  issuer: config.AUTH0_ISSUER,
  audience: config.AUTH0_AUDIENCE,
  jwksUri: `https://${config.AUTH0_ISSUER}/.well-known/jwks.json`,
});

// Setup dbgeo
dbgeo.defaults = {
  outputFormat: config.GEO_FORMAT_DEFAULT,
  geometryColumn: "st_asbinary",
  geometryType: "wkb",
  precision: config.GEO_PRECISION,
};

// Format the geographic response with the required geo format
const formatGeo = (body, outputFormat) => {
  return new Promise((resolve, reject) => {
    // Check that body is an array, required by dbgeo.parse
    if (Object.prototype.toString.call(body) !== "[object Array]") {
      body = [body]; // Force to array
    }
    dbgeo.parse(body, { outputFormat }, (err, formatted) => {
      if (err) {
        console.log("🚀 ~ file: utils.js ~ line 40 ~ dbgeo.parse ~ err", err);
        reject(err);
      }
      resolve(formatted);
    });
  });
};

const handleResponse = (data, req, res) => {
  return !data
    ? res.status(404).json({ message: "Cards not found" })
    : res.status(200).json({ result: data });
};

// Handle a geo response, send back a correctly formatted json object with
// status 200 or not found 404, catch and forward any errors in the process
const handleGeoResponse = (data, req, res, next) => {
  return !data
    ? res.status(404).json({ statusCode: 404, found: false, result: null })
    : formatGeo(data, req.query.geoformat)
        .then((formatted) => {
          return res.status(200).json({ statusCode: 200, result: formatted });
        })
        /* istanbul ignore next */
        .catch((err) => {
          return res.status(400).json({ message: "Could not format request" });
          /* istanbul ignore next */
          // next(err);
        });
};

// Handle a geo or cap response, send back a correctly formatted json object with
// status 200 or not found 404, catch and forward any errors in the process
const handleGeoCapResponse = (data, req, res, cap, next) => {
  return !data
    ? res.status(404).json({ statusCode: 404, found: false, result: null })
    : req.query.geoformat === "cap"
    ? // If CAP format has been required convert to geojson then to CAP
      formatGeo(data, "geojson")
      .then((formatted) => res.header('Content-Type', 'text/xml').send(cap.geoJsonToReportAtomCap(formatted.features)))

        /* istanbul ignore next */
        .catch((err) =>
          console.log(
            "🚀 ~ file: utils.js ~ line 77 ~ handleGeoCapResponse ~ err",
            err
          )
        )
    : // Otherwise hand off to geo formatter
      formatGeo(data, req.query.geoformat)
        .then((formatted) => {
          console.log(
            "🚀 ~ file: utils.js ~ line 86 ~ .then ~ formatted",
            formatted
          );
          return res.status(200).json({ statusCode: 200, result: formatted });
        })
        .catch((err) => {
          console.log("🚀 ~ file: utils.js ~ line 99 ~ formatGeo ~ err", err);
          return res
            .status(400)
            .json({ statusCode: 400, error: "Error while formating" });
        });
  /* istanbul ignore next */
  // .catch((err) => next(err));
};

// Simplifies the geometry and converts to required format
const simplifyGeoAndCheckPoint = (body, outputFormat, lat, long) =>
  new Promise((resolve, reject) => {
    // Check that body is an array, required by dbgeo.parse
    if (Object.prototype.toString.call(body) !== "[object Array]") {
      body = [body]; // Force to array
    }
    dbgeo.parse(body, { outputFormat }, (err, formatted) => {
      if (err) reject(err);
      const isPointInCity = booleanPointInPolygon(
        [long, lat],
        formatted["features"][0]["geometry"]
      );
      // formatted['features'][0]['geometry']['coordinates'] = simplified;
      // console.log(formatted['features'][0]['properties']['name']);
      resolve({
        pointInCity: isPointInCity,
        cityName: formatted["features"][0]["properties"]["name"],
      });
    });
  });

// simplify geometry for response
// status 200 or not found 404, catch and forward any errors in the process
const checkIfPointInGeometry = (data, req, res) => {
  return !data
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
            "🚀 ~ file: utils.js ~ line 129 ~ checkIfPointInGeometry ~ err",
            err
          );
          res
            .status(400)
            .json({ statusCode: 400, message: "Error while forming response" });
        });
};

module.exports = {
  handleResponse,
  handleGeoResponse,
  handleGeoCapResponse,
  cacheResponse,
  jwtCheck,
  checkIfPointInGeometry,
  formatGeo,
};
