/**
 * CogniCity Server /floodgauges data model
 * @module src/api/floodgauges/model
 **/

const { QueryTypes } = require("@sequelize/core");
const { TABLE_EARTHQUAKE_REPORTS } = require("../config");

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
            let query = `SELECT  date , zone , feltarea , ST_AsBinary(the_geom) , depth , magnitude FROM ${TABLE_EARTHQUAKE_REPORTS} WHERE created_date >= to_timestamp($1)`;
            let now = Date.now() / 1000;
            // SELECT  date , zone , feltarea , ST_AsBinary(the_geom) , depth , magnitude FROM earthquake.earthquakes_reports WHERE created_date >= to_timestamp(1672810686.661) AND created_date <= to_timestamp(1672823286.661);
            // Setup values
            // let timeWindow =
            //   Date.now() / 1000 - config.API_FLOODGAUGE_REPORTS_TIME_WINDOW;
            // let apiLimit = config.API_FLOODGAUGE_REPORTS_LIMIT || null;
            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind:[
                    now - config.API_EQ_REPORTS_TIME_WINDOW,
                    // now - config.API_EQ_REPORTS_TIME_WINDOW + 1800,
                ]
            })
                .then(data =>{
                  console.log("data coming" , data)
                  resolve(data)
                })
                /* istanbul ignore next */
                .catch(err => {
                    reject(err);
                });
        })
});

module.exports = earthquakes
