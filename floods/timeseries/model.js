/**
 * CogniCity Server /floods/timeseries data model
 * @module src/api/floods/timeseries/model
 **/
const { QueryTypes } = require('@sequelize/core')

/**
 * Methods to interact with flood layers in database
 * @alias module:src/api/floods/timeseries/model
 * @param {Object} config Server configuration
 * @param {Object} db Sequelize database instance
 * @return {Object} Query methods
 */
const timeseries = (config, db) => ({
    // Get all flood reports for a given admin boundary
    count: (start, end, admin, parent) =>
        new Promise((resolve, reject) => {
            // Setup query
            let query = `SELECT series.ts, count(series.local_area) 
      FROM
        (SELECT (cognicity.rem_get_flood(ts)).local_area, ts
          FROM 
            generate_series(date_trunc('hour', $1::timestamp with time zone),
            date_trunc('hour', $2::timestamp with time zone),'1 hour')
      AS series(ts)) AS series,
      ${config.TABLE_LOCAL_AREAS} AS la
      WHERE 
        series.local_area = la.pkey AND
        ($3 IS NULL OR la.instance_region_code = $3) AND
        ($4 IS NULL OR la.city_name = $4)
      GROUP BY series.ts 
      ORDER BY series.ts`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [start, end, admin, parent],
            })
                .then((data) => resolve(data))
                /* istanbul ignore next */
                .catch((err) => {
                    reject(err)
                })
        }),
})

module.exports = timeseries
