/**
 * CogniCity Server /cities data model
 * @module src/api/cities/model
 **/
const { QueryTypes } = require("@sequelize/core");

/**
 * Methods to get cities data from database
 * @alias module:src/api/regions/model
 * @param {Object} config Server configuration
 * @param {Object} db PG Promise database instance
 * @return {Object} Query methods
 */
const regions = (config, db) => ({
  // A list of all infrastructure matching a given type
  all: () =>
    new Promise((resolve, reject) => {
      // Setup query
      let query = `SELECT id , region, region_code, city , ST_AsBinary(the_geom)
      FROM ${config.TABLE_REGIONS}`;

      // Execute

      db.query(query, {
        type: QueryTypes.SELECT,
      })
        .then((data) => {
          console.log("data coming" , data)
          resolve(data);
        })
        /* istanbul ignore next */
        .catch((err) => {
          /* istanbul ignore next */
          reject(err);
        });
    }),

  byID: (admin) =>
    new Promise((resolve, reject) => {
      // Setup query
      let query = `SELECT id , region, region_code, city , ST_AsBinary(the_geom)
      FROM ${config.TABLE_REGIONS}
      where gid=$1 `;

      // Execute
      db.query(query, {
        type: QueryTypes.SELECT,
        bind: [admin],
      })
        .then((data) => {
          resolve(data);
        })
        /* istanbul ignore next */
        .catch((err) => {
          /* istanbul ignore next */
          reject(err);
        });
    }),

    byRegionCode: (regionCode) =>
    new Promise((resolve, reject) => {
      // Setup query
      let query = `SELECT id , region, region_code, city
      FROM ${config.TABLE_REGIONS} WHERE region_code=$1`;

      // Execute
      db.query(query, {
        type: QueryTypes.SELECT,
        bind: [regionCode],
      })
        .then((data) => {
          resolve(data);
        })
        /* istanbul ignore next */
        .catch((err) => {
          /* istanbul ignore next */
          reject(err);
        });
    }),
});

module.exports = regions;
