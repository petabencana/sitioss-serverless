/**
 * CogniCity Server /floodgauges data model
 * @module src/api/floodgauges/model
 **/
const { QueryTypes } = require('@sequelize/core')
const {
    TABLE_SUBSCRIPTIONS,
    TABLE_SUBSCRIPTIONS_REGIONS,
} = require('../config')

/**
 * Methods to get floodgauges layers from database
 * @alias module:src/api/floodgauges/model
 * @param {Object} config Server configuration
 * @param {Object} db PG Promise database instance
 * @return {Object} Query methods
 */
const subscriptions = (config, db, logger) => ({
    all: (start = null, end = null, city = null) => {
        return new Promise((resolve, reject) => {
            // Setup query
            let query = `
            SELECT COUNT(DISTINCT s.user_id) AS unique_user_count, COUNT(DISTINCT rd.region_code) AS unique_region_count
            FROM ${config.TABLE_SUBSCRIPTIONS} AS s JOIN ${config.TABLE_SUBSCRIPTIONS_REGIONS} AS rd ON s.user_id = rd.subscription_id WHERE 
            ($1::timestamp with time zone IS NULL OR s.created_at >= $1::timestamp with time zone)
            AND ($2::timestamp with time zone IS NULL OR s.created_at <= $2::timestamp with time zone)
            AND ($3::text IS NULL OR rd.region_code = $3::text)`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [start, end, city],
            })
                .then((data) => {
                    console.log('🚀 ~ returnnewPromise ~ data:', data)
                    resolve(data)
                })
                /* istanbul ignore next */
                .catch((err) => {
                    console.log('errror here', err)
                    /* istanbul ignore next */
                    reject(err)
                })
        })
    },

    getByRegion: (value) =>
        new Promise((resolve, reject) => {
            // Setup query
            let query = `SELECT COUNT(*) AS entry_count FROM ${config.TABLE_SUBSCRIPTIONS_REGIONS} WHERE region_code = ? AND created_at >= $1::timestamp with time zone
            AND created_at <= $2::timestamp with time zone`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                replacements: [value.region],
            })
                .then((data) => {
                    resolve(data[0]['entry_count'])
                })
                /* istanbul ignore next */
                .catch((err) => {
                    /* istanbul ignore next */
                    reject(err)
                })
        }),

    fetchSubscriptions: () =>
        new Promise((resolve, reject) => {
            // Setup query
            let query = `SELECT s.user_id, s.language_code, ARRAY_AGG(wr.region_code) AS region_codes FROM ${TABLE_SUBSCRIPTIONS} s INNER JOIN ${TABLE_SUBSCRIPTIONS_REGIONS} wr ON s.user_id = wr.subscription_id GROUP BY s.user_id, s.language_code;`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
            })
                .then((data) => {
                    const regionCodesArray = [
                        ...data.map((row) => ({
                            userId: row.user_id,
                            languageCode: row.language_code,
                            regionCodes: row.region_codes,
                        })),
                    ]
                    resolve(regionCodesArray)
                })
                /* istanbul ignore next */
                .catch((err) => {
                    /* istanbul ignore next */
                    reject(err)
                })
        }),

    fetchByUserId: (userId) =>
        new Promise((resolve, reject) => {
            // Setup query
            let query = `SELECT COUNT(*) AS entry_count FROM ${config.TABLE_SUBSCRIPTIONS} WHERE user_id = ?`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                replacements: [userId],
            })
                .then((data) => {
                    resolve(data[0]['entry_count'])
                })
                /* istanbul ignore next */
                .catch((err) => {
                    /* istanbul ignore next */
                    reject(err)
                })
        }),

    addNewSubscription: async (body) => {
        const userId = body.userId
        const regionCodes = body.regions
        const language = body.language
        const subscriptionAvailable = await subscriptions(
            config,
            db,
            logger
        ).fetchByUserId(userId)
        if (subscriptionAvailable >= 1) {
            return new Promise((resolve, reject) => {
                // Card created, update database log
                let query = `INSERT INTO ${config.TABLE_SUBSCRIPTIONS_REGIONS}
                        (subscription_id, region_code) VALUES ?`
                db.query(query, {
                    type: QueryTypes.INSERT,
                    replacements: [
                        regionCodes.map((regionCode) => [userId, regionCode]),
                    ],
                })
                    .then((data) => {
                        resolve(data)
                    })
                    .catch((err) => {
                        console.log('Error while inserting', err)
                        reject(err)
                    })
            })
        }
        return new Promise((resolve, reject) => {
            const query = `INSERT INTO  ${config.TABLE_SUBSCRIPTIONS} (user_id , is_sent , language_code) VALUES (? , ? , ?) RETURNING user_id`
            // Execute
            db.query(query, {
                type: QueryTypes.INSERT,
                replacements: [userId, false, language],
            })
                .then((data) => {
                    // Card created, update database log
                    let query = `INSERT INTO ${config.TABLE_SUBSCRIPTIONS_REGIONS}
                    (subscription_id, region_code) VALUES ?`
                    db.query(query, {
                        type: QueryTypes.INSERT,
                        replacements: [
                            regionCodes.map((regionCode) => [
                                userId,
                                regionCode,
                            ]),
                        ],
                    })
                        .then(() => {
                            resolve(data)
                        })
                        .catch((err) => {
                            console.log('Error while inserting', err)
                            reject(err)
                        })
                })
                /* istanbul ignore next */
                .catch((err) => {
                    /* istanbul ignore next */
                    reject(err)
                })
        })
    },

    addSubscriptionLog: (body, region) => {
        return new Promise((resolve, reject) => {
            let query = `
    INSERT INTO ${config.TABLE_SUBSCRIPTIONS_LOG} (database_time, user_id, social_media_type , region) VALUES ($1 , $2 , $3 , $4);`
            // Execute
            db.query(query, {
                type: QueryTypes.INSERT,
                bind: [
                    new Date().toISOString(),
                    body?.userId,
                    'whatsapp',
                    region,
                ],
            })
                .then((data) => {
                    resolve(data)
                })
                /* istanbul ignore next */
                .catch((err) => {
                    /* istanbul ignore next */
                    reject(err)
                })
        })
    },

    getSubscriptionLog: (userId, region) => {
        return new Promise((resolve, reject) => {
            let query = `SELECT * FROM ${config.TABLE_SUBSCRIPTIONS_LOG} WHERE DATE(database_time) = CURRENT_DATE AND user_id = $1 AND region = $2;`
            // Execute
            db.query(query, {
                bind: [userId, region],
            })
                .then((data) => {
                    resolve(data[0])
                })
                /* istanbul ignore next */
                .catch((err) => {
                    /* istanbul ignore next */
                    reject(err)
                })
        })
    },

    deleteSubscription: (userId) => {
        return new Promise((resolve, reject) => {
            let query = `DELETE FROM ${config.TABLE_SUBSCRIPTIONS} WHERE user_id = $1;`
            // Execute
            db.query(query, {
                type: QueryTypes.DELETE,
                bind: [userId],
            })
                .then((data) => {
                    resolve(data)
                })
                /* istanbul ignore next */
                .catch((err) => {
                    /* istanbul ignore next */
                    reject(err)
                })
        })
    },
})

module.exports = subscriptions
