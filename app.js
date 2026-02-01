import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';

// ─── DOM refs ───
const canvas = document.getElementById('canvas');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const cropOverlay = document.getElementById('crop-overlay');
const cropCanvas = document.getElementById('crop-canvas');
const cropCtx = cropCanvas.getContext('2d');
const instructions = document.getElementById('instructions');

// ─── Scene ───
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 5);
camera.position.set(0, 0.05, 0.35);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.update();

// ─── Lights ───
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(0.5, 1, 0.8);
scene.add(dirLight);
let lightsOn = true;

// ─── Load model ───
let controllerMesh = null; // primary mesh for DecalGeometry
let controllerMeshes = []; // all meshes for raycasting
const loader = new GLTFLoader();
const modelPath = 'models/sony_ps5_dualsense_controller(1)/scene.gltf';
loader.load(modelPath, (gltf) => {
  const model = gltf.scene;

  // Normalize model size and center it
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const targetSize = 0.2;
  model.scale.multiplyScalar(targetSize / maxDim);
  box.setFromObject(model);
  model.position.sub(box.getCenter(new THREE.Vector3()));

  scene.add(model);

  // Collect all meshes for raycasting
  const allMeshes = [];
  model.traverse((child) => {
    if (child.isMesh) allMeshes.push(child);
  });
  controllerMeshes = allMeshes;

  // Build color picker sidebar
  buildColorPickers(allMeshes);

  showStatus('Model loaded');
}, undefined, (err) => {
  showStatus('Failed to load model');
  console.error(err);
});

// ─── Status helper ───
let statusEl = document.createElement('div');
statusEl.id = 'status';
document.body.appendChild(statusEl);
let statusTimer;
function showStatus(msg) {
  statusEl.textContent = msg;
  statusEl.style.opacity = '1';
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { statusEl.style.opacity = '0'; }, 2500);
}

// ─── Sidebar toggle ───
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  sidebarToggle.textContent = sidebar.classList.contains('open') ? '▶ Colors' : '◀ Colors';
});

// ─── Section Color Picker ───
const sectionMap = {
  'Back Shell': 'Back_Baseq',
  'Front Shell': 'Front_Base',
  'Joystick Caps': 'Thumb_Top',
  'Triggers': 'Trigger_Buttons',
  'Side Panels': 'Side_Panels',
  'Front Panel': 'Front_Panel',
  'Buttons': 'Buttons',
  'PS Logo': 'Logo',
  'Light Bar': 'Emmissive',
  'Port': 'Port',
};

function buildColorPickers(meshes) {
  const container = document.getElementById('color-inputs');
  container.innerHTML = '';
  // Map material names to meshes (multiple meshes can share a material name)
  const matMeshMap = {};
  meshes.forEach(m => {
    const name = m.material?.name || '';
    if (!matMeshMap[name]) matMeshMap[name] = [];
    matMeshMap[name].push(m);
  });

  for (const [label, matName] of Object.entries(sectionMap)) {
    const targets = matMeshMap[matName];
    if (!targets || targets.length === 0) continue;

    // Clone materials so we can tint independently
    targets.forEach(m => {
      if (!m._originalMaterial) {
        m._originalMaterial = m.material;
        m.material = m.material.clone();
      }
    });

    const row = document.createElement('div');
    row.className = 'color-row';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const input = document.createElement('input');
    input.type = 'color';
    input.value = '#ffffff';
    input.addEventListener('input', () => {
      const isWhite = input.value === '#ffffff';
      targets.forEach(m => {
        m.material.color.set(input.value);
        // When tinting, remove the base color map so the color isn't
        // multiplied against a dark texture. Restore it on reset to white.
        if (isWhite) {
          m.material.map = m._originalMaterial.map;
        } else {
          m.material.map = null;
        }
        m.material.needsUpdate = true;
      });
    });
    row.appendChild(lbl);
    row.appendChild(input);
    container.appendChild(row);
  }
}

// ─── Resize ───
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Animation loop ───
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ─── Toolbar ───
document.getElementById('btn-light').addEventListener('click', () => {
  lightsOn = !lightsOn;
  ambientLight.intensity = lightsOn ? 0.6 : 0.15;
  dirLight.intensity = lightsOn ? 1.2 : 0.1;
  showStatus(lightsOn ? 'Lights on' : 'Lights dimmed');
});

document.getElementById('btn-reset').addEventListener('click', () => {
  camera.position.set(0, 0.05, 0.35);
  controls.target.set(0, 0, 0);
  controls.update();
  showStatus('View reset');
});

document.getElementById('btn-clear').addEventListener('click', () => {
  decals.forEach(d => scene.remove(d.mesh));
  decals = [];
  selectedDecal = null;
  refreshLayersPanel();
  showStatus('Decals cleared');
});

// ─── Instructions ───
if (!localStorage.getItem('3dricer-visited')) {
  instructions.classList.remove('hidden');
} else {
  instructions.classList.add('hidden');
}
document.getElementById('btn-dismiss').addEventListener('click', () => {
  instructions.classList.add('hidden');
  localStorage.setItem('3dricer-visited', '1');
});

// ═══════════════════════════════════════════════
// IMAGE IMPORT
// ═══════════════════════════════════════════════
let pendingImage = null; // HTMLImageElement waiting to be cropped

function handleImageFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => openCropUI(img);
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Drag & drop
['dragenter', 'dragover'].forEach(evt => {
  document.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('active'); });
});
['dragleave', 'drop'].forEach(evt => {
  document.addEventListener(evt, () => { dropzone.classList.remove('active'); });
});
document.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  handleImageFile(file);
});

// Click to browse
canvas.addEventListener('click', (e) => {
  // Only open file browser if we're not placing a decal and not interacting with decals
  if (pendingImage || placingTexture) return;
});
dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleImageFile(fileInput.files[0]);
  fileInput.value = '';
});

// Paste
document.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      handleImageFile(item.getAsFile());
      return;
    }
  }
});

// ═══════════════════════════════════════════════
// CROP UI
// ═══════════════════════════════════════════════
let cropImg = null;
let cropRect = { x: 0, y: 0, w: 0, h: 0 };
let cropDragging = false;
let cropStart = { x: 0, y: 0 };

function openCropUI(img) {
  cropImg = img;
  cropOverlay.classList.remove('hidden');
  controls.enabled = false;

  // Size canvas to fit image within viewport
  const maxW = window.innerWidth * 0.8;
  const maxH = window.innerHeight * 0.7;
  let scale = Math.min(maxW / img.width, maxH / img.height, 1);
  cropCanvas.width = img.width * scale;
  cropCanvas.height = img.height * scale;
  cropCanvas._scale = scale;

  // Default crop: center 80%
  const margin = 0.1;
  cropRect = {
    x: img.width * margin,
    y: img.height * margin,
    w: img.width * (1 - 2 * margin),
    h: img.height * (1 - 2 * margin)
  };
  drawCrop();
}

function drawCrop() {
  const s = cropCanvas._scale;
  cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  cropCtx.drawImage(cropImg, 0, 0, cropCanvas.width, cropCanvas.height);
  // Darken outside crop
  cropCtx.fillStyle = 'rgba(0,0,0,0.6)';
  cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
  // Draw cropped area bright
  cropCtx.drawImage(cropImg,
    cropRect.x, cropRect.y, cropRect.w, cropRect.h,
    cropRect.x * s, cropRect.y * s, cropRect.w * s, cropRect.h * s
  );
  // Border
  cropCtx.strokeStyle = '#508cff';
  cropCtx.lineWidth = 2;
  cropCtx.strokeRect(cropRect.x * s, cropRect.y * s, cropRect.w * s, cropRect.h * s);
  // Corner handles
  const corners = [
    [cropRect.x, cropRect.y],
    [cropRect.x + cropRect.w, cropRect.y],
    [cropRect.x, cropRect.y + cropRect.h],
    [cropRect.x + cropRect.w, cropRect.y + cropRect.h],
  ];
  cropCtx.fillStyle = '#508cff';
  corners.forEach(([cx, cy]) => {
    cropCtx.fillRect(cx * s - 5, cy * s - 5, 10, 10);
  });
}

let cropHandle = null; // null | 'move' | 'tl' | 'tr' | 'bl' | 'br'

cropCanvas.addEventListener('mousedown', (e) => {
  const rect = cropCanvas.getBoundingClientRect();
  const s = cropCanvas._scale;
  const mx = (e.clientX - rect.left) / s;
  const my = (e.clientY - rect.top) / s;
  cropStart = { x: mx, y: my, rect: { ...cropRect } };

  const threshold = 12 / s;
  const r = cropRect;
  // Check corners
  if (Math.abs(mx - r.x) < threshold && Math.abs(my - r.y) < threshold) cropHandle = 'tl';
  else if (Math.abs(mx - (r.x + r.w)) < threshold && Math.abs(my - r.y) < threshold) cropHandle = 'tr';
  else if (Math.abs(mx - r.x) < threshold && Math.abs(my - (r.y + r.h)) < threshold) cropHandle = 'bl';
  else if (Math.abs(mx - (r.x + r.w)) < threshold && Math.abs(my - (r.y + r.h)) < threshold) cropHandle = 'br';
  else if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) cropHandle = 'move';
  else {
    // Start new selection
    cropRect = { x: mx, y: my, w: 0, h: 0 };
    cropHandle = 'br';
  }
  cropDragging = true;
});

cropCanvas.addEventListener('mousemove', (e) => {
  if (!cropDragging) return;
  const rect = cropCanvas.getBoundingClientRect();
  const s = cropCanvas._scale;
  const mx = (e.clientX - rect.left) / s;
  const my = (e.clientY - rect.top) / s;
  const dx = mx - cropStart.x;
  const dy = my - cropStart.y;
  const orig = cropStart.rect;

  if (cropHandle === 'move') {
    cropRect.x = Math.max(0, Math.min(cropImg.width - cropRect.w, orig.x + dx));
    cropRect.y = Math.max(0, Math.min(cropImg.height - cropRect.h, orig.y + dy));
  } else if (cropHandle === 'br') {
    cropRect.w = Math.max(10, orig.w + dx);
    cropRect.h = Math.max(10, orig.h + dy);
  } else if (cropHandle === 'tl') {
    cropRect.x = orig.x + dx;
    cropRect.y = orig.y + dy;
    cropRect.w = orig.w - dx;
    cropRect.h = orig.h - dy;
  } else if (cropHandle === 'tr') {
    cropRect.y = orig.y + dy;
    cropRect.w = orig.w + dx;
    cropRect.h = orig.h - dy;
  } else if (cropHandle === 'bl') {
    cropRect.x = orig.x + dx;
    cropRect.w = orig.w - dx;
    cropRect.h = orig.h + dy;
  }
  // Clamp
  cropRect.x = Math.max(0, cropRect.x);
  cropRect.y = Math.max(0, cropRect.y);
  cropRect.w = Math.min(cropImg.width - cropRect.x, Math.max(10, cropRect.w));
  cropRect.h = Math.min(cropImg.height - cropRect.y, Math.max(10, cropRect.h));
  drawCrop();
});

window.addEventListener('mouseup', () => { cropDragging = false; });

document.getElementById('crop-confirm').addEventListener('click', () => {
  // Extract cropped region
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = cropRect.w;
  tempCanvas.height = cropRect.h;
  const tCtx = tempCanvas.getContext('2d');
  tCtx.drawImage(cropImg, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);

  const tex = new THREE.CanvasTexture(tempCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  placingTexture = tex;
  placingThumbnail = tempCanvas.toDataURL('image/png');
  placingAspect = cropRect.w / cropRect.h;
  cropOverlay.classList.add('hidden');
  controls.enabled = true;
  showStatus('Click on controller to place decal');
});

document.getElementById('crop-cancel').addEventListener('click', () => {
  cropOverlay.classList.add('hidden');
  controls.enabled = true;
  placingTexture = null;
});

// ═══════════════════════════════════════════════
// DECALS
// ═══════════════════════════════════════════════
let placingTexture = null;
let placingThumbnail = null;
let placingAspect = 1;
let decals = [];
let selectedDecal = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function getMouseNDC(e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
}

function raycastController(e) {
  if (controllerMeshes.length === 0) return null;
  getMouseNDC(e);
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(controllerMeshes, false);
  if (hits.length > 0) {
    controllerMesh = hits[0].object;
    return hits[0];
  }
  return null;
}

function placeDecal(hit, texture, size = 0.04, rotation = 0, aspect = 1) {
  const position = hit.point.clone();
  const normal = hit.face.normal.clone();
  // Transform normal to world space
  normal.transformDirection(controllerMesh.matrixWorld);
  const orient = new THREE.Euler();

  // Build orientation from normal
  const lookAt = position.clone().add(normal);
  const dummy = new THREE.Object3D();
  dummy.position.copy(position);
  dummy.lookAt(lookAt);
  orient.copy(dummy.rotation);
  orient.z += rotation;

  // Preserve aspect ratio: width = size * aspect, height = size
  const sW = aspect >= 1 ? size : size * aspect;
  const sH = aspect >= 1 ? size / aspect : size;
  const decalSize = new THREE.Vector3(sW, sH, size);
  const decalGeom = new DecalGeometry(controllerMesh, position, orient, decalSize);
  // Nudge decal vertices outward along their normals to prevent z-fighting
  const posAttr = decalGeom.getAttribute('position');
  const normAttr = decalGeom.getAttribute('normal');
  const offset = 0.0003;
  for (let i = 0; i < posAttr.count; i++) {
    posAttr.setXYZ(i,
      posAttr.getX(i) + normAttr.getX(i) * offset,
      posAttr.getY(i) + normAttr.getY(i) * offset,
      posAttr.getZ(i) + normAttr.getZ(i) * offset
    );
  }
  posAttr.needsUpdate = true;
  const decalMat = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const decalMesh = new THREE.Mesh(decalGeom, decalMat);
  scene.add(decalMesh);

  decalMesh.renderOrder = 0;
  const decalObj = { mesh: decalMesh, position, normal, orient, size, rotation, texture, hit, flipH: false, flipV: false, aspect, layer: 0, visible: true, thumbnail: placingThumbnail };
  decals.push(decalObj);
  refreshLayersPanel();
  return decalObj;
}

function rebuildDecal(decal) {
  scene.remove(decal.mesh);
  decal.mesh.geometry.dispose();
  decal.mesh.material.dispose();

  const orient = new THREE.Euler();
  const lookAt = decal.position.clone().add(decal.normal);
  const dummy = new THREE.Object3D();
  dummy.position.copy(decal.position);
  dummy.lookAt(lookAt);
  orient.copy(dummy.rotation);
  orient.z += decal.rotation;
  decal.orient = orient;

  const a = decal.aspect;
  const sW = a >= 1 ? decal.size : decal.size * a;
  const sH = a >= 1 ? decal.size / a : decal.size;
  const decalSize = new THREE.Vector3(sW, sH, decal.size);
  const decalGeom = new DecalGeometry(controllerMesh, decal.position, orient, decalSize);
  const posAttr = decalGeom.getAttribute('position');
  const normAttr = decalGeom.getAttribute('normal');
  const offset = 0.0003;
  for (let i = 0; i < posAttr.count; i++) {
    posAttr.setXYZ(i,
      posAttr.getX(i) + normAttr.getX(i) * offset,
      posAttr.getY(i) + normAttr.getY(i) * offset,
      posAttr.getZ(i) + normAttr.getZ(i) * offset
    );
  }
  posAttr.needsUpdate = true;
  const flippedTex = decal.texture.clone();
  flippedTex.needsUpdate = true;
  flippedTex.repeat.set(decal.flipH ? -1 : 1, decal.flipV ? -1 : 1);
  flippedTex.offset.set(decal.flipH ? 1 : 0, decal.flipV ? 1 : 0);
  flippedTex.wrapS = THREE.RepeatWrapping;
  flippedTex.wrapT = THREE.RepeatWrapping;
  const decalMat = new THREE.MeshStandardMaterial({
    map: flippedTex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  decal.mesh = new THREE.Mesh(decalGeom, decalMat);
  decal.mesh.renderOrder = decal.layer || 0;
  scene.add(decal.mesh);
}

// ─── Click handling ───
let isDraggingDecal = false;
let mouseDownPos = { x: 0, y: 0 };

canvas.addEventListener('mousedown', (e) => {
  mouseDownPos = { x: e.clientX, y: e.clientY };
  if (e.button !== 0) return;

  // Check if clicking a decal to drag
  if (selectedDecal && !placingTexture) {
    getMouseNDC(e);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(selectedDecal.mesh, false);
    if (hits.length > 0) {
      isDraggingDecal = true;
      controls.enabled = false;
      return;
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDraggingDecal || !selectedDecal) return;
  const hit = raycastController(e);
  if (hit) {
    selectedDecal.position.copy(hit.point);
    selectedDecal.normal.copy(hit.face.normal).transformDirection(controllerMesh.matrixWorld);
    selectedDecal.hit = hit;
    rebuildDecal(selectedDecal);
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (isDraggingDecal) {
    isDraggingDecal = false;
    controls.enabled = true;
    return;
  }

  // Only act on clicks (not drags)
  const dist = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
  if (dist > 5) return;
  if (e.button !== 0) return;

  // Placing mode
  if (placingTexture) {
    const hit = raycastController(e);
    if (hit) {
      const decal = placeDecal(hit, placingTexture, 0.04, 0, placingAspect);
      selectedDecal = decal;
      placingTexture = null;
      placingThumbnail = null;
      placingAspect = 1;
      refreshLayersPanel();
      showStatus('Decal placed! Ctrl+Scroll resize, R rotate, H/V flip, Del remove');
    }
    return;
  }

  // Select/deselect existing decal
  getMouseNDC(e);
  raycaster.setFromCamera(mouse, camera);
  for (const d of decals) {
    const hits = raycaster.intersectObject(d.mesh, false);
    if (hits.length > 0) {
      selectedDecal = d;
      refreshLayersPanel();
      showStatus('Decal selected — drag to move, Ctrl+Scroll resize, R/H/V/Del');
      return;
    }
  }
  selectedDecal = null;
  refreshLayersPanel();
});

// ─── Scroll to resize ───
// Intercept wheel BEFORE OrbitControls gets it
renderer.domElement.addEventListener('wheel', (e) => {
  if (selectedDecal && e.ctrlKey) {
    e.preventDefault();
    e.stopImmediatePropagation();
    const delta = e.deltaY > 0 ? -0.003 : 0.003;
    selectedDecal.size = Math.max(0.005, Math.min(0.15, selectedDecal.size + delta));
    rebuildDecal(selectedDecal);
  }
}, { passive: false, capture: true });

// ─── Keyboard ───
document.addEventListener('keydown', (e) => {
  if (!selectedDecal) return;
  if (e.key === 'r' || e.key === 'R') {
    selectedDecal.rotation += Math.PI / 12;
    rebuildDecal(selectedDecal);
    showStatus('Rotated');
  }
  if (e.key === 'e' || e.key === 'E') {
    selectedDecal.rotation -= Math.PI / 12;
    rebuildDecal(selectedDecal);
    showStatus('Rotated');
  }
  if (e.key === 'h' || e.key === 'H') {
    selectedDecal.flipH = !selectedDecal.flipH;
    rebuildDecal(selectedDecal);
    showStatus('Flipped horizontally');
  }
  if (e.key === 'v' || e.key === 'V') {
    selectedDecal.flipV = !selectedDecal.flipV;
    rebuildDecal(selectedDecal);
    showStatus('Flipped vertically');
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    const order = [...decals].sort((a, b) => (b.layer || 0) - (a.layer || 0));
    const idx = order.indexOf(selectedDecal);
    const newIdx = e.key === 'ArrowUp' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= order.length) return;
    order.splice(idx, 1);
    order.splice(newIdx, 0, selectedDecal);
    order.forEach((d, i) => {
      d.layer = order.length - 1 - i;
      d.mesh.renderOrder = d.layer;
    });
    refreshLayersPanel();
    showStatus('Layer: ' + selectedDecal.layer);
  }
  if (e.key === ']') {
    selectedDecal.layer = (selectedDecal.layer || 0) + 1;
    selectedDecal.mesh.renderOrder = selectedDecal.layer;
    refreshLayersPanel();
    showStatus('Layer: ' + selectedDecal.layer);
  }
  if (e.key === '[') {
    selectedDecal.layer = Math.max(0, (selectedDecal.layer || 0) - 1);
    selectedDecal.mesh.renderOrder = selectedDecal.layer;
    refreshLayersPanel();
    showStatus('Layer: ' + selectedDecal.layer);
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    scene.remove(selectedDecal.mesh);
    selectedDecal.mesh.geometry.dispose();
    selectedDecal.mesh.material.dispose();
    decals = decals.filter(d => d !== selectedDecal);
    selectedDecal = null;
    refreshLayersPanel();
    showStatus('Decal removed');
  }
});

// ─── Import button (click on canvas when no action pending) ───
// Double-click to open file browser
canvas.addEventListener('dblclick', () => {
  if (!placingTexture) fileInput.click();
});

// ═══════════════════════════════════════════════
// LAYERS PANEL
// ═══════════════════════════════════════════════
const layersList = document.getElementById('layers-list');
const layersEmpty = document.getElementById('layers-empty');
let dragSrcDecal = null;

function refreshLayersPanel() {
  layersList.innerHTML = '';
  // Sort decals by layer descending (highest on top, like Photoshop)
  const sorted = [...decals].sort((a, b) => (b.layer || 0) - (a.layer || 0));
  layersEmpty.style.display = decals.length === 0 ? '' : 'none';

  sorted.forEach((decal, idx) => {
    const item = document.createElement('div');
    item.className = 'layer-item' + (decal === selectedDecal ? ' selected' : '');
    item.draggable = true;
    item.dataset.idx = idx;

    // Thumbnail
    const thumb = document.createElement('img');
    thumb.className = 'layer-thumb';
    thumb.src = decal.thumbnail || '';
    item.appendChild(thumb);

    // Name
    const name = document.createElement('span');
    name.className = 'layer-name';
    name.textContent = 'Decal ' + (decals.indexOf(decal) + 1);
    item.appendChild(name);

    // Eye toggle
    const eye = document.createElement('button');
    eye.className = 'layer-eye' + (decal.visible === false ? ' hidden-decal' : '');
    eye.textContent = decal.visible === false ? '\u25CC' : '\u25C9';
    eye.title = decal.visible === false ? 'Show' : 'Hide';
    eye.addEventListener('click', (e) => {
      e.stopPropagation();
      decal.visible = !decal.visible;
      decal.mesh.visible = decal.visible;
      refreshLayersPanel();
    });
    item.appendChild(eye);

    // Click to select
    item.addEventListener('click', () => {
      selectedDecal = decal;
      refreshLayersPanel();
      showStatus('Decal ' + (decals.indexOf(decal) + 1) + ' selected — Layer ' + (decal.layer || 0));
    });

    // Drag to reorder
    item.addEventListener('dragstart', (e) => {
      dragSrcDecal = decal;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      dragSrcDecal = null;
      // Remove all drag-over indicators
      layersList.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      // Clear others, highlight this
      layersList.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      if (dragSrcDecal !== decal) item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      if (!dragSrcDecal || dragSrcDecal === decal) return;
      // Reorder: move dragged decal to the dropped position in sorted order,
      // then reassign layers top-down so they get unique contiguous values.
      const order = [...decals].sort((a, b) => (b.layer || 0) - (a.layer || 0));
      order.splice(order.indexOf(dragSrcDecal), 1);
      const dropIdx = order.indexOf(decal);
      order.splice(dropIdx, 0, dragSrcDecal);
      // Reassign layers: top of list = highest layer
      order.forEach((d, i) => {
        d.layer = order.length - 1 - i;
        d.mesh.renderOrder = d.layer;
      });
      refreshLayersPanel();
    });

    layersList.appendChild(item);
  });
}

showStatus('Loading model…');
