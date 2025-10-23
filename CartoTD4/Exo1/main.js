import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- DOM ---
const globeContainer = document.getElementById('globe');
const mapContainer = document.getElementById('map');
const infoName = document.getElementById('country-name');
const infoSummary = document.getElementById('country-summary');
const infoDetails = document.getElementById('country-details');
const aiBtn = document.getElementById('ai-summary');
const speakBtn = document.getElementById('speak');
const searchInput = document.getElementById('search');

// --- Scène ---
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

// --- LatLon -> Cartesian ---
function latLonToCartesian(lat, lon, radius = 1) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

// --- Pays / drapeaux / capitales ---
const flags = [];
const capitalsDots = [];
let countries = [];

async function loadCountries() {
  const res = await fetch('https://restcountries.com/v3.1/all?fields=name,latlng,flags,population,capital,region');
  countries = await res.json();

  countries.forEach(c => {
    if (!c.latlng) return;
    const [lat, lon] = c.latlng;

    // Drapeaux
    const tex = new THREE.TextureLoader().load(c.flags.png);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.07), mat);
    flag.userData = { country: c, lat, lon };
    scene.add(flag);
    flags.push(flag);

    // Capitales
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

// --- Raycaster ---
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredFlag = null;

// --- Caméra fluide ---
let cameraTarget = null;
let cameraStart = null;
let cameraStartTime = null;
const cameraDuration = 800;

function focusLatLon(lat, lon, distance = 2.2) {
  const targetPos = latLonToCartesian(lat, lon, distance).applyAxisAngle(new THREE.Vector3(0,1,0), earth.rotation.y);
  cameraStart = camera.position.clone();
  cameraTarget = targetPos.clone();
  cameraStartTime = performance.now();
}

function updateCamera() {
  if (cameraTarget && cameraStart) {
    const t = Math.min((performance.now() - cameraStartTime)/cameraDuration, 1);
    camera.position.lerpVectors(cameraStart, cameraTarget, t);
    camera.lookAt(earth.position);
    if (t>=1) cameraTarget=null;
  }
}

// --- Drapeaux / survol ---
renderer.domElement.addEventListener('mousemove', e => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(flags);
  if (hits.length) {
    const flag = hits[0].object;
    if (hoveredFlag !== flag) {
      if (hoveredFlag) hoveredFlag.scale.set(1,1,1);
      flag.scale.set(1.5,1.5,1.5);
      hoveredFlag = flag;
    }
  } else {
    if (hoveredFlag) hoveredFlag.scale.set(1,1,1);
    hoveredFlag = null;
  }
});

renderer.domElement.addEventListener('click', e => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(flags);
  if (hits.length) showCountry(hits[0].object.userData.country);

  // Quiz check (seulement sur drapeau)
  if (window.quizCountry && hits.length) {
    if (hits[0].object.userData.country.name.common === window.quizCountry.name.common) {
      alert('✅ Correct !');
      startQuiz();
    } else {
      alert('❌ Faux, essaie encore !');
    }
  }
});

// --- Affichage pays ---
function showCountry(c) {
  infoName.textContent = c.name.common;
  infoDetails.innerHTML = `Capitale: ${c.capital ? c.capital[0] : '—'}<br>Région: ${c.region}<br>Population: ${c.population.toLocaleString()}`;
  infoSummary.textContent = 'Recherche infos sur Internet...';
  if (c.latlng) map.setView(c.latlng, 4);
  if (c.latlng) focusLatLon(c.latlng[0], c.latlng[1]);
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
  try {
    const title = encodeURIComponent(c.name.common);
    const url = `https://fr.wikipedia.org/api/rest_v1/page/summary/${title}`;
    const res = await fetch(url);
    const json = await res.json();
    infoSummary.textContent = json.extract || 'Aucun résumé trouvé.';
  } catch (err) {
    infoSummary.textContent = 'Erreur lors de la recherche';
  }
});

// --- TTS ---
speakBtn.addEventListener('click', () => {
  const text = infoSummary.textContent;
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utter);
  }
});

// --- Quiz ---
const quizBtn = document.createElement('button');
quizBtn.textContent = 'Quiz : trouve le pays';
quizBtn.style.position = 'absolute';
quizBtn.style.top = '10px';
quizBtn.style.right = '10px';
quizBtn.style.zIndex = '10';
globeContainer.appendChild(quizBtn);
quizBtn.addEventListener('click', startQuiz);

function startQuiz() {
  if (!countries.length) return;
  const randomIndex = Math.floor(Math.random()*countries.length);
  const c = countries[randomIndex];
  window.quizCountry = c;
  alert(`Clique sur le drapeau de : ${c.name.common}`);
}

// --- Rotation globe ---
let rotating = true;
const rotateBtn = document.createElement('button');
rotateBtn.textContent = 'Stop / Start rotation';
rotateBtn.style.position = 'absolute';
// Placé juste en dessous du bouton quiz
rotateBtn.style.top = '50px'; // 10px + hauteur approximative du quiz + marge
rotateBtn.style.right = '10px';
rotateBtn.style.zIndex = '10';
globeContainer.appendChild(rotateBtn);
rotateBtn.addEventListener('click', () => rotating = !rotating);

// --- Animate ---
function animate() {
  if (rotating) {
    earth.rotation.y += 0.0003;
    clouds.rotation.y += 0.0005;
  }

  // Drapeaux suivent globe
  flags.forEach(flag => {
    const { lat, lon } = flag.userData;
    const pos = latLonToCartesian(lat, lon, 1.02);
    pos.applyAxisAngle(new THREE.Vector3(0,1,0), earth.rotation.y);
    flag.position.copy(pos);
    flag.lookAt(pos.clone().multiplyScalar(2));
  });

  // Capitales suivent globe
  capitalsDots.forEach(dot => {
    const { lat, lon } = dot.userData;
    const pos = latLonToCartesian(lat, lon, 1.01);
    pos.applyAxisAngle(new THREE.Vector3(0,1,0), earth.rotation.y);
    dot.position.copy(pos);
  });

  // Camera fluide
  updateCamera();

  controls.update();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = globeContainer.clientWidth / globeContainer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(globeContainer.clientWidth, globeContainer.clientHeight);
});
