'use strict'
/**
 * CogniCity Server /reports data model
 * @module src/api/reports/model
 **/
/**
 * Methods to get current flood reports from database
 * @alias module:src/api/reports/model
 * @param {Object} config Server configuration
 * @param {Object} db PG Promise database instance
 * @param {Object} logger Configured Winston logger instance
 * @return {Object} Query methods
 */
const { QueryTypes } = require('@sequelize/core')

const reports = (config, db) => ({
    all: (timeperiod, admin, disasterType, training) =>
        new Promise((resolve, reject) => {
            // Setup query
            const query = `SELECT pkey, created_at, source,
      status, url, image_url, disaster_type, is_training, report_data, tags, title, text,
      ST_AsBinary(the_geom), ${config.TABLE_COGNICITY_PARTNERS}.partner_code ,${config.TABLE_COGNICITY_PARTNERS}.partner_icon FROM ${config.TABLE_REPORTS}
      LEFT JOIN ${config.TABLE_COGNICITY_PARTNERS} ON ${config.TABLE_REPORTS}.partner_code=${config.TABLE_COGNICITY_PARTNERS}.partner_code
      WHERE ((disaster_type = 'flood' AND created_at >= to_timestamp($1)) 
      OR (disaster_type = 'earthquake' AND created_at >= to_timestamp($2))
      OR (disaster_type = 'wind' AND created_at >= to_timestamp($3))
      OR (disaster_type = 'typhoon' AND created_at >= to_timestamp($4))
      OR (disaster_type = 'haze' AND created_at >= to_timestamp($5))
      OR (disaster_type = 'volcano' AND created_at >= to_timestamp($6))
      OR (disaster_type = 'fire' AND created_at >= to_timestamp($7)) )
      AND ($8::text IS NULL OR tags->>'instance_region_code'=$8::text)
      AND ($10::text is NULL OR disaster_type=$10::text)
      AND ($11::boolean is NULL OR is_training=$11::boolean)
      ORDER BY created_at DESC LIMIT $9`

            const floodTimeWindow =
                Date.now() / 1000 -
                (timeperiod || config.FLOOD_REPORTS_TIME_WINDOW)
            const eqTimeWindow =
                Date.now() / 1000 -
                (timeperiod || config.EQ_REPORTS_TIME_WINDOW)
            const hazeTimeWindow =
                Date.now() / 1000 -
                (timeperiod || config.HAZE_REPORTS_TIME_WINDOW)
            const windTimeWindow =
                Date.now() / 1000 -
                (timeperiod || config.WIND_REPORTS_TIME_WINDOW)
            const typhoonTimeWindow =
                Date.now() / 1000 -
                (timeperiod || config.WIND_REPORTS_TIME_WINDOW)
            const volcanoTimeWindow =
                Date.now() / 1000 -
                (timeperiod || config.VOLCANO_REPORTS_TIME_WINDOW)
            const fireTimeWindow =
                Date.now() / 1000 -
                (timeperiod || config.FIRE_REPORTS_TIME_WINDOW)
            const adminType = admin || null
            const disaster = disasterType || null
            const apiLimit = config.API_REPORTS_LIMIT
                ? config.API_REPORTS_LIMIT
                : null
            const isTraining = training?.toString() ? training : null
            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [
                    floodTimeWindow,
                    eqTimeWindow,
                    windTimeWindow,
                    typhoonTimeWindow,
                    hazeTimeWindow,
                    volcanoTimeWindow,
                    fireTimeWindow,
                    adminType,
                    apiLimit,
                    disaster,
                    isTraining,
                ],
            })
                .then((data) => {
                    resolve(data)
                })
                /* istanbul ignore next */
                .catch((err) => {
                    console.log(
                        '🚀 ~ file: model.js ~ line 73 ~ newPromise ~ err',
                        err
                    )
                    /* istanbul ignore next */
                    reject(err)
                })
        }),

    // Return specific report by id
    byId: (id) =>
        new Promise((resolve, reject) => {
            // Setup query
            const query = `SELECT pkey, created_at, source,
      status, url, image_url, disaster_type, is_training, report_data, tags, title, text,
      the_geom FROM ${config.TABLE_REPORTS}
      WHERE pkey = ?`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                replacements: [id],
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

    // Update a report's points value
    addPoint: (id, body) =>
        new Promise((resolve, reject) => {
            // Setup query
            const query = `UPDATE ${config.TABLE_REPORTS} SET report_data =
    (SELECT COALESCE(report_data::jsonb, '{}') || ('{"points":' ||
      (COALESCE((report_data->>'points')::int, 0) + ?) || '}')::jsonb points
      FROM ${config.TABLE_REPORTS} WHERE pkey = ?) WHERE pkey = ?
      RETURNING report_data->>'points' as points`

            const createQuery = `INSERT INTO ${config.TABLE_REPORTS_POINTS_LOG}
      (report_id, value) VALUES (?, ?)`
            // Execute
            db.query(query, {
                type: QueryTypes.UPDATE,
                replacements: [id, body.points],
            })
                .then((data) => {
                    db.query(createQuery, {
                        type: QueryTypes.INSERT,
                        replacements: [id, body.points],
                    })
                        .then(() => {
                            resolve(data)
                        })
                        /* istanbul ignore next */
                        .catch((err) => {
                            /* istanbul ignore next */
                            reject(err)
                        })
                })
                /* istanbul ignore next */
                .catch((err) => {
                    console.log(
                        '🚀 ~ file: model.js ~ line 137 ~ newPromise ~ err',
                        err
                    )
                    /* istanbul ignore next */
                    reject(err)
                })
        }),

    // Update a report's flag value
    setFlag: (id, body) =>
        new Promise((resolve, reject) => {
            // Setup query
            const query = `UPDATE ${config.TABLE_REPORTS} SET report_data = 
      (SELECT COALESCE(report_data::jsonb, '{}') || 
        ('{"flag":' || ? || '}')::jsonb flag
      FROM ${config.TABLE_REPORTS} WHERE pkey = ?) WHERE pkey = ?
      RETURNING report_data->>'flag' as flag`

            // Execute
            db.query(query, {
                type: QueryTypes.UPDATE,
                replacements: [id, body.flag],
            })
                .then(() => {
                    resolve(data)
                })
                /* istanbul ignore next */
                .catch((err) => {
                    console.log(
                        '🚀 ~ file: model.js ~ line 163 ~ newPromise ~ err',
                        err
                    )
                    /* istanbul ignore next */
                    reject(err)
                })
        }),
})

module.exports = reports
