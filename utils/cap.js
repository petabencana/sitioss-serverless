/* eslint-disable linebreak-style */
'use strict';
/**
 * CogniCity CAP data format utility
 * @module lib/cap
 * @param {Object} logger Configured Winston logger instance
 **/

// XML builder used to create XML output
const builder = require("xmlbuilder");
// moment module, JS date/time manipulation library
const moment = require("moment-timezone");
const SEVERE = "Severe";
const MINOR = "Minor";
const MODERATE = "Moderate";
const UNKNOWN = "Unknown";
const EXTREME = "Extreme";
// Cap class
module.exports = class Cap {
  /**
   * Setup the CAP object to use specified logger
   * @alias module:lib/cap
   * @param {Object} config Server configuration
   * @param {Object} logger Configured Winston logger instance
   */
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }
  /**
   * Transform GeoJSON data to ATOM feed of CAP format XML data.
   * See {@link https://tools.ietf.org/html/rfc4287|ATOM syndication format}
   * @param {Object} features PetaBencana GeoJSON features object
   * @return {String} XML CAP data describing all areas
   **/
  geoJsonToAtomCap(features) {
    let self = this;
    let feed = {
      '@xmlns': 'http://www.w3.org/2005/Atom',
      'id': 'https://api.mapakalamidad.ph/floods',
      'title': 'mapakalamidad.ph Flood Affected Areas',
      'updated': moment().tz('Asia/Manila').format(),
      'author': {
        name: 'mapakalamidad.ph',
        uri: 'https://mapakalamidad.ph/',
      },
    };

    for (let feature of features) {
      let alert = self.createAlert( feature );
      // If alert creation failed, don't create the entry
      if (!alert) {
        continue;
      }

      if (!feed.entry) feed.entry = [];

      feed.entry.push({
        // Note, this ID does not resolve to a real resource
        // - but enough information is contained in the URL
        // that we could resolve the flooded report at the same point in time
        id: 'https://api.mapakalamidad.id/floods?parent_name='
        +encodeURI(feature.properties.parent_name)
        +'&area_name='
        +encodeURI(feature.properties.area_name)
        +'&time='
        +encodeURI(moment.tz(feature.properties.last_updated, 'Asia/Manila'
                    ).format('YYYY-MM-DDTHH:mm:ssZ')),
        title: alert.identifier + ' Flood Affected Area',
        updated: moment.tz(feature.properties.last_updated, 'Asia/Manila'
                    ).format('YYYY-MM-DDTHH:mm:ssZ'),
        content: {
          '@type': 'text/xml',
          'alert': alert,
        },
      });
    }

    return builder.create( {feed: feed} ).end();
  }

/**
* Transform GeoJSON data to ATOM feed of CAP format XML data.
* See {@link https://tools.ietf.org/html/rfc4287|ATOM syndication format}
* @param {Object} features PetaBencana GeoJSON report features object
* @return {String} XML CAP data describing all reports
**/
  geoJsonToReportAtomCap(features) {
    let self = this;
    let feed = {
      '@xmlns': 'http://www.w3.org/2005/Atom',
      'id': 'https://api.mapakalamidad.ph/reports',
      'title': 'Disaster Reports in Philippines',
      'updated': moment().tz('Asia/Manila').format(),
      'author': {
        name: 'mapakalamidad.ph',
        uri: 'https://mapakalamidad.ph/',
      },
    };

    for (let feature of features) {
      console.error(feature);
      let alert = self.createReportAlert(feature);
      // If alert creation failed, don't create the entry
      if (!alert) {
        continue;
      }

      if (!feed.entry) feed.entry = [];

      feed.entry.push({
        // Note, this ID does not resolve to a real resource
        // - but enough information is contained in the URL
        // that we could resolve the flooded report at the same point in time
        id:  feature.properties.pkey,
        title: alert.identifier + ' Disasters in Philippines',
        updated: moment.tz(feature.properties.created_at, 'Asia/Manila'
        ).format('YYYY-MM-DDTHH:mm:ssZ'),
        content: {
          '@type': 'text/xml',
          'alert': alert,
        },
      });
    }

    return builder.create({feed: feed}).end();
  }

  /**
   * Create CAP ALERT object.
   * See {@link `http://docs.oasis-open.org/emergency/cap/v1.2/`
                  + `CAP-v1.2-os.html#_Toc97699527|`
                  + `CAP specification 3.2.1 "alert" Element and Sub-elements`}
   * @param {Object} feature petabencana.id GeoJSON feature
   * @return {Object} Object representing ALERT element for xmlbuilder
   */
  createAlert(feature) {
    let self = this;

    let alert = {};

    alert['@xmlns'] = 'urn:oasis:names:tc:emergency:cap:1.2';

    let identifier = feature.properties.parent_name + '.'
      + feature.properties.area_name + '.'
      + moment.tz(feature.properties.last_updated, 'Asia/Manila'
        ).format('YYYY-MM-DDTHH:mm:ssZ');
    identifier = identifier.replace(/ /g, '_');
    alert.identifier = encodeURI(identifier);

    alert.sender = 'BPBD.JAKARTA.GOV.ID';
    alert.sent = moment.tz(feature.properties.last_updated,
                  self.config.CAP_TIMEZONE).format('YYYY-MM-DDTHH:mm:ssZ');
    alert.status = 'Actual';
    alert.msgType = 'Alert';
    alert.scope = 'Public';

    alert.info = self.createInfo( feature );
    // If info creation failed, don't create the alert
    if (!alert.info) {
      return;
    }

    return alert;
  }

  /**
   * Create CAP REPORT ALERT object.
   * See {@link `http://docs.oasis-open.org/emergency/cap/v1.2/`
                  + `CAP-v1.2-os.html#_Toc97699527|`
                  + `CAP specification 3.2.1 "alert" Element and Sub-elements`}
   * @param {Object} feature petabencana.id GeoJSON feature
   * @return {Object} Object representing ALERT element for xmlbuilder
   */
  createReportAlert(feature) {
    let self = this;

    let alert = {};

    alert['@xmlns'] = 'urn:oasis:names:tc:emergency:cap:1.2';

    let identifier = feature.properties.pkey + '.'
      + feature.properties.source + '.'
      + moment.tz(feature.properties.created_at, 'Asia/Manila'
      ).format('YYYY-MM-DDTHH:mm:ssZ');
    identifier = identifier.replace(/ /g, '_');
    alert.identifier = encodeURI(identifier);

    alert.sender = feature.properties.source;
    alert.sent = moment.tz(feature.properties.created_at,
    self.config.CAP_TIMEZONE).format('YYYY-MM-DDTHH:mm:ssZ');
    alert.status = 'Actual';
    alert.msgType = 'Alert';
    alert.scope = 'Public';

    alert.info = this.createReportInfo(feature);
    // If info creation failed, don't create the alert
    if (!alert.info) {
      return;
    }

    return alert;
  }

  /**
   * Create a CAP INFO object.
   * See {@link `http://docs.oasis-open.org/emergency/cap/v1.2/`
                  + `CAP-v1.2-os.html#_Toc97699542|`
                  + `CAP specification 3.2.2 "info" Element and Sub-elements`}
   * @param {Object} feature petabencana.id GeoJSON feature
   * @return {Object} Object representing INFO element suitable for xmlbuilder
   */
  createInfo(feature) {
    let self = this;

    let info = {};

    info.category = 'Met';
    info.event = 'FLOODING';
    info.urgency = 'Immediate';

    let severity = '';
    let levelDescription = '';
    if ( feature.properties.state === 1 ) {
      severity = 'Unknown';
      levelDescription = 'AN UNKNOWN LEVEL OF FLOODING - USE CAUTION -';
    } else if ( feature.properties.state === 2 ) {
      severity = 'Minor';
      levelDescription = 'FLOODING OF BETWEEN 10 and 70 CENTIMETERS';
    } else if ( feature.properties.state === 3 ) {
      severity = 'Moderate';
      levelDescription = 'FLOODING OF BETWEEN 71 and 150 CENTIMETERS';
    } else if ( feature.properties.state === 4 ) {
      severity = 'Severe';
      levelDescription = 'FLOODING OF OVER 150 CENTIMETERS';
    } else {
      self.logger.silly('Cap: createInfo(): State '
        + feature.properties.state
        + ' cannot be resolved to a severity');
      return;
    }
    info.severity = severity;

    info.certainty = 'Observed';
    // Add expiry time to information
    info.expires = moment.tz(new Date().getTime()
                + self.config.CAP_DEFAULT_EXPIRE_SECONDS * 1000,
                  self.config.CAP_TIMEZONE).format('YYYY-MM-DDTHH:mm:ssZ');
    info.senderName = 'JAKARTA EMERGENCY MANAGEMENT AGENCY';
    info.headline = 'FLOOD WARNING';

    let descriptionTime = moment(feature.properties.last_updated
                            ).tz('Asia/Jakarta').format('HH:mm z');
    let descriptionArea = feature.properties.parent_name
                          + ', ' + feature.properties.area_name;
    info.description = 'AT '
                        + descriptionTime
                        + ' THE JAKARTA EMERGENCY MANAGEMENT AGENCY OBSERVED '
                        + levelDescription + ' IN ' + descriptionArea + '.';

    info.web = 'https://mapakalamidad.ph/';

    info.area = self.createArea( feature );
    // If area creation failed, don't create the info
    if (!info.area) {
      return;
    }

    return info;
  }

  /**
   * Create a CAP Report INFO object.
   * See {@link `http://docs.oasis-open.org/emergency/cap/v1.2/`
                  + `CAP-v1.2-os.html#_Toc97699542|`
                  + `CAP specification 3.2.2 "info" Element and Sub-elements`}
   * @param {Object} feature petabencana.id GeoJSON feature
   * @return {Object} Object representing INFO element suitable for xmlbuilder
   */
  createReportInfo(feature) {
    let self = this;

    let info = {};

    info.category = 'Geo';
    info.event = feature.properties.disaster_type;
    info.urgency = 'Immediate';
    info.severity = self._getDisasterSevearity(feature);
    info.certainty = 'Observed';

    // Add expiry time to information
    info.expires = moment.tz(new Date().getTime()
      + self.config.CAP_DEFAULT_EXPIRE_SECONDS * 1000,
      self.config.CAP_TIMEZONE).format('YYYY-MM-DDTHH:mm:ssZ');

    info.senderName = feature.properties.source;
    info.headline = 'DISASTER WARNING';
    info.description = encodeURI(feature.properties.text || "");
    info.web = 'https://data.mapakalamidad.ph/reports?admin=' + encodeURI(feature.properties.tags.instance_region_code) + '&amp;disaster=' + encodeURI(feature.properties.disaster_type);

    info.parameter = [];
    let report_data = feature.properties.report_data || {};
    for (let key in report_data) {
      let value = report_data[key];
      if (value.lat) value = value.lat + ', ' + value.lng;
      if (Array.isArray(value)) value = value.join(',') 
      info.parameter.push({
        valueName: key,
        value: value
      });
    }
    if (feature.properties.image_url) info.parameter.push({ valueName: "Image_url", value: feature.properties.image_url});
    if (feature.properties.tags.instance_region_code) info.parameter.push({ valueName: "instance_region_code", value: feature.properties.tags.instance_region_code});
    
    let area = {};
    if (feature.geometry.coordinates) {
      area.areaDesc = "Location of the disaster reported in the area with code:" + encodeURI(feature.properties.tags.instance_region_code);
      area.circle =  feature.geometry.coordinates[1] + ',' + feature.geometry.coordinates[0] + ' 0' ;
    }
    info.area = area;
    // If area creation failed, don't create the info
    // if (!info.area) {
    //   return;
    // }

    return info;
  }

  _getDisasterSevearity(feature) {
    let disasterType = feature.properties.disaster_type;
    let level = UNKNOWN;
    let reportData = feature.properties.report_data;
    switch (disasterType) {
      case 'flood':
        reportData = reportData || { 'flood_depth': 0 };
        let depth = reportData.flood_depth || 0;
        level = this._getFloodSevearity(depth);
        break;
      case 'earthquake':
        let subType = feature.properties.report_data.report_type;
        if (subType === 'road') {
          reportData = reportData || { 'accessabilityFailure': 0 };
          let accessability = reportData.accessabilityFailure || 0;
          level = this._getAccessabilitySevearity(accessability);
        } else if (subType === 'structure') {
          reportData = reportData || { 'structureFailure': 0 };
          let structureFailure = reportData.structureFailure || 0;
          level = this._getStructureFailureSevearity(structureFailure);
        }
        break;
      case 'haze':
        switch (reportData.airQuality) {
          case 0:
            level = MODERATE;
            break;
          case 1:
            level = MODERATE;
            break;
          case 2:
            level = SEVERE;
            break;
          case 3:
            level = EXTREME;
            break;
          case 4:
            level = EXTREME;
            break;
          default:
            level = UNKNOWN;
            break;
        }
        break;
      case 'wind':
        reportData = reportData || { 'impact': 0 };
        let impact = reportData.impact || 0;
        level = this._getWindSevearity(impact);
        break;
      case 'volcano':
        break;
      case 'fire':
        break;
      default:
        break;
    }
    return level;
  }

  _getWindSevearity(impact) {
    // eslint-disable-next-line default-case
    switch (String(impact)) {
      case '0': return MINOR;
      case '1': return MODERATE;
      case '2': return SEVERE;
    }
  }

  _getAQSevearity(aq) {
    // eslint-disable-next-line default-case
    switch (String(aq)) {
      case '0': return MINOR;
      case '1': return MINOR;
      case '2': return MODERATE;
      case '3': return SEVERE;
      case '4': return SEVERE;
    }
  }


  _getFloodSevearity(depth) {
    if (depth <= 70) {
      return MINOR;
    } else if (depth <= 150) {
      return MODERATE;
    } else if (depth > 150) {
      return SEVERE;
    }
  }

  _getAccessabilitySevearity(accessability) {
    // eslint-disable-next-line default-case
    switch (accessability) {
      case 0: return EXTREME;
      case 1: return SEVERE;
      case 2: return MODERATE;
      case 3: return MODERATE;
      case 4: return MINOR;
    }
  }

  _getStructureFailureSevearity(structureFailure) {
    if (structureFailure < 1) {
      return MINOR;
    } else if (structureFailure >= 1 && structureFailure < 2) {
      return MODERATE;
    } else if (structureFailure >= 2) {
      return SEVERE;
    }
  }
  /**
   * Create a CAP AREA object.
   * See {@link `http://docs.oasis-open.org/emergency/cap/v1.2/`
                + `CAP-v1.2-os.html#_Toc97699550|`
                + `CAP specification 3.2.4 "area" Element and Sub-elements`}
   * @param {Object} feature petabencana.id GeoJSON feature
   * @return {Object} Object representing AREA element for XML xmlbuilder
   */
  createArea(feature) {
    let self = this;

    let area = {};

    area.areaDesc = feature.properties.area_name
                    + ', ' + feature.properties.parent_name;

    // Collate array of polygon-describing strings from different geometry types
    area.polygon = [];
    let featurePolygons;
    if ( feature.geometry.type === 'Polygon' ) {
      featurePolygons = [feature.geometry.coordinates];
    } else if ( feature.geometry.type === 'MultiPolygon' ) {
      featurePolygons = feature.geometry.coordinates;
    } else {
      /* istanbul ignore next */
      console.error(
        "Cap: createInfo(): Geometry type '" +
          feature.geometry.type +
          "' not supported"
      );
      /* istanbul ignore next */
      return;
    }

    // Construct CAP suitable polygon strings
    // (whitespace-delimited WGS84 coordinate pairs - e.g. "lat,lon lat,lon")
    // See: `http://docs.oasis-open.org/emergency/cap/v1.2/`
    //          + `CAP-v1.2-os.html#_Toc97699550 - polygon`
    // See: `http://docs.oasis-open.org/emergency/cap/v1.2/`
    //          + `CAP-v1.2-os.html#_Toc520973440`
    console.log(
      "Cap: createInfo(): " +
        featurePolygons.length +
        " polygons detected for " +
        area.areaDesc
    );
    for (
      let polygonIndex = 0;
      polygonIndex < featurePolygons.length;
      polygonIndex++
    ) {
      // Assume all geometries to be simple Polygons of single LineString
      if ( featurePolygons[polygonIndex].length > 1 ) {
        /* istanbul ignore next */
        console.error( `Cap: createInfo(): Polygon with interior rings is
                            not supported` );
        /* istanbul ignore next */
        return;
      }

      let polygon = '';
      console.log( 'Cap: createInfo(): '
                        + featurePolygons[polygonIndex][0].length
                        + ' points detected in polygon '
                        + polygonIndex );
      for (let pointIndex=0; pointIndex <
        featurePolygons[polygonIndex][0].length; pointIndex++) {
          let point = featurePolygons[polygonIndex][0][pointIndex];
          polygon += point[1] + ',' + point[0] + ' ';
        }
      area.polygon.push( polygon );
    }

    return area;
  }
};
