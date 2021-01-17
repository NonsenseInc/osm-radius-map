// get the parameters from the url
var params = (new URL(document.location)).searchParams;

var wd = params.has("wd") ? params.get("wd") : "Q6245";
var radius = params.has("radius") ? parseInt(params.get("radius")) : 15;

// initialize Leaflet
var map = L.map('map').setView({ lon: 0, lat: 0 }, 2);

// add the OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
}).addTo(map);

// show the scale bar on the lower left corner
L.control.scale().addTo(map);

// build overpass query string
//var query = encodeURI('[out:json]; area(3600051477)->.searchArea;(relation["boundary"="administrative"]["admin_level"="' + level + '"]["name"~"' + target + '"](area.searchArea););out meta;>;out meta qt;');
var query = encodeURI(`[out:json]; ( relation["wikidata"="${wd}"]; ); out geom;`);
var url = `https://overpass.kumi.systems/api/interpreter?data=${query}`;

// request geojson from overpass
var request = new XMLHttpRequest();
console.log("requesting overpass data: " + url);
console.log("this might take some seconds...")
request.open('GET', url, true);
request.timeout = 60000;

// variables outside of callbacks for now, to make debugging easier
var in_osm, in_geo, in_map, buffered_geo, union_geo, buffered_map;

request.onload = () => {
    if (request.status >= 200 && request.status < 400) {
        // parse the input to geojson
        in_osm = JSON.parse(request.responseText);
        in_geo = osmtogeojson(in_osm);

        // extend the area by radius km
        buffered_geo = turf.buffer(in_geo, radius, { units: 'kilometers' });
        if (buffered_geo.features.length > 1) union_geo = turf.union(...(buffered_geo.features));
        else union_geo = buffered_geo;

        // draw the original area to the map
        in_map = L.geoJSON(in_geo);
        in_map.addTo(map);

        // draw the buffered area to the map
        buffered_map = L.geoJSON(union_geo);
        buffered_map.addTo(map);
        map.fitBounds(buffered_map.getBounds());
    } else {
        console.log("Error requesting data.");
    }
};

request.onerror = () => {
    console.log("Error requesting data.");
};

request.send();