/**
 * CogniCity Server /infrastructure data model
 * @module src/api/infrastructure/model
 **/
const { QueryTypes } = require('@sequelize/core')

/**
 * Methods to get infrastructure layers from database
 * @alias module:src/api/infrastructure/model
 * @param {Object} config Server configuration
 * @param {Object} db PG Promise database instance
 * @return {Object} Query methods
 */

const infrastructure = (config, db) => ({
    // A list of all infrastructure matching a given type
    all: (admin, type) =>
        new Promise((resolve, reject) => {
            // Setup query
            let query = `SELECT name, tags, ST_AsBinary(the_geom)
      FROM infrastructure.${type}
      WHERE ($1 IS NULL OR tags->>'instance_region_code'=$1)`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [admin],
            })
                .then((data) => {
                    resolve(data)
                })
                /* istanbul ignore next */
                .catch((err) => {
                    /* istanbul ignore next */
                    reject(err)
                })
        }),
})

module.exports = infrastructure
