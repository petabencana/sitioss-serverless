'use strict'
/**
 * CogniCity Server /reports/archive data model
 * @module src/api/reports/archive/model
 **/
const { QueryTypes } = require('@sequelize/core')

/**
 * Interact with historic report objects
 * @alias module:src/api/reports/archive/model
 * @param {Object} config Server configuration
 * @param {Object} db PG Promise database instance
 * @return {Object} Query methods
 */

const archive = (config, db) => ({
    all: (start, end, admin, disasterType, training) =>
        new Promise((resolve, reject) => {
            // Setup query
            const query = `SELECT pkey, created_at, source,
      status, url, image_url, disaster_type,is_training, report_data, tags, title, text,
      ST_AsBinary(the_geom) , ${config.TABLE_COGNICITY_PARTNERS}.partner_code ,${config.TABLE_COGNICITY_PARTNERS}.partner_icon FROM ${config.TABLE_REPORTS}
      LEFT JOIN ${config.TABLE_COGNICITY_PARTNERS} ON ${config.TABLE_REPORTS}.partner_code=${config.TABLE_COGNICITY_PARTNERS}.partner_code
      WHERE created_at >= $1::timestamp with time zone
      AND created_at <= $2::timestamp with time zone
      AND ($3 IS NULL OR tags->>'instance_region_code'=$3)
      ORDER BY created_at DESC LIMIT $4`

            // var timeWindow = (Date.now() / 1000) - timeperiod;
            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [start, end, admin, config.API_REPORTS_LIMIT],
            })
                .then((data) => {
                    resolve(data)
                })
                /* istanbul ignore next */
                .catch((err) => {
                    console.log('🚀 ~ file: model.js ~ line 98 ~ newPromise ~ err', err)
                    /* istanbul ignore next */
                    reject(err)
                })
        }),
})

module.exports = archive
