import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';

const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);
var camera = new BABYLON.ArcRotateCamera("Camera", 1, 0.8, 10, new BABYLON.Vector3(0, 0, 0), scene);

const box = BABYLON.MeshBuilder.CreateBox("box", { size: 2 }, scene);
const material = new BABYLON.StandardMaterial("boxMaterial", scene);
material.diffuseColor = new BABYLON.Color3(1, 0, 0);
box.material = material;

engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener('resize', () => {
    engine.resize();
});