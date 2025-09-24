const miamiLat = 25.7617;
const miamiLon = -80.1918;

const bermudesLat = 32.3078;
const bermudesLon = -64.7505;

const sanJuanLat = 18.4655;
const sanJuanLon = -66.1057;

const niceLat = 43.7034;
const niceLon = 7.2663;

const marseilleLat = 43.2965;
const marseilleLon = 5.3698; 

let mapn = 0;

function success(pos) {
    var crd = pos.coords;

    console.log("Votre position actuelle est :");
    console.log(`Latitude : ${crd.latitude}`);
    console.log(`Longitude : ${crd.longitude}`);
    console.log(`La précision est de ${crd.accuracy} mètres.`);

    var map = L.map('map').setView([crd.latitude, crd.longitude], 13);

    var tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    var markerloc = L.marker([crd.latitude, crd.longitude]).addTo(map);
    var markernice = L.marker([niceLat, niceLon]).addTo(map);
    var markermarseille = L.marker([marseilleLat, marseilleLon]).addTo(map);

    var polygon = L.polygon([
        [bermudesLat, bermudesLon],
        [sanJuanLat, sanJuanLon],
        [miamiLat, miamiLon]
    ]).addTo(map);
    var cerclePrecision = L.circle([crd.latitude, crd.longitude], {
        color: 'blue',
        radius: crd.accuracy
    }).addTo(map);

    var ligne = L.polyline([
    [marseilleLat, marseilleLon],
    [crd.latitude, crd.longitude]],).addTo(map);
    
    var dist = distanceHaversine(crd.latitude, crd.longitude, marseilleLat, marseilleLon);
    dist=(dist/1000).toFixed(2);


    markerloc.bindPopup(`On est à ${dist} km de marseille`).openPopup();

    document.getElementById("btnTriangle").addEventListener('click', ()=> {
        map.setView([miamiLat,miamiLon],13);
    });
    fetch('https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/arrondissements-version-simplifiee.geojson')
            .then(response => response.json())
            .then(data => {
                L.geoJSON(data, {style: function (feature) {return {
                            color: 'blue',opacity: 0.2};
                    },
                    onEachFeature: function (feature, layer, code) {
                            layer.bindPopup(feature.properties.nom,feature.properties.code);
                        }
                }).addTo(map);
            })
            .catch(error => console.error('erreur lors du chargement du GeoJSON :', error));


    document.getElementById('btnChange').addEventListener('click', () => {
    if(mapn==0){
    map.removeLayer(tileLayer); 
    tileLayer = L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.png', {
        attribution: 'Map tiles by <a href="http://stamen.com/">Stamen Design</a>',
        maxZoom: 20
    }).addTo(map);
    mapn=+1;
    } else {
    mapn=mapn-1;
    map.removeLayer(tileLayer);
    tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

}
    map.setView(map.getCenter(), map.getZoom());
});
}   

navigator.geolocation.getCurrentPosition(success, error);

function error(err) {
    console.warn(`ERREUR (${err.code}): ${err.message}`);
}


//Generé
function distanceHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // distance en mètres
}
