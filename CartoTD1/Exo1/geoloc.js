var id, target, options;

target = {
  latitude: 0,
  longitude: 0,
};

options = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0,
};

function success(pos) {
  var crd = pos.coords;
  var timestamp = new Date(pos.timestamp);
  var texte = `
Latitude : ${crd.latitude}
Longitude : ${crd.longitude}
Altitude : ${crd.altitude !== null ? crd.altitude + " m" : "Indisponible"}
Précision : ${crd.accuracy} m
Vitesse : ${crd.speed !== null ? crd.speed + " m/s" : "Indisponible"}
Date : ${timestamp.toLocaleString()}
  `;
  document.getElementById('currentPosition').textContent = texte;
}

function watchSuccess(pos) {
  var crd = pos.coords;
  var timestamp = new Date(pos.timestamp);
  var texte = `
Latitude : ${crd.latitude}
Longitude : ${crd.longitude}
Altitude : ${crd.altitude !== null ? crd.altitude + " m" : "Indisponible"}
Précision : ${crd.accuracy} m
Vitesse : ${crd.speed !== null ? crd.speed + " m/s" : "Indisponible"}
Date : ${timestamp.toLocaleString()}
  `;
  document.getElementById('watchPosition').textContent = texte;

  if (target.latitude === crd.latitude && target.longitude === crd.longitude) {
    console.log("Bravo, vous avez atteint la cible");
    navigator.geolocation.clearWatch(id);
  }
}

function error(err) {
  console.warn(`ERREUR (${err.code}): ${err.message}`);
}

navigator.geolocation.getCurrentPosition(success, error, options);
id = navigator.geolocation.watchPosition(watchSuccess, error, options);
