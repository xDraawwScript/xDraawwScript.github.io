import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();

const globeContainer = document.getElementById('globe');
const camera = new THREE.PerspectiveCamera(75,globeContainer.clientWidth / globeContainer.clientHeight,0.1,1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(globeContainer.clientWidth, globeContainer.clientHeight);
globeContainer.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg');

const geometry = new THREE.SphereGeometry(1, 64, 64);
const material = new THREE.MeshPhongMaterial({ map: earthTexture });
const earth = new THREE.Mesh(geometry, material);
scene.add(earth);

camera.position.z= 2;

const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.rotateSpeed = 1;
    controls.zoomSpeed =1;
    controls.enablePan = false; 
    controls.minDistance = 1.5;
    controls.maxDistance = 6;

function latLonToCartesian(lat, lon, radius = 1) { // Générée par ia
    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon + 180);
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
}

if ("geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition((position) => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const markerPos = latLonToCartesian(lat,lon,1.02);
    const markerGeo = new THREE.SphereGeometry(0.02, 8, 88);
    const markerMat = new THREE.MeshBasicMaterial({color: 0xff0000 });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.copy(markerPos);
    scene.add(marker);
    }
);
}else{
    console.error("geoloc non supportée");
}

function createFlagIcon(flagUrl) {
    return L.icon({
        iconUrl:flagUrl,iconSize:[25,15], iconAnchor:[12,7], 
    });}

const flags= []

function addFlag(lat, lon, flagUrl){
  const pos = latLonToCartesian(lat, lon, 1.02);

  const flagTexture= new THREE.TextureLoader().load(flagUrl);
  const flagGeo= new THREE.PlaneGeometry(0.1, 0.04);
  const flagMat= new THREE.MeshBasicMaterial({map: flagTexture,side: THREE.DoubleSide,transparent: true});

  const flag =new THREE.Mesh(flagGeo, flagMat);
  flag.position.copy(pos);
  flag.lookAt(new THREE.Vector3(0,0,0)); //orientation drapeaux
  flag.userData = { lat, lon };

  scene.add(flag);
  flags.push(flag);
}
async function loadCountries(){
    const response = await fetch('https://restcountries.com/v3.1/all?fields=name,latlng,flags')
    const countries = await response.json();
    countries.forEach(country =>{
        const latlng = country.latlng;   
        const flagUrl = country.flags.png;
        const name = country.name.common;
        if (latlng && flagUrl) {
          addFlag(latlng[0], latlng[1], flagUrl, name);
          const marker = L.marker([latlng[0], latlng[1]], { icon: createFlagIcon(flagUrl) }).addTo(map)
        }
    });
}
loadCountries();
function animate(){
    controls.update()
    renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);


const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 5,
  attribution: '© OpenStreetMap'
}).addTo(map);

map.on('click',(e)=> {
  const {lat,lng} = e.latlng;
  const target = latLonToCartesian(lat, lng, 1);
  const direction =target.clone().normalize();
  const newCameraPos = direction.multiplyScalar(2);
  camera.position.copy(newCameraPos);
  camera.lookAt(earth.position);
});


const raycaster=new THREE.Raycaster();
const mouse =new THREE.Vector2();
renderer.domElement.addEventListener('click',(event) => {
    const rect =renderer.domElement.getBoundingClientRect();

    // calcul mouse généré
    mouse.x=((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(flags);
    const flag = intersects[0].object;
    const { lat, lon } = flag.userData;
    map.setView([lat, lon], 4);
});
