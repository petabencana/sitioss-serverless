'use strict'
/**
 * CogniCity Server /feeds data model
 * @module cards/model
 **/
const { QueryTypes } = require('@sequelize/core')

/**
 * Methods to interact with feeds layers in database
 * @alias module:src/api/partners/model
 * @param {Object} config Server configuration
 * @param {Object} db PG Promise database instance
 * @param {Object} logger Configured Winston logger instance
 * @return {Object} Query methods
 */
const cards = (config, db) => ({
    // Add a new partner
    create: (body) =>
        new Promise((resolve, reject) => {
            // Setup query
            const networkData = body.network_data || '{}'
            const cardsQuery = `INSERT INTO ${config.TABLE_GRASP_CARDS}
    (username, network, language, received, network_data)
    VALUES (?, ?, ?, ?, '{}') RETURNING card_id`

            // Execute
            db.query(cardsQuery, {
                type: QueryTypes.INSERT,
                replacements: [body.username, body.network, body.language, false, networkData],
            })
                .then((data) => {
                    // Card created, update database log
                    const query = `INSERT INTO ${config.TABLE_GRASP_LOG}
                  (card_id, event_type) VALUES (?, ?)`
                    db.query(query, {
                        type: QueryTypes.INSERT,
                        replacements: [data[0][0].card_id, 'CARD CREATED'],
                    })
                        .then(() => {
                            resolve(data[0][0])
                        })
                        .catch((err) => {
                            reject(err)
                        })
                })
                /* istanbul ignore next */
                .catch((err) => {
                    /* istanbul ignore next */
                    reject(err)
                })
        }),

    // Return specific card by id
    byCardId: (cardId) =>
        new Promise((resolve, reject) => {
            // Setup query
            const query = `SELECT c.card_id, c.username, c.network, c.language,
    c.received, CASE WHEN r.card_id IS NOT NULL THEN
      json_build_object('created_at', r.created_at, 'disaster_type',
      r.disaster_type, 'text', r.text, 'card_data', r.card_data, 'image_url',
      r.image_url, 'status', r.status)
    ELSE null END AS report
    FROM ${config.TABLE_GRASP_CARDS} c
    LEFT JOIN ${config.TABLE_GRASP_REPORTS} r USING (card_id)
    WHERE c.card_id = ?
    LIMIT 1`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                replacements: [cardId],
            })
                .then((data) => resolve(...data))
                /* istanbul ignore next */
                .catch((err) => {
                    console.log('🚀 ~ file: model.js ~ line 81 ~ newPromise ~ err', err)
                    /* istanbul ignore next */
                    reject(err)
                })
        }),

    // All just expired report cards
    expiredCards: () =>
        new Promise((resolve, reject) => {
            // eslint-disable-next-line max-len
            const query = `SELECT c.card_id, c.username, c.network, c.language, c.network_data,
    c.received, CASE WHEN r.card_id IS NOT NULL THEN
      json_build_object('created_at', r.created_at, 'disaster_type',
      r.disaster_type, 'text', r.text, 'is_training' , r.is_training 'card_data', r.card_data, 'image_url',
      r.image_url, 'status', r.status)
    ELSE null END AS report
    FROM ${config.TABLE_GRASP_CARDS} c
    LEFT JOIN ${config.TABLE_GRASP_REPORTS} r USING (card_id)
    WHERE ((r.disaster_type = 'flood' AND r.created_at >= to_timestamp(?) AND r.created_at <= to_timestamp(?) )
    OR (r.disaster_type = 'earthquake' AND r.created_at >= to_timestamp(?) AND r.created_at <= to_timestamp(?) )
    OR (r.disaster_type = 'wind' AND r.created_at >= to_timestamp(?) AND r.created_at <= to_timestamp(?) )
    OR (r.disaster_type = 'haze' AND r.created_at >= to_timestamp(?) AND r.created_at <= to_timestamp(?) )
    OR (r.disaster_type = 'volcano' AND r.created_at >= to_timestamp(?) AND r.created_at <= to_timestamp(?) )
    OR (r.disaster_type = 'fire' AND r.created_at >= to_timestamp(?)) AND r.created_at <= to_timestamp(?) )`
            const now = Date.now() / 1000
            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                replacements: [
                    now - config.FLOOD_REPORTS_TIME_WINDOW,
                    now - config.FLOOD_REPORTS_TIME_WINDOW + 1800,
                    now - config.EQ_REPORTS_TIME_WINDOW,
                    now - config.EQ_REPORTS_TIME_WINDOW + 1800,
                    now - config.WIND_REPORTS_TIME_WINDOW,
                    now - config.WIND_REPORTS_TIME_WINDOW + 1800,
                    now - config.HAZE_REPORTS_TIME_WINDOW,
                    now - config.HAZE_REPORTS_TIME_WINDOW + 1800,
                    now - config.VOLCANO_REPORTS_TIME_WINDOW,
                    now - config.VOLCANO_REPORTS_TIME_WINDOW + 1800,
                    now - config.FIRE_REPORTS_TIME_WINDOW,
                    now - config.FIRE_REPORTS_TIME_WINDOW + 1800,
                ],
            })
                .then((data) => resolve(data))
                /* istanbul ignore next */
                .catch((err) => {
                    /* istanbul ignore next */
                    reject(err)
                })
        }),

    // Add entry to the reports table and then update the card record accordingly
    submitReport: (card, body) =>
        new Promise((resolve, reject) => {
            const partnerCode = body.partnerCode || null
            // Log queries to debugger
            //   for (let query of queries) logger.debug(query.query, query.values);

            // Execute in a transaction as both INSERT and UPDATE must happen together
            const queries = [
                {
                    query: `INSERT INTO ${config.TABLE_GRASP_REPORTS}
              (card_id, card_data, text, created_at, disaster_type,is_training,
                partner_code, status,
                the_geom)
              VALUES (?, ? , COALESCE(?,null),? , COALESCE(?,null), COALESCE(?,null), COALESCE(?,null),  ?,
              ST_SetSRID(ST_Point(?,?),4326))`,
                    type: QueryTypes.INSERT,
                    replacements: [
                        card.card_id,
                        JSON.stringify(body.card_data),
                        body.text,
                        body.created_at,
                        body.disaster_type,
                        body.is_training || false,
                        partnerCode,
                        'Confirmed',
                        body.location.lng,
                        body.location.lat,
                    ],
                },
                {
                    query: `UPDATE ${config.TABLE_GRASP_CARDS}
              SET received = TRUE WHERE card_id = ?`,
                    type: QueryTypes.UPDATE,
                    replacements: [card.card_id],
                },
                {
                    query: `INSERT INTO ${config.TABLE_GRASP_LOG}
            (card_id, event_type)
            VALUES (?,?)`,
                    type: QueryTypes.INSERT,
                    replacements: [card.card_id, 'REPORT SUBMITTED'],
                },
            ]

            // Log queries to debugger
            //   for (let query of queries) logger.debug(query.query, query.values);

            // Execute in a transaction as both INSERT and UPDATE must happen together
            try {
                db.transaction(async (transaction) => {
                    for (const query of queries) {
                        await db.query(query.query, {
                            type: query.type,
                            replacements: query.replacements,
                            transaction,
                        })
                    }
                })
                    .then(() => {
                        return (
                            db
                                .query('SELECT * FROM grasp.push_to_all_reports(?) as notify', {
                                    type: QueryTypes.SELECT,
                                    replacements: [card.card_id],
                                })
                                .then((notify) => {
                                    const notifyData = JSON.parse(notify[0].notify) || {}
                                    notifyData.tweetID = body.tweetID || ''
                                    resolve(notifyData)
                                })
                                /* istanbul ignore next */
                                .catch((err) => {
                                    console.log('🚀 ~ file: model.js ~ line 81 ~ newPromise ~ err', err)
                                    /* istanbul ignore next */
                                    reject(err)
                                })
                        )
                    })
                    .catch((err) => {
                        console.log('🚀 ~ file: model.js ~ line 213 ~ returndb.transaction ~ err', err)
                        reject(err)
                        // transaction.rollback();
                    })
            } catch (error) {
                console.log('🚀 ~ file: model.js ~ line 197 ~ db.transaction ~ error', error)
            }
        }),

    // Update the reports table with new report details
    updateReport: (card, body) =>
        new Promise((resolve, reject) => {
            // Setup our queries
            const queries = [
                {
                    query: `UPDATE ${config.TABLE_GRASP_REPORTS} SET
        image_url = COALESCE(?, null)
        WHERE card_id = ?`,
                    type: QueryTypes.UPDATE,
                    replacements: [body.image_url, card.card_id],
                },
                {
                    query: `INSERT INTO ${config.TABLE_GRASP_LOG}
            (card_id, event_type)
            VALUES (?, ?)`,
                    type: QueryTypes.INSERT,
                    replacements: [card.card_id, 'REPORT UPDATE (PATCH)'],
                },
            ]

            // Log queries to debugger
            //   for (let query of queries) logger.debug(query.query, query.values);

            // Execute in a transaction as both INSERT and UPDATE must happen together
            try {
                db.transaction(async (transaction) => {
                    for (const query of queries) {
                        await db.query(query.query, {
                            type: query.type,
                            replacements: query.replacements,
                            transaction,
                        })
                    }
                })
                    .then((data) => {
                        resolve(data)
                    })
                    .catch((err) => {
                        console.log('🚀 ~ file: model.js:271 ~ newPromise ~ err', err)
                        reject(err)
                    })
            } catch (error) {
                console.log('🚀 ~ file: model.js:263 ~ db.transaction ~ error', error)
                reject(error)
                // transaction.rollback();
            }
        }),

    reports: () =>
        new Promise((resolve, reject) => {
            // Setup query
            const query = `SELECT disaster_type, report_data, tags, created_at, is_training
			FROM ${config.TABLE_REPORTS}
			WHERE (
				(disaster_type = 'flood' AND created_at >= to_timestamp($1))
				OR (disaster_type = 'earthquake' AND created_at >= to_timestamp($2))
				OR (disaster_type = 'wind' AND created_at >= to_timestamp($3))
				OR (disaster_type = 'typhoon' AND created_at >= to_timestamp($4))
				OR (disaster_type = 'haze' AND created_at >= to_timestamp($5))
				OR (disaster_type = 'volcano' AND created_at >= to_timestamp($6))
				OR (disaster_type = 'fire' AND created_at >= to_timestamp($7))
			)`

            const floodTimeWindow = Date.now() / 1000 - config.FLOOD_REPORTS_TIME_WINDOW
            const eqTimeWindow = Date.now() / 1000 - config.EQ_REPORTS_TIME_WINDOW
            const hazeTimeWindow = Date.now() / 1000 - config.HAZE_REPORTS_TIME_WINDOW
            const windTimeWindow = Date.now() / 1000 - config.WIND_REPORTS_TIME_WINDOW
            const typhoonTimeWindow = Date.now() / 1000 - config.WIND_REPORTS_TIME_WINDOW
            const volcanoTimeWindow = Date.now() / 1000 - config.VOLCANO_REPORTS_TIME_WINDOW
            const fireTimeWindow = Date.now() / 1000 - config.FIRE_REPORTS_TIME_WINDOW

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [
                    floodTimeWindow,
                    eqTimeWindow,
                    hazeTimeWindow,
                    windTimeWindow,
                    typhoonTimeWindow,
                    volcanoTimeWindow,
                    fireTimeWindow,
                ],
            })
                .then((data) => {
                    resolve(data)
                })
                .catch((err) => {
                    console.log('🚀 ~ file: model.js ~ line 81 ~ newPromise ~ err', err)
                    /* istanbul ignore next */
                    reject(err)
                })
        }),
})

module.exports = cards
