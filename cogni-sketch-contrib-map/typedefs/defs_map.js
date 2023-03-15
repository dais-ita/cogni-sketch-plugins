/**
 * @file Contains only typedefs, specifically those relating to the map plugin.
 *
 * @author Dave Braines
 * @status Complete
 **/

/**
 * csMapData - an object structure for sharing map data locations and min/max bounds.
 *
 * @typedef csMapData
 * @type {object}
 * @property {number} minLat                the minimum latitude for any points on the map.
 * @property {number} maxLat                the maximum latitude for any points on the map.
 * @property {number} minLon                the minimum longitude for any points on the map.
 * @property {number} maxLon                the maximum longitude for any points on the map.
 * @property {csMapLocation[]} locations    the list of locations on this map.
 */

/**
 * csLocation - a specific location object structure for this processing.
 *
 * @typedef csMapLocation
 * @type {object}
 * @property {string} name - The name of the location
 * @property {number} latitude - The latitude of the location
 * @property {number} longitude - The longitude of the location
 */

/**
 * csLatLon - an object structure for lat/lon location information.
 *
 * @typedef csMapLatLon
 * @type {object}
 * @property {number} lat       the latitude for this location.
 * @property {number} lon       the longitude for this location.
 */
