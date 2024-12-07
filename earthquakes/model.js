/**
 * CogniCity Server /floodgauges data model
 * @module src/api/floodgauges/model
 **/
const { QueryTypes } = require('@sequelize/core')

/**
 * Methods to get floodgauges layers from database
 * @alias module:src/api/floodgauges/model
 * @param {Object} config Server configuration
 * @param {Object} db PG Promise database instance
 * @return {Object} Query methods
 */
const earthquakes = (config, db, logger) => ({
    // Return all flood gauge reports within the defined max period
    // Optional: admin (Petabencana.id Instance Region 3 letter code)
    all: () =>
        new Promise((resolve, reject) => {
            let query = `SELECT zone , feltarea , ST_AsBinary(the_geom) , depth , magnitude FROM earthquake.earthquakes_reports`

            // `SELECT * FROM ${config.TABLE_EARTHQUAKE_REPORTS};`;

            // // Setup values
            // let timeWindow =
            //   Date.now() / 1000 - config.API_FLOODGAUGE_REPORTS_TIME_WINDOW;
            // let apiLimit = config.API_FLOODGAUGE_REPORTS_LIMIT || null;

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
            })
                .then((data) => resolve(data))
                /* istanbul ignore next */
                .catch((err) => {
                    reject(err)
                })
        }),
})

module.exports = earthquakes
