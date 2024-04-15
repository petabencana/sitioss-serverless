/**
 * CogniCity Server /floods data model
 * @module src/api/floods/model
 **/
const { QueryTypes } = require('@sequelize/core')

/**
 * Methods to interact with flood layers in database
 * @alias module:src/api/floods/model
 * @param {Object} config Server configuration
 * @param {Object} db PG Promise database instance
 * @return {Object} Query methods
 */
const floods = (config, db) => ({
    // Get all flooded areas for a given admin boundaries
    all: (admin, minimumState) =>
        new Promise((resolve, reject) => {
            // Setup query
            let query = `SELECT local_area as area_id, state, last_updated
      FROM ${config.TABLE_REM_STATUS} status, ${config.TABLE_LOCAL_AREAS} area
      WHERE status.local_area = area.pkey
      AND state IS NOT NULL AND ($2 IS NULL OR state >= $2)
      AND ($1 IS NULL OR area.instance_region_code=$1)`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [admin, minimumState],
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

    // Get all flooded areas for a given admin boundary
    allGeo: (admin, minimumState, parent) =>
        new Promise((resolve, reject) => {
            // Setup query
            let query = `SELECT ST_AsBinary(la.the_geom), la.pkey as area_id, la.geom_id,
      la.area_name, la.parent_name, la.city_name, la.attributes,
      rs.state, rs.last_updated
      FROM ${config.TABLE_LOCAL_AREAS} la
      ${minimumState ? 'JOIN' : 'LEFT JOIN'}
      (SELECT local_area, state, last_updated FROM ${config.TABLE_REM_STATUS}
      WHERE state IS NOT NULL AND ($2::integer IS NULL OR state >= $2)) rs
      ON la.pkey = rs.local_area
      WHERE ($1::text IS NULL OR instance_region_code = $1) AND ($3::text IS NULL OR parent_name = $3)`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [admin, minimumState, parent],
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

    allGeoRw: (admin, minimumState, parent) =>
        new Promise((resolve, reject) => {
            // Setup query
            let query = `SELECT ST_AsBinary(la.the_geom), la.pkey as area_id, la.geom_id,
      la.area_name, la.parent_name, la.city_name, la.attributes,
      rs.state, rs.last_updated
      FROM ${config.TABLE_LOCAL_AREAS_RW} la
      ${minimumState ? 'JOIN' : 'LEFT JOIN'}
      (SELECT local_area, state, last_updated FROM ${config.TABLE_REM_STATUS}
      WHERE state IS NOT NULL AND ($2 IS NULL OR state >= $2)) rs
      ON la.pkey = rs.local_area
      WHERE ($1 IS NULL OR instance_region_code = $1) AND ($3 IS NULL OR parent_name = $3)`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [admin, minimumState, parent],
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

    // Get all places in a given admin boundary

    allPlaces: (admin) =>
        new Promise((resolve, reject) => {
            // Setup query
            let query = `SELECT pkey, attributes->>'District' as District, area_name as code, parent_name as Village, city_name as SubDistrict,
      instance_region_code 
      FROM ${config.TABLE_LOCAL_AREAS}
      WHERE ($1 IS NULL OR instance_region_code = $1)`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [admin],
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

    // Get local area by geomid

    placeByGeomId: (geomid) =>
        new Promise((resolve, reject) => {
            // Setup query
            let query = `SELECT pkey, attributes->>'District' as District, area_name as code, parent_name, city_name,
      instance_region_code 
      FROM ${config.TABLE_LOCAL_AREAS}
      WHERE ($1 IS NULL OR geom_id = $1)`

            // Execute
            db.query(query, {
                type: QueryTypes.SELECT,
                bind: [geomid],
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

    // Update the REM state and append to the log
    updateREMState: (localAreaId, state, username) =>
        new Promise((resolve, reject) => {
            // Setup a timestamp with current date/time in ISO format
            let timestamp = new Date().toISOString()

            // Setup our queries
            let queries = [
                {
                    query: `INSERT INTO ${config.TABLE_REM_STATUS}
            ( local_area, state, last_updated )
            VALUES ( $1, $2, $3 )
            ON CONFLICT (local_area) DO
            UPDATE SET state=$2, last_updated=$3`,
                    type: QueryTypes.INSERT,
                    bind: [localAreaId, state, timestamp],
                },
                {
                    query: `INSERT INTO ${config.TABLE_REM_STATUS_LOG}
          ( local_area, state, changed, username )
          VALUES ( $1, $2, $3, $4 )`,
                    type: QueryTypes.INSERT,
                    bind: [localAreaId, state, timestamp, username],
                },
            ]

            // Log queries to debugger
            db.transaction(async (transaction) => {
                try {
                    for (let query of queries) {
                        await db.query(query.query, {
                            type: query.type,
                            replacements: query.replacements,
                            transaction,
                        })
                    }
                } catch (error) {
                    reject(error)
                    transaction.rollback()
                }
            })
                .then((data) => {
                    resolve(data)
                })
                .catch((err) => {
                    reject(err)
                })
        }),

    // Remove the REM state record and append to the log
    clearREMState: (localAreaId, username) =>
        new Promise((resolve, reject) => {
            // Setup a timestamp with current date/time in ISO format
            let timestamp = new Date().toISOString()

            // Setup our queries
            let queries = [
                {
                    query: `DELETE FROM ${config.TABLE_REM_STATUS}
          WHERE local_area = $1`,
                    type: QueryTypes.INSERT,
                    bind: [localAreaId],
                },
                {
                    query: `INSERT INTO ${config.TABLE_REM_STATUS_LOG}
          ( local_area, state, changed, username )
          VALUES ( $1, $2, $3, $4 )`,
                    type: QueryTypes.INSERT,
                    bind: [localAreaId, null, timestamp, username],
                },
            ]

            // Log queries to debugger
            db.transaction(async (transaction) => {
                try {
                    for (let query of queries) {
                        await db.query(query.query, {
                            type: query.type,
                            replacements: query.replacements,
                            transaction,
                        })
                    }
                } catch (error) {
                    reject(error)
                    transaction.rollback()
                }
            })
                .then((data) => {
                    resolve(data)
                })
                .catch((err) => {
                    reject(err)
                })
        }),
})

module.exports = floods
