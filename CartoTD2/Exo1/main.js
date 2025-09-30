import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xff0000, 0.1);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);
const geometry = new THREE.BoxGeometry(1, 1, 1);
const loader = new THREE.TextureLoader();
const texture = loader.load('resources/dirt.png');
texture.colorSpace = THREE.SRGBColorSpace;
const material = new THREE.MeshStandardMaterial({ map: texture });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);


let rose;  
const gltfLoader = new GLTFLoader();
gltfLoader.load('resources/red_rose.glb', (gltf) => {
    rose = gltf.scene;
    rose.position.set(-2, -2, 0);
    rose.rotation.x = 0.3;
    scene.add(rose);
}, undefined, (error) => {
    console.error(error);
});

camera.position.z = 5;

function animate() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

window.addEventListener('devicemotion', (event) => {
    const ax = event.accelerationIncludingGravity.x || 0;
    const ay = event.accelerationIncludingGravity.y || 0;
    cube.position.x=ax;
    cube.position.y=ay;
    if (rose){
        rose.position.x =ax -2;
        rose.position.y = ay- 2;
    }
});

if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
            if (permissionState === 'granted') {
                window.addEventListener('deviceorientation', (event) => {
                    const beta = THREE.MathUtils.degToRad(event.beta || 0);
                    const gamma = THREE.MathUtils.degToRad(event.gamma || 0);
                    cube.rotation.x = beta;
                    cube.rotation.y = gamma;
                    if (rose) {
                        rose.rotation.x = beta + 0.3;
                        rose.rotation.y = gamma;
                    }
                });
            }
        })
        .catch(console.error);
}
