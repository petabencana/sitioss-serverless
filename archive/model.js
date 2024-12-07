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
            let isTrainingCondition = ''
            if (training) {
                isTrainingCondition = 'AND is_training = $5::boolean'
            } else {
                isTrainingCondition = 'AND (is_training IS NULL OR is_training = FALSE)'
            }
            // Setup query
            const query = `SELECT pkey, created_at, source,
        status, url, image_url, disaster_type, is_training, report_data, tags, title, text,
        ST_AsBinary(the_geom) , ${config.TABLE_COGNICITY_PARTNERS}.partner_code ,${config.TABLE_COGNICITY_PARTNERS}.partner_icon FROM ${config.TABLE_REPORTS}
        LEFT JOIN ${config.TABLE_COGNICITY_PARTNERS} ON ${config.TABLE_REPORTS}.partner_code=${config.TABLE_COGNICITY_PARTNERS}.partner_code
        WHERE created_at >= $1::timestamp with time zone
        AND created_at <= $2::timestamp with time zone
        AND ($3::text IS NULL OR tags->>'instance_region_code'=$3::text)
        AND ($4::text is NULL OR disaster_type=$4::text)
        ${isTrainingCondition}
        AND ($5::boolean IS NULL OR is_training = $5::boolean OR is_training IS NULL OR is_training = FALSE)
        ORDER BY created_at DESC LIMIT $6`
            const apiLimit = config.API_REPORTS_LIMIT ? config.API_REPORTS_LIMIT : null
            const adminType = admin || null
            const disaster = disasterType || null
            const isTraining = training?.toString() ? training : false

            // var timeWindow = (Date.now() / 1000) - timeperiod;
            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [start, end, adminType, disaster, isTraining, apiLimit],
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
