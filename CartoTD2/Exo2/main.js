import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';

const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

const camera = new BABYLON.ArcRotateCamera("Camera",1,1,10,new BABYLON.Vector3(0, 0, 0),scene);
camera.attachControl(canvas, true);

const light = new BABYLON.HemisphericLight("light1",new BABYLON.Vector3(0, 1, 0),scene);

const material = new BABYLON.StandardMaterial("boxMaterial", scene);
material.diffuseTexture = new BABYLON.Texture("stone.png", scene);

const box = BABYLON.MeshBuilder.CreateBox("box",{ size: 2 }, scene);
box.material=material;

BABYLON.SceneLoader.Append(
  ".", 
  "hl.glb",                      
  scene,
  function (sceneLoaded) {
    console.log("modèle chargé");
  },
  null,
  function (error) {
    console.error("erreur de chargement : ", error);
  }
);


engine.runRenderLoop(() => {
    scene.render();
    box.rotation.x+=0.01;
    box.rotation.y+=0.01;
    
});

window.addEventListener('resize', () => {
    engine.resize();
});
