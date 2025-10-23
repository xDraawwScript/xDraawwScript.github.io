import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Sélecteurs DOM ---
const globeContainer = document.getElementById('globe');
const mapContainer = document.getElementById('map');
const infoName = document.getElementById('country-name');
const infoSummary = document.getElementById('country-summary');
const infoDetails = document.getElementById('country-details');
const aiBtn = document.getElementById('ai-summary');
const speakBtn = document.getElementById('speak');
const searchInput = document.getElementById('search');

// --- Scène Three.js ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const camera = new THREE.PerspectiveCamera(45, globeContainer.clientWidth / globeContainer.clientHeight, 0.1, 1000);
camera.position.z = 2.5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(globeContainer.clientWidth, globeContainer.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
globeContainer.appendChild(renderer.domElement);

// --- Lumières ---
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const light = new THREE.DirectionalLight(0xffffff, 0.6);
light.position.set(5, 3, 5);
scene.add(light);

// --- Contrôles ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 1.5;
controls.maxDistance = 6;

// --- Globe ---
const loader = new THREE.TextureLoader();
const earthTex = loader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg');
const cloudsTex = loader.load('https://threejs.org/examples/textures/planets/earth_clouds_1024.png');

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(1, 128, 128),
  new THREE.MeshPhongMaterial({ map: earthTex })
);
scene.add(earth);

const clouds = new THREE.Mesh(
  new THREE.SphereGeometry(1.005, 128, 128),
  new THREE.MeshPhongMaterial({ map: cloudsTex, transparent: true, opacity: 0.5 })
);
scene.add(clouds);

// --- Halo atmosphérique ---
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

// --- Conversion lat/lon -> coord cartésienne ---
function latLonToCartesian(lat, lon, radius = 1) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

// --- Pays & drapeaux ---
const flags = [];
const capitalsDots = [];
let countries = [];

async function loadCountries() {
  const res = await fetch('https://restcountries.com/v3.1/all?fields=name,latlng,flags,population,capital,region');
  countries = await res.json();

  countries.forEach(c => {
    if (!c.latlng) return;
    const [lat, lon] = c.latlng;

    // --- Drapeaux ---
    const tex = new THREE.TextureLoader().load(c.flags.png);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 0.07),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
    );
    flag.userData = { country: c, lat, lon };
    scene.add(flag);
    flags.push(flag);

    // --- Capitales (points lumineux) ---
    if (c.capital) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.01, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffff00 })
      );
      dot.userData = { lat, lon };
      scene.add(dot);
      capitalsDots.push(dot);
    }
  });
}
loadCountries();

// --- Map Leaflet ---
const map = L.map(mapContainer).setView([0, 0], 2);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 5 }).addTo(map);
map.on('click', e => focusLatLon(e.latlng.lat, e.latlng.lng));

function focusLatLon(lat, lon, distance = 2.2) {
  const dir = latLonToCartesian(lat, lon, 1).normalize();
  camera.position.copy(dir.multiplyScalar(distance));
  controls.update();
}

// --- Sélection drapeau ---
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredFlag = null;

renderer.domElement.addEventListener('click', e => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(flags);
  if (hits.length) showCountry(hits[0].object.userData.country);
});

// --- Hover drapeaux ---
renderer.domElement.addEventListener('mousemove', e => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(flags);

  if (hits.length) {
    const flag = hits[0].object;
    if (hoveredFlag !== flag) {
      if (hoveredFlag) hoveredFlag.scale.set(1, 1, 1);
      flag.scale.set(1.5, 1.5, 1.5);
      hoveredFlag = flag;
    }
  } else {
    if (hoveredFlag) hoveredFlag.scale.set(1, 1, 1);
    hoveredFlag = null;
  }
});

// --- Affichage d'un pays ---
function showCountry(c) {
  infoName.textContent = c.name.common;
  infoDetails.innerHTML = `Capitale: ${c.capital ? c.capital[0] : '—'}<br>Région: ${c.region}<br>Population: ${c.population.toLocaleString()}`;
  infoSummary.textContent = 'Chargement infos...';
  map.setView(c.latlng, 4);
  focusLatLon(c.latlng[0], c.latlng[1]);
  window.__selectedCountry = c;
}

// --- Recherche ---
searchInput.addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  const found = countries.find(c => c.name.common.toLowerCase().includes(q));
  if (found) showCountry(found);
});

// --- Résumé Wikipedia ---
aiBtn.addEventListener('click', async () => {
  const c = window.__selectedCountry;
  if (!c) return alert('Sélectionnez un pays.');
  infoSummary.textContent = 'Recherche infos sur Internet...';
  try {
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

// --- Synthèse vocale ---
speakBtn.addEventListener('click', () => {
  const text = infoSummary.textContent;
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utter);
  }
});

// --- Géolocalisation utilisateur ---
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    const userMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    userMarker.userData = { lat: latitude, lon: longitude };
    scene.add(userMarker);
    window.userMarker = userMarker;
  });
}

// --- Options supplémentaires ---
let autoRotate = true;
const rotateBtn = document.createElement('button');
rotateBtn.textContent = 'Pause rotation';
rotateBtn.style.position = 'absolute';
rotateBtn.style.top = '10px';
rotateBtn.style.right = '10px';
rotateBtn.style.zIndex = '10';
rotateBtn.style.padding = '6px 10px';
globeContainer.appendChild(rotateBtn);
rotateBtn.addEventListener('click', () => {
  autoRotate = !autoRotate;
  rotateBtn.textContent = autoRotate ? 'Pause rotation' : 'Reprendre rotation';
});

// --- Zoom slider bas ---
const zoomSlider = document.createElement('input');
zoomSlider.type = 'range';
zoomSlider.min = 1.2;
zoomSlider.max = 5;
zoomSlider.step = 0.01;
zoomSlider.value = 2;
zoomSlider.style.position = 'absolute';
zoomSlider.style.bottom = '10px';
zoomSlider.style.left = '80%';
zoomSlider.style.transform = 'translateX(-50%)';
zoomSlider.style.zIndex = '10';
zoomSlider.style.width = '150px';
globeContainer.appendChild(zoomSlider);
zoomSlider.addEventListener('input', () => {
  const dir = camera.position.clone().normalize();
  camera.position.copy(dir.multiplyScalar(parseFloat(zoomSlider.value)));
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = globeContainer.clientWidth / globeContainer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(globeContainer.clientWidth, globeContainer.clientHeight);
});

// --- Animation ---
function animate() {
  if (autoRotate) {
    earth.rotation.y += 0.0003;
    clouds.rotation.y += 0.0005;
  }

  // Drapeaux suivent le globe
  flags.forEach(flag => {
    const { lat, lon } = flag.userData;
    const pos = latLonToCartesian(lat, lon, 1.02);
    const m = new THREE.Matrix4().makeRotationY(earth.rotation.y);
    pos.applyMatrix4(m);
    flag.position.copy(pos);
    flag.lookAt(pos.clone().multiplyScalar(2));
  });

  // Capitales suivent le globe
  capitalsDots.forEach(dot => {
    const { lat, lon } = dot.userData;
    const pos = latLonToCartesian(lat, lon, 1.01);
    const m = new THREE.Matrix4().makeRotationY(earth.rotation.y);
    pos.applyMatrix4(m);
    dot.position.copy(pos);
  });

  // Marqueur utilisateur suit le globe
  if (window.userMarker) {
    const { lat, lon } = window.userMarker.userData;
    const pos = latLonToCartesian(lat, lon, 1.02);
    const m = new THREE.Matrix4().makeRotationY(earth.rotation.y);
    pos.applyMatrix4(m);
    window.userMarker.position.copy(pos);
  }

  controls.update();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
