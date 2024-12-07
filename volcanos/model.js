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
const volcanos = (config, db, logger) => ({
    listVolcano: () =>
        new Promise((resolve, reject) => {
            let query = `SELECT * FROM ${config.TABLE_VOLCANO_LIST_REPORTS};`

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

    lastEruption: () =>

    new Promise((resolve, reject) => {
      let query = `SELECT local_date , volcano_name , ST_AsBinary(the_geom) , activity_level , visual , photo_ , share_url  from ${config.TABLE_VOLCANO_LAST_ERUPTION_REPORTS};`

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

module.exports = volcanos
