/**
 * CogniCity Server /feeds data model
 * @module src/api/partners/model
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
const partners = (config, db) => ({
    // Add a new partner
    addNewPartner: (body) =>
        new Promise((resolve, reject) => {
            const sql = `
      INSERT INTO ${config.TABLE_COGNICITY_PARTNERS} (partner_code, partner_name, partner_icon)
      VALUES ('${body.partner_code}', '${body.partner_name}', '${body.partner_icon}');
    `
            db.query(sql, {
                type: QueryTypes.INSERT,
            })
                .then(() => {
                    resolve({ partner_code: body.partner_code, created: true })
                })
                .catch((err) => {
                    reject(err)
                })
        }),

    fetchAllPartners: () =>
        new Promise((resolve, reject) => {
            try {
                const users = db.query(
                    `SELECT * FROM ${config.TABLE_COGNICITY_PARTNERS}`,
                    {
                        type: QueryTypes.SELECT,
                    }
                )
                resolve(users)
            } catch (err) {
                reject(err)
            }
        }),

    getById: (value) =>
        new Promise((resolve, reject) => {
            // Setup query
            let id = value.id

            const query = `SELECT * FROM ${config.TABLE_COGNICITY_PARTNERS}
        WHERE id = $1`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [id],
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

    getByCode: (value) =>
        new Promise((resolve, reject) => {
            // Setup query
            let partner_code = value.partner_code

            const users = `SELECT * FROM ${config.TABLE_COGNICITY_PARTNERS}
        WHERE partner_code = ?`

            // Execute
            db.query(users, {
                type: QueryTypes.UPDATE,
                replacements: [partner_code],
            })
                .then((data) => {
                    resolve(...data)
                })
                /* istanbul ignore next */
                .catch((err) => {
                    /* istanbul ignore next */
                    reject(err)
                })
        }),

    updateRecord: (data, param) =>
        new Promise((resolve, reject) => {
            // Setup query
            let partner_name = data.partner_name ? data.partner_name : null
            let partner_code = data.partner_code ? data.partner_code : null
            let partner_status =
                data.partner_status !== undefined ? data.partner_status : null
            let partner_icon = data.partner_icon ? data.partner_icon : null

            const query = `UPDATE ${config.TABLE_COGNICITY_PARTNERS}
      SET partner_name = COALESCE(?, partner_name)  , partner_code = COALESCE(?, partner_code) , partner_status = COALESCE(?, partner_status) , partner_icon = COALESCE(?, partner_icon)  WHERE id = ${param.id}`
            // Execute
            db.query(query, {
                type: QueryTypes.UPDATE,
                replacements: [
                    partner_name,
                    partner_code,
                    partner_status,
                    partner_icon,
                ],
            })
                .then(() => {
                    resolve({ update: true })
                })
                .catch((err) => {
                    reject(err)
                })
        }),
})

module.exports = partners
