'use strict'
/**
 * CogniCity Server configuration
 * @file config
 * @return {Object} Server configuration
 */
/* eslint-disable max-len */
require('dotenv').config({ silent: true })

const config = {
    DEPLOYMENT: process.env.DEPLOYMENT || 'ph',
    LOG_LEVEL: process.env.LOG_LEVEL || 'error',
    GEO_FORMAT_DEFAULT: process.env.GEO_FORMAT_DEFAULT || 'topojson',
    GEO_FORMATS: (process.env.GEO_FORMATS || 'geojson,topojson').split(','),
    GEO_PRECISION: process.env.GEO_PRECISION || 10,
    APP_NAME: process.env.APP_NAME || 'cognicity-serverless',
    AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || 'https://data.petabencana.id',
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID || 'auth0_client_id',
    AUTH0_ISSUER: process.env.AUTH0_ISSUER || 'https://petabencana.au.auth0.com',
    AUTH0_SECRET: process.env.AUTH0_SECRET || 'secret',
    AWS_REGION: 'ap-southeast-1',
    AWS_S3_ACCESS_KEY_ID: process.env.AWS_S3_ACCESS_KEY_ID || '',
    AWS_S3_SECRET_ACCESS_KEY: process.env.AWS_S3_SECRET_ACCESS_KEY || '',
    AWS_S3_SIGNATURE_VERSION: process.env.AWS_SIGNATURE_VERSION || 'v4',
    FLOOD_REPORTS_TIME_WINDOW: process.env.FLOOD_REPORTS_TIME_WINDOW || 10800, // 3 hr
    EQ_REPORTS_TIME_WINDOW: process.env.EQ_REPORTS_TIME_WINDOW || 43200, // 12 hr
    WIND_REPORTS_TIME_WINDOW: process.env.WIND_REPORTS_TIME_WINDOW || 7200, // 2 hr
    HAZE_REPORTS_TIME_WINDOW: process.env.HAZE_REPORTS_TIME_WINDOW || 21600, // 6 hr
    VOLCANO_REPORTS_TIME_WINDOW: process.env.VOLCANO_REPORTS_TIME_WINDOW || 43200, // 12 hr
    FIRE_REPORTS_TIME_WINDOW: process.env.FIRE_REPORTS_TIME_WINDOW || 21600, // 6 hr
    API_REPORTS_TIME_WINDOW: process.env.API_REPORTS_TIME_WINDOW || 3600,
    API_REPORTS_TIME_WINDOW_MAX: process.env.API_REPORTS_TIME_WINDOW_MAX || 18748800, // 1m
    CACHE_DURATION_FLOODS: process.env.CACHE_DURATION_FLOODS || '1 hour',
    CACHE_DURATION_FLOODS_STATES: process.env.CACHE_DURATION_FLOODS_STATES || '1 hour',
    CACHE_DURATION_INFRASTRUCTURE: process.env.CACHE_DURATION_INFRASTRUCTURE || '1 hour',
    IMAGES_BUCKET: process.env.IMAGES_BUCKET || 'petabencana-image-uploads',
    PARTNER_IMAGES_BUCKET: process.env.PARTNER_IMAGES_BUCKET || 'petabencana-partner-images',
    IMAGES_HOST: process.env.IMAGES_HOST || 'images.petabencana.id',
    API_REPORTS_LIMIT: process.env.API_REPORTS_LIMIT,
    API_FLOODGAUGE_REPORTS_TIME_WINDOW: process.env.API_FLOODGAUGE_REPORTS_TIME_WINDOW || 43200,
    API_FLOODGAUGE_REPORTS_LIMIT: process.env.API_FLOODGAUGE_REPORTS_LIMIT,
    NOTIFY_API_KEY: process.env.NOTIFY_API_KEY || '',
    NOTIFY_ENDPOINT: process.env.NOTIFY_ENDPOINT || 'api.petabencana.id/notify',
    PGHOST: process.env.PGHOST || '127.0.0.1',
    PGDATABASE: process.env.PGDATABASE || 'cognicity',
    PGPASSWORD: process.env.PGPASSWORD || 'postgres',
    PGPORT: process.env.PGPORT || 5432,
    PGSSL: process.env.PGSSL === 'true' || false,
    PGTIMEOUT: process.env.PGTIMEOUT || 10000,
    PGUSER: process.env.PGUSER || 'postgres',
    PORT: process.env.PORT || 8001,
    TABLE_FEEDS_QLUE: process.env.TABLE_FEEDS_QLUE || 'qlue.reports',
    TABLE_FEEDS_DETIK: process.env.TABLE_FEEDS_DETIK || 'detik.reports',
    TABLE_GRASP_CARDS: process.env.TABLE_GRASP_CARDS || 'grasp.cards',
    TABLE_GRASP_LOG: process.env.TABLE_GRASP_LOG || 'grasp.log',
    TABLE_GRASP_REPORTS: process.env.TABLE_GRASP_REPORTS || 'grasp.reports',
    TABLE_INSTANCE_REGIONS: process.env.TABLE_INSTANCE_REGIONS || 'cognicity.instance_regions',
    TABLE_LOCAL_AREAS: process.env.TABLE_LOCAL_AREAS || 'cognicity.local_areas',
    TABLE_LOCAL_AREAS_RW: process.env.TABLE_LOCAL_AREAS || 'cognicity.local_areas_RW',
    TABLE_REM_STATUS: process.env.TABLE_REM_STATUS || 'cognicity.rem_status',
    TABLE_REM_STATUS_LOG: process.env.TABLE_REM_STATUS_LOG || 'cognicity.rem_status_log',
    TABLE_REPORTS: process.env.TABLE_REPORTS || 'cognicity.all_reports',
    TABLE_REPORTS_POINTS_LOG: process.env.TABLE_REPORTS_LOG || 'cognicity.reports_points_log',
    TABLE_COGNICITY_PARTNERS: process.env.TABLE_COGNICITY_PARTNERS || 'cognicity.partners',
    TABLE_FLOODGAUGE_REPORTS: process.env.TABLE_FLOODGAUGE_REPORTS || 'floodgauge.reports',
    TABLE_EARTHQUAKE_REPORTS: process.env.TABLE_EARTHQUAKE_REPORTS || 'public.earthquakes_reports',
    TABLE_VOLCANO_LIST_REPORTS: process.env.TABLE_VOLCANO_LIST_REPORTS || 'volcano.list_volcano',
    TABLE_VOLCANO_LAST_ERUPTION_REPORTS: process.env.TABLE_VOLCANO_LAST_ERUPTION_REPORTS || 'volcano.lastest_eruption',
    TABLE_SUBSCRIPTIONS: process.env.TABLE_SUBSCRIPTIONS || 'subscriptions.subscriptions_table',
    TABLE_SUBSCRIPTIONS_REGIONS: process.env.TABLE_SUBSCRIPTIONS_REGIONS || 'subscriptions.region_details',
    TABLE_SUBSCRIPTIONS_LOG: process.env.TABLE_SUBSCRIPTIONS_LOG || 'subscriptions.log',
    TABLE_REGIONS: process.env.TABLE_REGIONS || 'cognicity.local_regions',
    TABLE_LOGISTICS_NEEDS: process.env.TABLE_LOGISTICS_NEEDS || 'logistics.need_reports',
    TABLE_LOGISTICS_GIVER_DETAILS: process.env.TABLE_LOGISTICS_GIVER_DETAILS || 'logistics.giver_details',
}

module.exports = config
