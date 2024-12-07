/**
 * CogniCity Server /floods/archive data model
 * @module src/api/floods/archive model
 **/
const { QueryTypes } = require('@sequelize/core')

/**
 * Methods to interact with flood layers in database
 * @alias module:src/api/floods/model
 * @param {Object} config Server configuration
 * @param {Object} db Sequelize database instance
 * @return {Object} Query methods
 */
const archive = (config, db) => ({
    // Get max state of all flood reports over time
    maxstate: (start, end, admin) =>
        new Promise((resolve, reject) => {
            // Setup query
            let query = `SELECT 
      mf.local_area AS area_id, 
      mf.changed AS last_updated,
      mf.max_state 
    FROM 
      cognicity.rem_get_max_flood($1, $2) AS mf, 
      ${config.TABLE_LOCAL_AREAS} AS la
    WHERE 
      mf.local_area = la.pkey AND
      ($3 IS NULL OR la.instance_region_code = $3)`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [start, end, admin],
            })
                .then((data) => resolve(data))
                /* istanbul ignore next */
                .catch((err) => {
                    reject(err)
                })
        }),
    maxstateOld: (start, end, admin) =>
        new Promise((resolve, reject) => {
            // Setup query
            let query = `SELECT 
      mf.local_area AS area_id, 
      mf.changed AS last_updated,
      mf.max_state 
    FROM 
      cognicity.rem_get_max_flood($1, $2) AS mf, 
      ${config.TABLE_LOCAL_AREAS_RW} AS la
    WHERE 
      mf.local_area = la.pkey AND
      ($3 IS NULL OR la.instance_region_code = $3)`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [start, end, admin],
            })
                .then((data) => resolve(data))
                /* istanbul ignore next */
                .catch((err) => {
                    reject(err)
                })
        }),
})

module.exports = archive
