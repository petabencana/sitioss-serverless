/**
 * CogniCity Server /reports/timeseries data model
 * @module src/api/reports/timeseries/model
 **/
const { QueryTypes } = require('@sequelize/core')

/**
 * Methods to interact with report layer in database
 * @alias module:src/api/reports/timeseries/model
 * @param {Object} config Server configuration
 * @param {Object} db PG Promise database instance
 * @return {Object} Query methods
 */
const timeseries = (config, db) => ({
    // Get all flood reports for a given admin boundary
    count: (start, end, admin) =>
        new Promise((resolve, reject) => {
            // Setup query
            let query = `SELECT ts, count(r.pkey)
    FROM generate_series(date_trunc('hour', $1::timestamp with time zone),
    date_trunc('hour', $2::timestamp with time zone), '1 hour') ts
    LEFT JOIN cognicity.all_reports r
    ON date_trunc('hour', r.created_at) = ts
    AND ($3 IS NULL OR tags->>'instance_region_code'=$3)
    GROUP BY ts ORDER BY ts`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [start, end, admin],
            })
                .then((data) => {
                    resolve(data)
                })
                /* istanbul ignore next */
                .catch((err) => {
                    console.log(
                        '🚀 ~ file: model.js ~ line 98 ~ newPromise ~ err',
                        err
                    )
                    /* istanbul ignore next */
                    reject(err)
                })
        }),
})

module.exports = timeseries
