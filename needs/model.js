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
            let query = `SELECT 
			nr.need_request_id,
			nr.status,
			nr.created_date,
			ST_AsBinary(nr.the_geom),
			ARRAY_AGG(nr.quantity_requested) AS all_quantities_requested,
			ARRAY_AGG(nr.description) AS all_descriptions,
			ARRAY_AGG(DISTINCT nr.item_requested) AS all_items_requested,
			ARRAY_AGG(nr.units) AS all_units,
			COALESCE(SUM(CAST(gd.quantity_satisfied AS integer)), 0) AS total_quantity_satisfied
		FROM 
			${config.TABLE_LOGISTICS_NEEDS} nr
		LEFT JOIN 
			${config.TABLE_LOGISTICS_GIVER_DETAILS} gd ON gd.need_id = nr.id
		GROUP BY 
			nr.need_request_id, nr.status, nr.created_date , ST_AsBinary(nr.the_geom)
		ORDER BY nr.created_date DESC;`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
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
            let query = `SELECT 
			nd.id, 
			nd.item_id, 
			nd.need_request_id, 
			nd.description,
			nd.quantity_requested,
			ST_X(nd.the_geom) AS longitude,
			ST_Y(nd.the_geom) AS latitude,
			COALESCE(SUM(CAST(gd.quantity_satisfied AS integer)), 0) AS total_quantity_satisfied
		FROM 
			${config.TABLE_LOGISTICS_NEEDS} nd
		LEFT JOIN 
			${config.TABLE_LOGISTICS_GIVER_DETAILS} gd
			ON nd.id = gd.need_id 
		WHERE 
			nd.need_request_id = $1
		GROUP BY 
			nd.need_request_id,
			nd.id,
			nd.item_id,
			nd.description,
			nd.quantity_requested,
			ST_X(nd.the_geom),
			ST_Y(nd.the_geom);
		`
            const needRequestId = value?.requestId || null

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [needRequestId],
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

    addNewNeedReport: (reports) => {
        return new Promise(async (resolve, reject) => {
            let queryForNeedReports = `INSERT INTO ${config.TABLE_LOGISTICS_NEEDS} ("status", "quantity_requested", "item_requested", "need_language", "need_user_id", "units", "item_id", "description", "need_request_id",  "the_geom")
				VALUES `

            const values = []
            const placeholders = []
            let index = 1

            const userId = await checkIfUserExists(db, reports[0]) // As it is always one user who would be requesting for multiple items

            for (const report of reports) {
                values.push(
                    report.status,
                    report.quantity_requested,
                    report.item_requested,
                    report.need_language,
                    userId,
                    report.units,
                    report.item_id,
                    report.description || null,
                    report.need_request_id,
                    report.lng,
                    report.lat
                )
                placeholders.push(
                    `($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}, $${index + 5}, $${index + 6}, COALESCE($${
                        index + 7
                    },null), $${index + 8}, ST_SetSRID(ST_Point($${index + 9}, $${index + 10}), 4326))`
                )
                index += 11 // increment index by 11 for each report object
            }

            queryForNeedReports += placeholders.join(', ')

            try {
                const result = await db.query(queryForNeedReports, {
                    type: QueryTypes.INSERT,
                    bind: values,
                })
                resolve(result)
            } catch (err) {
                console.log('Data failed to insert in need reports', err)
                reject(err)
            }
        })
    },

    updateNeed: (body, value) =>
        new Promise((resolve, reject) => {
            const status = body?.status || null
            const need_user_id = body?.need_user_id || null
            const quantity_requested = body?.quantity_requested || null
            const item_requested = body?.item_requested || null
            // Setup query
            let query = `UPDATE  ${config.TABLE_LOGISTICS_NEEDS} SET  status = COALESCE($1,status) , need_user_id = COALESCE($2,need_user_id) , quantity_requested = COALESCE($3,quantity_requested) , item_requested = COALESCE($4,item_requested) WHERE id = ${value.id}`

            // Execute
            db.query(query, {
                type: QueryTypes.UPDATE,
                bind: [
                    status,
                    need_user_id,
                    quantity_requested,
                    item_requested,
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
        }),

    addGiverReport: (reports) => {
        try {
            return new Promise(async (resolve, reject) => {
                let queryForGiverDetails = `INSERT INTO ${config.TABLE_LOGISTICS_GIVER_DETAILS} (
					quantity_satisfied,
					item_satisfied,
					promised_date,
					promised_time,
					giver_language,
					need_id,
					giver_id
				)
				VALUES `
                const values = []
                const placeholders = []
                let index = 1

                const giverUserId = await checkIfUserExists(db, reports[0]) // As it is always one user who would be requesting for multiple items
                for (const report of reports) {
                    values.push(
                        report.quantity_satisfied,
                        report.item_satisfied,
                        report.promised_date,
                        report.promised_time,
                        report.giver_language,
                        report.need_id,
                        giverUserId
                    )
                    placeholders.push(
                        `($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}, $${index + 5} ,$${index + 6})`
                    )
                    index += 7 // increment index by 11 for each report object
                }

                queryForGiverDetails += placeholders.join(', ')
                // Execute
                db.query(queryForGiverDetails, {
                    type: QueryTypes.INSERT,
                    bind: values,
                })
                    .then((data) => {
                        resolve(data)
                    })
                    .catch((err) => {
                        console.log(
                            'Data failed to insert in need reports',
                            err
                        )
                        reject(err)
                    })
            })
        } catch (err) {
            console.log('Error inserting', err)
        }
    },
})

const checkIfUserExists = async (db, body) => {
    let [{ user_id }] = await queryUserId(db, body)
    let userId
    if (user_id?.length > 0) {
        userId = body?.user_id
    } else {
        userId = await addUser(db, body)
    }
    return userId
}

const addUser = (db, body) => {
    return new Promise((resolve, reject) => {
        let queryForUserTable = `INSERT INTO logistics.user_table (user_id , platform , user_type) VALUES (COALESCE($1,null) , COALESCE($2,null) , COALESCE($3,null)) RETURNING user_id;`
        db.query(queryForUserTable, {
            type: QueryTypes.INSERT,
            bind: [
                body?.user_id || null,
                body?.platform || null,
                body?.user_type || null,
            ],
        })
            .then((data) => {
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
        let queryForUserTable = `SELECT user_id FROM logistics.user_table WHERE user_id=$1 AND user_type=$2;`
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
