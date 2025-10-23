
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Sélecteurs DOM
const globeContainer = document.getElementById('globe');
const mapContainer = document.getElementById('map');
const infoName = document.getElementById('country-name');
const infoSummary = document.getElementById('country-summary');
const infoDetails = document.getElementById('country-details');
const aiBtn = document.getElementById('ai-summary');
const speakBtn = document.getElementById('speak');
const searchInput = document.getElementById('search');

// Scène Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, globeContainer.clientWidth / globeContainer.clientHeight, 0.1, 1000);
camera.position.z = 2.5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(globeContainer.clientWidth, globeContainer.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
globeContainer.appendChild(renderer.domElement);

// Lumières
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const light = new THREE.DirectionalLight(0xffffff, 0.6);
light.position.set(5, 3, 5);
scene.add(light);

// Contrôles
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 1.5;
controls.maxDistance = 6;

// Globe
const loader = new THREE.TextureLoader();
const earthTex = loader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg');
const cloudsTex = loader.load('https://threejs.org/examples/textures/planets/earth_clouds_1024.png');
const earthGeo = new THREE.SphereGeometry(1, 128, 128);
const earthMat = new THREE.MeshPhongMaterial({ map: earthTex });
const earth = new THREE.Mesh(earthGeo, earthMat);
scene.add(earth);

const clouds = new THREE.Mesh(
  new THREE.SphereGeometry(1.005, 128, 128),
  new THREE.MeshPhongMaterial({ map: cloudsTex, transparent: true, opacity: 0.5 })
);
scene.add(clouds);

// Halo atmosphérique
const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.03, 64, 64),
  new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vNormal; void main(){vNormal=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec3 vNormal; void main(){float i=pow(0.6-dot(vNormal,vec3(0,0,1.0)),3.0); gl_FragColor=vec4(0.2,0.5,1.0,0.4*i);}`,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true
  })
);
scene.add(atmosphere);

// Conversion lat/lon -> coord cartésienne
function latLonToCartesian(lat, lon, radius = 1) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

// Pays & drapeaux
const flags = [];
let countries = [];

async function loadCountries() {
  const res = await fetch('https://restcountries.com/v3.1/all?fields=name,latlng,flags,population,capital,region');
  countries = await res.json();
  countries.forEach(c => {
    if (!c.latlng) return;
    const [lat, lon] = c.latlng;
    const pos = latLonToCartesian(lat, lon, 1.02);
    const tex = new THREE.TextureLoader().load(c.flags.png);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.07), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
    flag.position.copy(pos);
    flag.lookAt(0, 0, 0);
    flag.userData = { country: c };
    scene.add(flag);
    flags.push(flag);
  });
}

// Map Leaflet
const map = L.map(mapContainer).setView([0, 0], 2);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 5 }).addTo(map);

map.on('click', e => {
  focusLatLon(e.latlng.lat, e.latlng.lng);
});

function focusLatLon(lat, lon, distance = 2.2) {
  const dir = latLonToCartesian(lat, lon, 1).normalize();
  camera.position.copy(dir.multiplyScalar(distance));
  controls.update();
}

// Sélection d'un drapeau (raycasting)
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(flags);
  if (hits.length) {
    const c = hits[0].object.userData.country;
    showCountry(c);
  }
});

// Affichage d'un pays
function showCountry(c) {
  infoName.textContent = c.name.common;
  infoDetails.innerHTML = `Capitale: ${c.capital ? c.capital[0] : '—'}<br>Région: ${c.region}<br>Population: ${c.population.toLocaleString()}`;
  infoSummary.textContent = 'Chargement du résumé...';
  map.setView(c.latlng, 4);
  focusLatLon(c.latlng[0], c.latlng[1]);
  window.__selectedCountry = c;
}

// Recherche
searchInput.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const found = countries.find(c => c.name.common.toLowerCase().includes(q));
  if (found) showCountry(found);
});

// IA Résumé via OpenAI (client-side fetch — à remplacer par proxy côté serveur si besoin)
// Bouton recherche infos
aiBtn.addEventListener('click', async () => {
  const c = window.__selectedCountry;
  if (!c) return alert('Sélectionnez un pays.');

  infoSummary.textContent = 'Recherche infos sur Internet...';

  try {
    // On utilise l'API Wikipedia en JSON
    const title = encodeURIComponent(c.name.common);
    const url = `https://fr.wikipedia.org/api/rest_v1/page/summary/${title}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Pas de résumé trouvé');

    const json = await res.json();
    infoSummary.textContent = json.extract || 'Aucun résumé trouvé.';
  } catch (err) {
    console.error(err);
    infoSummary.textContent = 'Erreur lors de la recherche';
  }
});


// Synthèse vocale (TTS navigateur)
speakBtn.addEventListener('click', () => {
  const text = infoSummary.textContent;
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utter);
  }
});

// Géolocalisation utilisateur
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    const markerPos = latLonToCartesian(latitude, longitude, 1.02);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    marker.position.copy(markerPos);
    scene.add(marker);
  });
}

// Redimensionnement
window.addEventListener('resize', () => {
  camera.aspect = globeContainer.clientWidth / globeContainer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(globeContainer.clientWidth, globeContainer.clientHeight);
});

// Boucle d'animation
function animate() {
  earth.rotation.y += 0.0006;
  clouds.rotation.y += 0.0009;

  // Mettre à jour la position/orientation des drapeaux
  flags.forEach(flag => {
    // Calculer la position sur le globe avec la rotation actuelle
    const lat = flag.userData.country.latlng[0];
    const lon = flag.userData.country.latlng[1];
    const pos = latLonToCartesian(lat, lon, 1.02);

    // Appliquer la rotation du globe autour de l'axe Y
    const globeRotationMatrix = new THREE.Matrix4().makeRotationY(earth.rotation.y);
    pos.applyMatrix4(globeRotationMatrix);

    flag.position.copy(pos);

    // Faire pointer le drapeau vers l’extérieur de la sphère
    flag.lookAt(pos.clone().multiplyScalar(2));
  });

  controls.update();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// Init
loadCountries();

