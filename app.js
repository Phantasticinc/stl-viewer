import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {STLLoader} from './vendor/STLLoader.js';
const $=id=>document.getElementById(id);
// ---- Install button ----
const btn=$('install');let deferred=null;
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const show=v=>{btn.hidden=!v;document.body.classList.toggle('has-install',v)};
show(false);
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;if(!standalone())show(true)});
btn.onclick=async()=>{if(!deferred)return;deferred.prompt();const r=await deferred.userChoice;deferred=null;show(false);if(r.outcome==='accepted')localStorage.setItem('installed','1')};
addEventListener('appinstalled',()=>{deferred=null;localStorage.setItem('installed','1');show(false)});
matchMedia('(display-mode: standalone)').addEventListener('change',()=>{if(standalone())show(false)});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
// ---- Viewer ----
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0f172a);
const camera=new THREE.PerspectiveCamera(45,1,0.01,1e6);
scene.add(new THREE.HemisphereLight(0xffffff,0x334155,1.2));const dl=new THREE.DirectionalLight(0xffffff,1.5);camera.add(dl);dl.position.set(1,1,2);scene.add(camera);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.screenSpacePanning=true;
const mat=new THREE.MeshStandardMaterial({color:0x60a5fa,metalness:.1,roughness:.6,side:THREE.DoubleSide});
let mesh=null,home=null;
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();
(function loop(){requestAnimationFrame(loop);controls.update();renderer.render(scene,camera)})();
function frame(){if(!mesh)return;const s=new THREE.Box3().setFromObject(mesh).getBoundingSphere(new THREE.Sphere());
const d=s.radius/Math.sin(THREE.MathUtils.degToRad(camera.fov/2))*1.1;controls.target.copy(s.center);
camera.position.copy(s.center).add(new THREE.Vector3(1,.8,1).normalize().multiplyScalar(d));camera.near=d/1000;camera.far=d*100;camera.updateProjectionMatrix();controls.update()}
function load(buf,name){try{const g=new STLLoader().parse(buf);g.computeVertexNormals();g.center();
if(mesh){scene.remove(mesh);mesh.geometry.dispose()}mesh=new THREE.Mesh(g,mat);mesh.rotation.x=-Math.PI/2;scene.add(mesh);
g.computeBoundingBox();const b=g.boundingBox,sz=b.getSize(new THREE.Vector3()),f=n=>+n.toFixed(2);
const tris=g.index?g.index.count/3:g.attributes.position.count/3;
$('info').textContent=`${name}\nTriangles: ${tris.toLocaleString()}\nSize: ${f(sz.x)} × ${f(sz.y)} × ${f(sz.z)}`;$('hint').style.display='none';frame();window.__stl={tris,size:[sz.x,sz.y,sz.z]}}
catch(e){$('info').textContent='Could not read file: '+e.message}}
const readFile=async f=>load(await f.arrayBuffer(),f.name);
$('file').onchange=e=>e.target.files[0]&&readFile(e.target.files[0]);
$('reset').onclick=frame;$('wire').onclick=()=>{mat.wireframe=!mat.wireframe;$('wire').textContent=mat.wireframe?'Solid':'Wireframe'};
addEventListener('dragover',e=>{e.preventDefault();document.body.classList.add('dragging')});
addEventListener('dragleave',e=>{if(!e.relatedTarget)document.body.classList.remove('dragging')});
addEventListener('drop',e=>{e.preventDefault();document.body.classList.remove('dragging');const f=e.dataTransfer.files[0];f&&readFile(f)});
if('launchQueue'in window)launchQueue.setConsumer(async p=>{if(p.files?.length)readFile(await p.files[0].getFile())});
const q=new URLSearchParams(location.search).get('load');if(q)fetch(q).then(r=>r.arrayBuffer()).then(b=>load(b,q));
