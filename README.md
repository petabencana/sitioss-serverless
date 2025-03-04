# sitioss-serverless

API Server for Siti OSS

### Summary

This is the NodeJS serverless function which is deployed uses lambda and AWS API Gateway to route the requests , which runs the Siti OSS Data API used by Disaster Map instances, such as [PetaBencana.id](https://petabencana.id) site.

### Run

1. Install requirements from the provided `package.json` by doing `npm install`.

2. Copy the `env.sample` file to a local `.env` and fill-in the required parameters. This local file will be ignored by Git and so should be secret safe. Further details on configuration are described below.

3. To run a local development instance of the server do `serverless offline start --param="service={NAME OF THE SERVICE}"`
4. Also make sure to check for the Comments in the following files which needs to be commented out for running it locally

-   `serverless.yml`
-   `utils/db.js`
-   `service.yml in the service you would like to run`

### Configuration

Server configuration parameters are stored in a configuration file which is parsed by index.js on startup. Local configuration parameters are imported from the `dev.env.yml` into `src/config.js`. See `config.js` for full details example configuration. Any variable not defined in `dev.env.yml` will pickup the default value below (also see `config.js`)—note that local environment variables will override both `.env` and `config.js`. The following environment variables are currently supported by the configurtion:

Create a dev/stage/prod.env.yml file , the database configurations are picked up from this file and any env needed for env can be added here before deploying

-   `PGHOST`: Postgres DB hostname (default: `127.0.0.1`)
-   `PGDATABASE`: Postgres DB database name (default: `cognicity`)
-   `PGPASSWORD`: Postgres DB password (default: `p@ssw0rd`)
-   `PGPORT`: Postgres DB port (default: `5432`)
-   `PGSSL`: SSL enabled on Postgres DB connection? (default: `false`)
-   `PGTIMEOUT`: Max duration on DB calls before timeout (in milliseconds) (default: `5000` i.e. 5 seconds)
-   `PGUSER`: Postgres DB username (default: `postgres`)
-   `PORT`: Which port should the application run on (default: `8001`)

-   `APP_NAME`: Name of the application (default: `cognicity-server`)
-   `API_FEEDS_QLUE_CITIES`: Names of cities used by the Qlue data feed
-   `API_FEEDS_QLUE_DISASTER_TYPES`: Names of disaster types used by the Qlue data feed
-   `API_FEEDS_DETIK_DISASTER_TYPES`: Names of disaster types used by the Detik data feed
-   `API_REPORTS_TIME_WINDOW`: Time window for report data queries (default 1 hour)
-   `API_REPORTS_TIME_WINDOW_MAX`: Maximum limit for time window (default 1 week)
-   `API_REPORTS_LIMIT`: Total maximum number of reports to return in a single request
-   `API_FLOODGAUGE_REPORTS_TIME_WINDOW`: Time window for flood data (normally 12 hours)
-   `API_FLOODGAUGE_REPORTS_TIME_WINDOW`: Total maximum number of flood gauge records to return in a single request
-   `AUTH0_AUDIENCE`: Data API to be authenticated
-   `AUTH0_CLIENT_ID`: Auth0 client ID (NOTE: this is mandatory and no default value)
-   `AUTH0_ISSUER`: Web address of Auth0 instance
-   `AWS_REGION`: Region for AWS Infrastructure
-   `AWS_S3_ACCESS_KEY_ID`: Access key ID for AWS S3 bucket
-   `AWS_S3_SECRET_ACCESS_KEY`: Access key secret for AWS S3 bucket
-   `AWS_S3_SIGNATURE_VERSION`: Version of AWS S3 signature to use
-   `AUTH0_SECRET`: Auth0 secret (NOTE: this is mandatory and no default value)
-   `BODY_LIMIT`: Maximum body size POST/PUT/PATCH (default: `100kb`)
-   `CACHE`: Should caching be enabled? (default: `false`)
-   `CACHE_DURATION_CARDS`: How long should cards be cached for? (default: '1 minute')
-   `CACHE_DURATION_FLOODS`: How long should floods be cached for? (default: '1 hour')
-   `CACHE_DURATION_FLOODS_STATES`: How long should flood states be cached for? (default: '1 hour')
-   `CACHE_DURATION_INFRASTRUCTURE`: How long should infrastructure be cached for? (default: '1 hour')
-   `CAP_DEFAULT_EXPIRE_SECONDS`: Default expire value for CAP output in seconds
-   `CAP_TIMEZONE`: Timezone for CAP output
-   `COMPRESS`: Should the server gzip compress results? Only works if CACHE is disabled. (default: `false`)
-   `CORS`: Should Cross Object Resource Sharing (CORS) be enabled (default: `true`)
-   `CORS_HEADERS`: CORS headers to use (default: `[Link]`)
-   `DAMAGE_COMPONENT`: Building components for which damage can be reported (default: `roof,walls,plinth,nonstructural`)
-   `DISASTER_TYPES`: Disaster type keywords for report classification (default: `flood,prep,assessment`)
-   `FORMAT_DEFAULT`: Which format to return results in by default (default: `json`)
-   `FORMATS`: Formats supported by the system (as comma separated list) (default: `json,xml`)
-   `GEO_FORMAT_DEFAULT`: Which format to return geographic results in by default (default: `topojson`)
-   `GEO_FORMATS`: Geographic formats supported by the system (as comma separated list) (default: `topojson,geojson,cap`)
-   `GEO_PRECISION`: Precision to use when rounding geographic coordinates (default: `10`)
-   `IMAGES_BUCKET`: AWS S3 bucket for image uploads (default: `testing-riskmap-image-uploads`)
-   `IMAGES_HOST`: Endpoint for image hosting (default: `images.petabencana.id`),
-   `INFRASTRUCTURE_TYPES`: Infrastructure types supported (as comma separated list) (default: `floodgates,pumps,waterways`)
-   `LANGUAGES`: Supported languages
-   `LOG_CONSOLE`: In development mode we log to the console by default, in other environments this must be enabled if required by setting this parameter to `true` (default: `false`)
-   `LOG_DIR`: Which directory should logs be written to. If blank, not supplied or the directory is not writable by the application this will default to the current directory
-   `LOG_JSON`: Should json format be used for logging (default: `false`)
-   `LOG_LEVEL`: What level to log at. Levels are: `silly`, `debug`, `verbose`, `info`, `warn`, `error`. `debug` level is recommended for development. (default: `error`)
-   `LOG_MAX_FILE_SIZE`: Maximum size of log file in bytes before rotating (default: `1024 * 1024 * 100` i.e. `100mb`)
-   `LOG_MAX_FILES`: Maximum number of log files before rotation (default: `10`)
-   `NODE_ENV`: Which environment are we in. Environments are: development, test, staging, production (default: `development`)
-   `REGION_CODES`: Which region codes are supported (as comma separated list) (default: `jbd,bdg,sby`)
-   `REPORT_TYPES`: Classifiers for report types (default: `drain,desilting,canalrepair,treeclearing,flood,assessment`)
-   `RESPONSE_TIME`: Should the server return an `X-Response-Time` header detailing the time taken to process the request. This is useful for both development to identify latency impact on testing and production for performance / health monitoring (default: `false`)
-   `SECURE_AUTH0`: Whether Auth0 JWT token security should be applied to secure routes (default: `false`)
-   `TABLE_FLOODGAUGE_REPORTS`: Postgres table name for flood-gauge reports
-   `TABLE_FEEDS_QLUE`: Postgres table name for Qlue feed
-   `TABLE_FEEDS_DETIK`: Postgres table name for Detik feed
-   `TABLE_GRASP_CARDS`: Postgres table name for Grasp Cards
-   `TABLE_GRASP_LOG`: Postgres table name for Grasp activity
-   `TABLE_GRASP_REPORTS`: Postgres table name for Grasp reports
-   `TABLE_INSTANCE_REGIONS`: Postgres table for operating regions
-   `TABLE_LOCAL_AREAS`: Postgres table for local areas data for each operating region
-   `TABLE_REM_STATUS`: Postgres table for current flood states from REM
-   `TABLE_REM_STATUS_LOG`: Postgres table for REM log
-   `TABLE_REPORTS`: Postgres table for reports

### Package management

Before deployment:

-   Use NVM to switch to node and NPM versions specified in package.json for production
-   Run npm install
-   Commit changes to package-lock.json

### Release

The release procedure is as follows:

-   Update the CHANGELOG.md file with the newly released version, date, and a high-level overview of changes. Commit the change.
-   Build code documentation and commit changes.
-   Download the latest version of the Swagger API file for include in the release
-   Create a tag in git from the current head of master. The tag version should be the same as the version specified in the package.json file - this is the release version.
-   Update the version in the package.json file and commit the change.
-   Further development is now on the updated version number until the release process begins again.

### API Notes

Full API documentation at https://docs.petabencana.id. This documentation is stored in the [petabencana-docs](https://docs.petabencana.id/master-1) repository.

The swagger files under [/apigw](apigw/) describe the API in [swagger](https://swagger.io/) format (with AWS API Gateway extensions) for each of our deployments. For a new or updated deployment, the references to the (Elastic Beanstalk) hostnames and Lambda Amazon Resource Names will need to be updated first before import, and then permissions to trigger Lambdas granted to the API.

-   The dbgeo library expects timestamps from database to be in UTC (i.e. not a local timezone)

### License

See LICENSE.md
