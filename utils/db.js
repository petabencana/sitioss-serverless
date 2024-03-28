'use strict'
const config = require('../config')
const { Sequelize } = require('sequelize')
const pg = require('pg')

const user = config.PGUSER
const host = config.PGHOST
const database = config.PGDATABASE
const password = config.PGPASSWORD
const port = config.PGPORT
const db = new Sequelize(database, user, password, {
    dialect: 'postgres',
    dialectModule: pg,
    host,
    port,

    // Comment out this snippet incase of running it on local
    dialectOptions: {
        ssl: {
            require: config.PGSSL,
            rejectUnauthorized: false,
        },
    },
})
module.exports = db
