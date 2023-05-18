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
			let query = `SELECT id, status , need_user_id , quantity_requested , item_requested , quantity_satisfied , giver_user_id , promised_date , promised_time , created_date, ST_AsBinary(the_geom)
      FROM ${config.TABLE_LOGISTICS_NEEDS}`

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
			let query = `SELECT id, status , need_user_id , quantity_requested , item_requested , quantity_satisfied , giver_user_id , promised_date , promised_time , created_date , need_language , giver_language
      					 FROM ${config.TABLE_LOGISTICS_NEEDS} WHERE id = $1`

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

	updateNeed: (body, value) =>
		new Promise((resolve, reject) => {
			const status = body?.status || null
			const need_user_id = body?.need_user_id || null
			const quantity_requested = body?.quantity_requested || null
			const item_requested = body?.item_requested || null
			const quantity_satisfied = body?.quantity_satisfied || null
			const giver_user_id = body?.giver_user_id || null
			const promised_date = body?.promised_date || null
			const promised_time = body?.promised_time || null
			const giver_language = body?.giver_language || null
			// Setup query
			let query = `UPDATE  ${config.TABLE_LOGISTICS_NEEDS} SET  status = COALESCE($1,status) , need_user_id = COALESCE($2,need_user_id) , quantity_requested = COALESCE($3,quantity_requested) , item_requested = COALESCE($4,item_requested) , quantity_satisfied = COALESCE($5,quantity_satisfied) , giver_user_id = COALESCE($6,giver_user_id) , promised_date = COALESCE($7,promised_date) , promised_time = COALESCE($8,promised_time) , giver_language = COALESCE($9,giver_language) WHERE id = ${value.id}`

			// Execute
			db.query(query, {
				type: QueryTypes.UPDATE,
				bind: [
					status,
					need_user_id,
					quantity_requested,
					item_requested,
					quantity_satisfied,
					giver_user_id,
					promised_date,
					promised_time,
					giver_language,
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

	addNewNeedReport: (body) => {
		return new Promise((resolve, reject) => {
			let query = `
          INSERT INTO ${config.TABLE_LOGISTICS_NEEDS} (status , need_user_id , quantity_requested , quantity_satisfied , giver_user_id , promised_date , item_requested , need_language ,  the_geom)
          VALUES (COALESCE($1,null) , COALESCE($2,null) , COALESCE($3,null) , COALESCE($4,null) , COALESCE($5, null) , COALESCE($6, null) ,  COALESCE($7, null) , COALESCE($8, null) , ST_SetSRID(ST_Point($9,$10),4326));
        `
			// Execute
			db.query(query, {
				type: QueryTypes.INSERT,
				bind: [
					body?.status || null,
					body?.need_user_id || null,
					body?.quantity_requested || null,
					body?.quantity_satisfied || null,
					body?.giver_user_id || null,
					body?.promised_date || null,
					body?.item_requested || null,
					body?.need_language || null,
					body?.lng || null,
					body?.lat || null,
				],
			})
				.then((data) => {
					console.log('🚀 ~ file: model.js:107 ~ .then ~ data:', data)
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

module.exports = needs
