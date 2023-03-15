/**
 * @file The client-side capabilities of the 'location' palette function.
 * @author Dave Braines
 * @status In-progress
 **/

import {
    registerAddEmptyCallback,
    registerAddExistingCallback,
    registerAddFullCallback,
    registerSwitchToPopulatedCallback
} from "/javascripts/interface/callbackType.js";
import {
    error,
    showToast
} from "/javascripts/interface/log.js";
import {putHtml} from "/javascripts/interface/graphics.js";
import {urlDecode} from "/javascripts/interface/http.js";
import {getFromCookie} from "/javascripts/private/csData/csDataCookie.js";

const TYPE_NAME = 'location';
const COOKIE_TOKEN = 'mapToken';    /* the leaflet map credentials are passed in an encrypted cookie */

/* default properties - these are used if user defined values in context.node.type.settings are not specified */
//const DEFAULT_MAP_WIDTH = 50;
const DEFAULT_MAP_URL = 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}';
const DEFAULT_ZOOM = 10;
const DEFAULT_ATTRIBUTION = '';
//const DEFAULT_ATTRIBUTION = '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>';
const DEFAULT_TILE_SIZE = 512;
const DEFAULT_MAX_ZOOM = 18;
const DEFAULT_ZOOM_OFFSET = -1;
const DEFAULT_LAYER_ID = 'mapbox/streets-v11';

/* register the cogni-sketch callbacks for this node type */
registerAddExistingCallback(TYPE_NAME, cbShowMiniMap);
registerAddFullCallback(TYPE_NAME, cbShowMiniMap);
registerSwitchToPopulatedCallback(TYPE_NAME, cbShowMiniMap);
registerAddEmptyCallback(TYPE_NAME, cbShowHelp);

/**
 * Callback function to show help text when an empty location item is dropped onto the canvas.
 */
function cbShowHelp() {
    //TODO: Make this a standard capability
    showToast('You can drop Google Map urls onto this location to populate the map');
}

/**
 * Callback function to render a leaflet mini-map for this location.
 * @param context {csContext}
 */
function cbShowMiniMap(context) {
    let gpsText = context.payload && context.payload.plainText;

    if (gpsText) {
        /* there is a payload (map url) so process it into node properties */
        updateNodeFromLocationUrl(context.node, gpsText);
    }

    /* render the mini map based on the node properties */
    addMapDetails(context.node);
}

/**
 * Add node properties to capture the values extracted from the location url.
 *
 * @param tgtNode       the cs node that represents this location
 * @param locationUrl   the url that contains the location details
 */
function updateNodeFromLocationUrl(tgtNode, locationUrl) {
    let details = extractLocationDetails(locationUrl);

    tgtNode.setLabel(details.name);
    tgtNode.setNormalPropertyNamed('url', locationUrl);
    tgtNode.setNormalPropertyNamed('name', details.name);
    tgtNode.setNormalPropertyNamed('latitude', details.latitude);
    tgtNode.setNormalPropertyNamed('longitude', details.longitude);
}

/**
 * Process the location url, extracting name and lat/lon values, returning the result.
 *
 * @param url {string}          a structured location url
 * @returns {csMapLocation}     the location details
 */
function extractLocationDetails(url) {
    /* currently only google map urls are supported */
    let locParts = url.split('/maps');
    let result = {};

    if (locParts.length > 1) {
        let innerParts = locParts[1].split('/@');
        let coordinateParts = innerParts[1].split(',');

        result.name = urlDecode(innerParts[0].replace('/place/', ''));
        result.latitude = coordinateParts[0];
        result.longitude = coordinateParts[1];
        result.url = url;
    }

    return result;
}

/**
 * Create the html to render the map, extracting values from the type definition.
 *
 * @param node {csNode}     the canvas node that represents this location
 */
function addMapDetails(node) {
    let locName = node.getPropertyNamed('name');
    let lat = node.getPropertyNamed('latitude');
    let lon = node.getPropertyNamed('longitude');

    if (lat && lon) {
        let width = node.getType().getSettings().getCustom('defaultMapWidth');
        let mapId = 'map_' + node.getUid();
        let html = `<div id="${mapId}" class="cs-map"></div>`;

        putHtml(node, html, width);
        drawMap(mapId, locName, parseFloat(lat), parseFloat(lon), node.getType());
//        cs.node.bringToFront(node);
    }
}

/**
 * Create the leaflet tileLayer to render the mini-map, using user defined type settings or defaults.
 *
 * @param mapId {string}    the element id for the map rendering
 * @param locName {string}  the name of the location
 * @param lat {number}      the latitude
 * @param lon {number}      the longitude
 * @param type {csType}     the palette type containing location settings
 */
function drawMap(mapId, locName, lat, lon, type) {
    if (window.L) {
        let mapUrl = type.getSettings().getCustom('mapUrl') || DEFAULT_MAP_URL;
        let coords = [ lat, lon ];
        let zoom = type.getSettings().getCustom('zoom') || DEFAULT_ZOOM;
        let attribution = type.getSettings().getCustom('attribution') || DEFAULT_ATTRIBUTION;
        let tileSize = type.getSettings().getCustom('tileSize') || DEFAULT_TILE_SIZE;
        let maxZoom = type.getSettings().getCustom('maxZoom') || DEFAULT_MAX_ZOOM;
        let zoomOffset = type.getSettings().getCustom('zoomOffset') || DEFAULT_ZOOM_OFFSET;
        let layerId = type.getSettings().getCustom('layerId') || DEFAULT_LAYER_ID;

        let myMap = L.map(mapId).setView(coords, zoom);
        let mapToken = getFromCookie(COOKIE_TOKEN);

        L.tileLayer(mapUrl, {
            'attribution': attribution,
            'tileSize': tileSize,
            'maxZoom': maxZoom,
            'zoomOffset': zoomOffset,
            'id': layerId,
            'accessToken': mapToken
        }).addTo(myMap);

        let marker = L.marker(coords).addTo(myMap);
        marker.bindPopup(locName).openPopup();
    } else {
        error('Unable to draw map as library (L) was not loaded');
    }
}
