/**
 * CogniCity Server /cities data model
 * @module src/api/cities/model
 **/
const { QueryTypes } = require('@sequelize/core')

/**
 * Methods to get cities data from database
 * @alias module:src/api/cities/model
 * @param {Object} config Server configuration
 * @param {Object} db PG Promise database instance
 * @return {Object} Query methods
 */
const cities = (config, db) => ({
    // A list of all infrastructure matching a given type
    all: () =>
        new Promise((resolve, reject) => {
            // Setup query
            let query = `SELECT code, name, the_geom
      FROM cognicity.instance_regions`

            // Execute

            db.query(query, {
                type: QueryTypes.SELECT,
            })
                .then((data) => {
                    console.log(
                        '🚀 ~ file: model.js ~ line 28 ~ .then ~ data',
                        data
                    )
                    resolve(data)
                })
                /* istanbul ignore next */
                .catch((err) => {
                    /* istanbul ignore next */
                    reject(err)
                })
        }),

    byID: (admin) =>
        new Promise((resolve, reject) => {
            // Setup query
            let query = `SELECT code, name, the_geom
      FROM cognicity.instance_regions
      where code=$1 `

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [admin],
            })
                .then((data) => {
                    console.log(
                        '🚀 ~ file: model.js ~ line 50 ~ .then ~ data',
                        data
                    )
                    resolve(data)
                })
                /* istanbul ignore next */
                .catch((err) => {
                    /* istanbul ignore next */
                    reject(err)
                })
        }),
})

module.exports = cities
