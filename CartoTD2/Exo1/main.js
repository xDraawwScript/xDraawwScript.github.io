import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
{
const color = 0xff0000;
  const density = 0.1;
  scene.fog = new THREE.FogExp2(color, density);
}
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const loader = new THREE.TextureLoader();
const texture = loader.load( 'resources/dirt.png' );
texture.colorSpace = THREE.SRGBColorSpace;
const material = new THREE.MeshStandardMaterial({ map: texture});
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

const gltfloader = new GLTFLoader();
gltfloader.load( 'red_rose.glb', function ( gltf ) {
    const rose = gltf.scene;
    rose.position.x=-2;
    rose.position.y=-2;
    rose.rotation.x+=0.3;
  scene.add( gltf.scene );
}, undefined, function ( error ) {
  console.error( error );
} );

camera.position.z = 5;


function animate() {
  renderer.render( scene, camera );
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
}
renderer.setAnimationLoop( animate );

window.addEventListener('devicemotion', (event) => {
    const ax = event.accelerationIncludingGravity.x || 0;
    const ay = event.accelerationIncludingGravity.y || 0;
    cube.position.x = ax;
    cube.position.y = ay;
    if (rose) {
        rose.position.x =ax - 2;
        rose.position.y =ay;
    }
});

if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
            if (permissionState === 'granted') {
                window.addEventListener('deviceorientation', handleOrientation);
            }
        })
        .catch(console.error);
}