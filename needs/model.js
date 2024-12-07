'use strict'
/**
 * CogniCity Server /infrastructure data model
 * @module src/api/needs/model
 **/
const { QueryTypes } = require('@sequelize/core')
/**
 * Methods to get infrastructure layers from database
 * @alias module:src/api/needs/model
 * @param {Object} config Server configuration
 * @param {Object} db PG Promise database instance
 * @return {Object} Query methods
 */

const needs = (config, db) => ({
    // A list of all infrastructure matching a given type
    all: () =>
        new Promise((resolve, reject) => {
            // Setup query
            const query = `SELECT 
            ${config.TABLE_LOGISTICS_NEEDS}.id, 
            ${config.TABLE_LOGISTICS_NEEDS}.created_date,  
            ${config.TABLE_LOGISTICS_NEEDS}.need_user_id, 
            ${config.TABLE_LOGISTICS_NEEDS}.status,
            ${config.TABLE_LOGISTICS_NEEDS}.quantity_requested, 
            ${config.TABLE_LOGISTICS_NEEDS}.item_requested, 
            ${config.TABLE_LOGISTICS_GIVER_DETAILS}.quantity_satisfied, 
            ${config.TABLE_LOGISTICS_GIVER_DETAILS}.promised_date,
            ${config.TABLE_LOGISTICS_GIVER_DETAILS}.promised_time, 
            ${config.TABLE_LOGISTICS_GIVER_DETAILS}.giver_id, 
            ST_AsBinary(${config.TABLE_LOGISTICS_NEEDS}.the_geom)
        FROM 
            ${config.TABLE_LOGISTICS_GIVER_DETAILS} 
        RIGHT JOIN  
            ${config.TABLE_LOGISTICS_NEEDS} 
        ON 
            ${config.TABLE_LOGISTICS_NEEDS}.id = ${config.TABLE_LOGISTICS_GIVER_DETAILS}.need_id
        WHERE 
            ${config.TABLE_LOGISTICS_NEEDS}.created_date >= NOW() - INTERVAL $1;
            `

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [config.API_NEEDS_TIME_WINDOW_MAX]
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

    getByNeedId: (value) =>
        new Promise((resolve, reject) => {
            // Setup query
            const query = `SELECT ${config.TABLE_LOGISTICS_NEEDS}.id, ${config.TABLE_LOGISTICS_NEEDS}.need_user_id , ${config.TABLE_LOGISTICS_NEEDS}.quantity_requested  , ${config.TABLE_LOGISTICS_NEEDS}.need_language , ${config.TABLE_LOGISTICS_NEEDS}.item_requested , ${config.TABLE_LOGISTICS_NEEDS}.status , 
			${config.TABLE_LOGISTICS_GIVER_DETAILS}.quantity_satisfied, ${config.TABLE_LOGISTICS_GIVER_DETAILS}.promised_date , ${config.TABLE_LOGISTICS_GIVER_DETAILS}.promised_time , ${config.TABLE_LOGISTICS_GIVER_DETAILS}.giver_id , ${config.TABLE_LOGISTICS_GIVER_DETAILS}.giver_language
			FROM ${config.TABLE_LOGISTICS_GIVER_DETAILS} RIGHT JOIN  ${config.TABLE_LOGISTICS_NEEDS} ON ${config.TABLE_LOGISTICS_NEEDS}.id=${config.TABLE_LOGISTICS_GIVER_DETAILS}.need_id WHERE id = $1`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [value?.id],
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

    addNewNeedReport: async (body) => {
        try {
            const queryForNeedReports = `INSERT INTO ${config.TABLE_LOGISTICS_NEEDS} (status , quantity_requested , item_requested , need_language , need_user_id , the_geom)
			  VALUES (COALESCE($1,null) , COALESCE($2,null) , COALESCE($3,null) , COALESCE($4,null) , (select user_id from logistics.user_table where user_id=$5 AND user_type='need') , ST_SetSRID(ST_Point($6,$7),4326));`

            const userId = await checkIfUserExists(db, body)

            // Execute
            const data = await db.query(queryForNeedReports, {
                type: QueryTypes.INSERT,
                bind: [
                    body?.status || null,
                    body?.quantity_requested || null,
                    body?.item_requested || null,
                    body?.need_language || null,
                    userId,
                    body?.lng || null,
                    body?.lat || null,
                ],
            })
            return data
        } catch (e) {
            console.log('error while creating need report', e)
            throw e
        }
    },

    updateNeed: (body, value) =>
        new Promise((resolve, reject) => {
            const status = body?.status || null
            const needUserId = body?.need_user_id || null
            const quantityRequested = body?.quantity_requested || null
            const itemRequested = body?.item_requested || null
            // Setup query
            const query = `UPDATE  ${config.TABLE_LOGISTICS_NEEDS} SET  status = COALESCE($1,status) , need_user_id = COALESCE($2,need_user_id) , quantity_requested = COALESCE($3,quantity_requested) , item_requested = COALESCE($4,item_requested) WHERE id = ${value.id}`

            // Execute
            db.query(query, {
                type: QueryTypes.UPDATE,
                bind: [status, needUserId, quantityRequested, itemRequested],
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

    addGiverReport: async (body) => {
        try {
            const queryForGiverDetails = `INSERT INTO ${config.TABLE_LOGISTICS_GIVER_DETAILS} (
					quantity_satisfied,
					promised_date,
					promised_time,
					giver_language,
					need_id,
					giver_id
				)
				VALUES (
					COALESCE($1, null),
					COALESCE($2, null),
					COALESCE($3, null),
					COALESCE($4, null),
					COALESCE($5::integer, null),
					(
						SELECT user_id
						FROM logistics.user_table
						WHERE user_id = $6
							AND user_type = 'giver'
					)
				);`

            const userId = await checkIfUserExists(db, body)
            console.log('What is the user id', userId)

            // Execute the query
            const data = await db.query(queryForGiverDetails, {
                type: QueryTypes.INSERT,
                bind: [
                    body?.quantity_satisfied || null,
                    body?.promised_date || null,
                    body?.promised_time || null,
                    body?.giver_language || null,
                    body?.need_id,
                    userId,
                ],
            })

            return data
        } catch (err) {
            console.log('Error inserting', err)
            throw err // Rethrow the error to be handled by the caller
        }
    },
})

const checkIfUserExists = async (db, body) => {
    // eslint-disable-next-line camelcase
    const [{ user_id }] = await queryUserId(db, body)
    let userId
    // eslint-disable-next-line camelcase
    if (user_id?.length > 0) {
        userId = body.user_id
    } else {
        userId = await addUser(db, body)
    }
    return userId
}

const addUser = (db, body) => {
    return new Promise((resolve, reject) => {
        const queryForUserTable =
            'INSERT INTO logistics.user_table (user_id , platform , user_type) VALUES (COALESCE($1,null) , COALESCE($2,null) , COALESCE($3,null)) RETURNING user_id;'
        db.query(queryForUserTable, {
            type: QueryTypes.INSERT,
            bind: [body?.user_id || null, body?.platform || null, body?.user_type || null],
        })
            .then((data) => {
                // eslint-disable-next-line camelcase
                const [[{ user_id }]] = data
                resolve(user_id)
            })
            .catch((err) => {
                console.log('error here', err)
                reject(err)
            })
    })
}

const queryUserId = (db, body) => {
    return new Promise((resolve, reject) => {
        const queryForUserTable = 'SELECT user_id FROM logistics.user_table WHERE user_id=$1 AND user_type=$2;'
        db.query(queryForUserTable, {
            type: QueryTypes.SELECT,
            bind: [body?.user_id, body?.user_type],
        })
            .then((data) => {
                if (!data.length > 0) resolve([{ user_id: data }])
                resolve(data)
            })
            .catch((err) => {
                console.log('error here', err)
                reject(err)
            })
    })
}

module.exports = needs
