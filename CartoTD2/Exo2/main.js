import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';

const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

const camera = new BABYLON.ArcRotateCamera("Camera",1,1,10,new BABYLON.Vector3(0, 0, 0),scene);
camera.attachControl(canvas, true);

const dirLight = new BABYLON.DirectionalLight("dirLight",new BABYLON.Vector3(-1, -2, -1), scene);
dirLight.position = new BABYLON.Vector3(5, 10, 5);
dirLight.intensity = 1.0;

const material = new BABYLON.StandardMaterial("boxMaterial", scene);
material.diffuseTexture = new BABYLON.Texture("stone.png", scene);

const box = BABYLON.MeshBuilder.CreateBox("box",{ size: 1 }, scene);
box.position.x=-5;
box.material=material;

BABYLON.SceneLoader.Append(
  "./", 
  "hl.glb",                      
  scene,
  function (sceneLoaded) {
    console.log("modèle chargé");
    sceneLoaded.meshes.forEach(mesh => {
      mesh.scaling = new BABYLON.Vector3(4,4, 4); 
    });
  },
  null,
  function (error) {
    console.error("erreur de chargement : ", error);
  }
);
window.addEventListener("deviceorientation", function(event) {
  const beta = event.beta || 0;  
  const gamma = event.gamma || 0;

  scene.meshes.forEach(mesh => {
    if (mesh.name !=="box") { 
        mesh.position.x =-1+gamma/20; 
        mesh.position.y =gamma / 20;     
        mesh.rotation.y=beta / 50;      
        }
      });
    }, true);

engine.runRenderLoop(() => {
    scene.render();
    box.rotation.x+=0.01;
    box.rotation.y+=0.01;
    
});

window.addEventListener('resize', () => {
    engine.resize();
});
