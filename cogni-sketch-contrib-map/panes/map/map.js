/**
 * @file Defines the plugin map pane.
 *
 * @author Dave Braines
 * @status Complete
 **/

import {getProject} from "/javascripts/interface/data.js";
import {getFromCookie} from "/javascripts/private/csData/csDataCookie.js";
import {getPaneElement} from "/javascripts/private/ui/tabs.js";
import {createHtmlUsing, registerClickEvent} from "/javascripts/private/util/dom.js";
import {mapTemplate, attributionTemplate} from "./templates/mapPaneTemplate.js";
import {findOnCanvas} from "/javascripts/private/core/core_panes/canvas/select.js";

//TODO: Get these from config - where should pane config be?
const MAP_URL = 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}';
const MAP_TILE_SIZE = 512;
const MAP_ZOOM_OFFSET = -1;
const MAP_DEFAULT_ZOOM = 2;
const MAP_MAX_ZOOM = 18;
const MAP_LAYER_ID = 'mapbox/streets-v11';

const COOKIE_KEY = 'mapToken';
const ELEM_MAP = 'big-map';

/**
 * The standard definition for this pane.
 *
 * @type {csPaneDefinition}
 */
export const config = {
    'paneName': 'Map',
    'callbacks': {
        'render': cbRender
    }
};

/**
 * Create the configuration for this map pane.
 *
 * @return {csTemplateConfig}       the template configuration.
 */
function createConfigForMapPane() {
    return {
        'html': {
            'mapId': ELEM_MAP
        }
    };
}

/**
 * Called when the pane is rendered.
 *
 * Find all of the nodes with lat/lon values and show these on the map.
 */
function cbRender() {
    let elem = getPaneElement(config.paneName);

    if (elem) {
        /* Check if leaflet is initialised */
        if (window.L) {
            let mapData = createLocationsFromNodes();

            if (mapData.locations.length > 0) {
                createHtmlUsing(elem, mapTemplate, createConfigForMapPane());
                drawBigMap(mapData);
            }
        }
    }
}

/**
 * Iterate through all nodes in the current project and store and with valid lat/lon coordinates into the mapData.
 *
 * @return {csMapData}      the list of locations and extents.
 */
function createLocationsFromNodes() {
    let mapData = {
        'minLat': undefined,
        'maxLat': undefined,
        'minLon': undefined,
        'maxLon': undefined,
        'locations': []
    };

    if (getProject()) {
        for (let thisNode of getProject().listNodes()) {
            let lat = thisNode.getPropertyNamed('latitude');
            let lon = thisNode.getPropertyNamed('longitude');

            if (lat && lon) {
                let loc = {
                    'lat': parseFloat(lat),
                    'lon': parseFloat(lon),
                    'name': thisNode.getLabel() || thisNode.getTypeName(),
                    'node': thisNode
                };

                mapData.locations.push(loc);

                updateMapBounds(mapData, loc);
            }
        }
    }

    return mapData;
}

/**
 * Based on this location update the bounds (min/max lat and lon) for the map.
 *
 * @param {csMapData} mapData           the map data object that will be updated.
 * @param {csMapLatLon} loc             the location being processed.
 */
function updateMapBounds(mapData, loc) {
    if (!mapData.minLat) {
        mapData.minLat = loc.lat;
        mapData.maxLat = loc.lat;
        mapData.minLon = loc.lon;
        mapData.maxLon = loc.lon;
    }

    mapData.minLat = Math.min(mapData.minLat, loc.lat);
    mapData.maxLat = Math.max(mapData.maxLat, loc.lat);
    mapData.minLon = Math.min(mapData.minLon, loc.lon);
    mapData.maxLon = Math.max(mapData.maxLon, loc.lon);
}

/**
 * Create the leaflet map inside the map pane, based on the identified locations.
 *
 * @param {csMapData} mapData       the list of locations and overall map extent.
 */
function drawBigMap(mapData) {
    let coords = [
        mapData.minLat + ((mapData.maxLat - mapData.minLat) / 2),   /* the latitude midpoint */
        mapData.minLon + ((mapData.maxLon - mapData.minLon) / 2)    /* the longitude midpoint */
    ];
    let myMap = L.map(ELEM_MAP).setView(coords, MAP_DEFAULT_ZOOM);
    let mapToken = getFromCookie(COOKIE_KEY);
    let markers = [];

    L.tileLayer(MAP_URL, {
        'attribution': attributionTemplate,
        'tileSize': MAP_TILE_SIZE,
        'maxZoom': MAP_MAX_ZOOM,
        'zoomOffset': MAP_ZOOM_OFFSET,
        'id': MAP_LAYER_ID,
        'accessToken': mapToken
    }).addTo(myMap);

    /* plot each location on the map as a marker */
    for (let thisLoc of mapData.locations) {
        let icon = L.divIcon({
            'className': 'custom-div-icon',
            'html': createHtmlFor(thisLoc),
            'iconSize': [ 30, 42 ],
            'iconAnchor': [ 15, 42 ]
        });

        let marker = L.marker([ thisLoc.lat, thisLoc.lon], { 'icon': icon }).addTo(myMap);

        marker.bindPopup(thisLoc.name).openPopup();
        markers.push(marker);

        registerClickEvent(`node-${thisLoc.node.getUid()}`, function() { findOnCanvas(thisLoc.node); });
    }

    /* based on the markers added, set the bounds of the map to fill the markers */
    let group = new L.featureGroup(markers);

    if (markers.length > 0) {
        myMap.fitBounds(group.getBounds());
    }
}

function createHtmlFor(loc) {
    return `
<div style='background-color:${loc.node.getIcon()['color']}' class='marker-pin'>
    <div class="cs-table-node">
        <div class="cs-table-icon ${colorClassFor(loc.node)}">
            <a id="node-${loc.node.getUid()}" title="${loc.node.getTypeName()} - click to view on canvas">
                <img class="cs-table-image" src="${loc.node.getIcon()['icon']}" alt="${loc.node.getIcon()['iconAlt']}">
            </a>
        </div>
    </div>
</div>`;
}

/**
 * Compute the css class name for the specified node type.
 *
 * @param {csType} nodeType     the node type for which to compute the css class name.
 * @return {string}             the computed css class name.
 */
function colorClassFor(nodeType) {
    //TODO: Make this generic (also used in table pane)
    let className = '';
    let icon = nodeType.getIcon();

    if (icon.color) {
        className = `cs-node-${icon.color}`;
    }

    return className;
}
