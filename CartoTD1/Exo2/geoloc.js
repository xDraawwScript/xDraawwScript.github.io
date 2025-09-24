const miamiLat = 25.7617;
const miamiLon = -80.1918;

const bermudesLat = 32.3078;
const bermudesLon = -64.7505;

const sanJuanLat = 18.4655;
const sanJuanLon = -66.1057;

const niceLat = 43.7034;
const niceLon = 7.2663;

function success(pos) {
  var crd = pos.coords;

  console.log("Votre position actuelle est :");
  console.log(`Latitude : ${crd.latitude}`);
  console.log(`Longitude : ${crd.longitude}`);
  console.log(`La précision est de ${crd.accuracy} mètres.`);

  var map = L.map('map').setView([crd.latitude, crd.longitude], 13);
  var markerloc = L.marker([crd.latitude, crd.longitude]).addTo(map);
  var markernice= L.marker([niceLat, niceLon]).addTo(map);

  var polygon = L.polygon([
    [bermudesLat, bermudesLon],
    [sanJuanLat, sanJuanLon],
    [miamiLat, miamiLon]
]).addTo(map);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
}

function error(err) {
  console.warn(`ERREUR (${err.code}): ${err.message}`);
}

navigator.geolocation.getCurrentPosition(success, error);
