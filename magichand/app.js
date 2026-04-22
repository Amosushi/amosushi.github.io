// app.js — MagicHand 手势控制神经网络可视化
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

console.log('[MagicHand] app.js module loaded');

// ====== Intro Sequence ======
document.body.classList.add('intro-active');
function playIntro() {
  const line1 = document.getElementById('intro-line1');
  const line2 = document.getElementById('intro-line2');
  const overlay = document.getElementById('intro-overlay');

  setTimeout(() => { if (line1) line1.classList.add('show'); }, 600);
  setTimeout(() => { if (line2) line2.classList.add('show'); }, 2200);
  setTimeout(() => {
    if (overlay) overlay.classList.add('fade-out');
    document.body.classList.remove('intro-active');
    document.body.classList.add('ui-reveal');
    // 让 UI 元素正常渐入
    requestAnimationFrame(() => {
      const startBtn = document.getElementById('start-btn');
      const statusPanel = document.getElementById('status-panel');
      const guidePanel = document.getElementById('guide-panel');
      if (startBtn) startBtn.style.opacity = '';
      if (statusPanel) statusPanel.style.opacity = '';
      if (guidePanel) guidePanel.style.opacity = '';
      document.body.classList.remove('ui-reveal');
    });
    // 清理 DOM
    setTimeout(() => { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 1000);
  }, 5200);
}
playIntro();

// ====== 配置 ======
const CFG = { paused: false, palIdx: 1, form: 0, nForms: 4, dens: 1 };
const F_NAMES = ['Quantum Cortex', 'Hyper Mesh', 'Neural Vortex', 'Synapse Cloud'];
const T_NAMES = ['Aurora', 'Flame', 'Electric Pink', 'Nature'];

// ====== 工具 ======
let toastT;
function showToast(m) {
  const e = document.getElementById('toast');
  if (!e) return;
  e.textContent = m; e.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 1200);
}

// ====== Three.js 场景（完全对齐原版 CodePen） ======
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.0015);

const cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1200);
cam.position.set(0, 5, 22);

const cvs = document.getElementById('neural-canvas');
const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000);
renderer.outputColorSpace = THREE.SRGBColorSpace;

// 星空（和原版一致）
!function () {
  const p = [];
  for (let i = 0; i < 5000; i++) {
    const r = THREE.MathUtils.randFloat(40, 120), ph = Math.acos(THREE.MathUtils.randFloatSpread(2)), t = THREE.MathUtils.randFloat(0, Math.PI * 2);
    p.push(r * Math.sin(ph) * Math.cos(t), r * Math.sin(ph) * Math.sin(t), r * Math.cos(ph));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: .15, sizeAttenuation: true, depthWrite: false, opacity: .8, transparent: true })));
}();

const oc = new OrbitControls(cam, renderer.domElement);
oc.enableDamping = true; oc.dampingFactor = .05; oc.rotateSpeed = .5;
oc.minDistance = 5; oc.maxDistance = 100; oc.autoRotate = true; oc.autoRotateSpeed = .15; oc.enablePan = false;

const comp = new EffectComposer(renderer);
comp.addPass(new RenderPass(scene, cam));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.5, 0.4, 0.68);
comp.addPass(bloomPass);
const filmPass = new FilmPass(0.35, 0.55, 2048, false);
comp.addPass(filmPass);
comp.addPass(new OutputPass());

// ====== 配色方案（和原版完全一致） ======
const colorPalettes = [
  [0x4F46E5, 0x7C3AED, 0xC026D3, 0xDB2777, 0x8B5CF6],
  [0xF59E0B, 0xF97316, 0xDC2626, 0x7F1D1D, 0xFBBF24],
  [0xEC4899, 0x8B5CF6, 0x6366F1, 0x3B82F6, 0xA855F7],
  [0x10B981, 0xA3E635, 0xFACC15, 0xFB923C, 0x4ADE80]
].map(p => p.map(c => new THREE.Color(c)));

// ====== Shaders（完全使用原版 CodePen 的 shader 代码） ======
const pulseUniforms = {
  uTime: { value: 0.0 },
  uPulsePositions: { value: [new THREE.Vector3(1e3, 1e3, 1e3), new THREE.Vector3(1e3, 1e3, 1e3), new THREE.Vector3(1e3, 1e3, 1e3)] },
  uPulseTimes: { value: [-1e3, -1e3, -1e3] },
  uPulseColors: { value: [new THREE.Color(1, 1, 1), new THREE.Color(1, 1, 1), new THREE.Color(1, 1, 1)] },
  uPulseSpeed: { value: 15.0 },
  uBaseNodeSize: { value: 0.5 },
  uActivePalette: { value: 0 }
};

// ====== Noise 函数 — 使用经典 Ashima Arts 3D simplex noise ======
const noiseFunctions = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  // 第一角
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  // 其他角
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  // 排列
  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  // 梯度
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x2_ = x_ * ns.x + ns.yyyy;
  vec4 y2_ = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x2_) - abs(y2_);

  vec4 b0 = vec4(x2_.xy, y2_.xy);
  vec4 b1 = vec4(x2_.zw, y2_.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  // 归一化
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // 混合结果
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float fbm(vec3 p, float time) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 3; i++) {
    value += amplitude * snoise(p * frequency + time * 0.2 * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}
`;

// ====== 节点 Shader ======
const nodeShader = {
  vertexShader: noiseFunctions + `
attribute float nodeSize;
attribute float nodeType;
attribute vec3 nodeColor;
attribute vec3 connectionIndices;
attribute float distanceFromRoot;

uniform float uTime;
uniform vec3 uPulsePositions[3];
uniform float uPulseTimes[3];
uniform float uPulseSpeed;
uniform float uBaseNodeSize;

varying vec3 vColor;
varying float vNodeType;
varying vec3 vPosition;
varying float vPulseIntensity;
varying float vDistanceFromRoot;

float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
  if (pulseTime < 0.0) return 0.0;
  float timeSinceClick = uTime - pulseTime;
  if (timeSinceClick < 0.0 || timeSinceClick > 3.0) return 0.0;
  float pulseRadius = timeSinceClick * uPulseSpeed;
  float distToClick = distance(worldPos, pulsePos);
  float pulseThickness = 2.0;
  float waveProximity = abs(distToClick - pulseRadius);
  return smoothstep(pulseThickness, 0.0, waveProximity) * smoothstep(3.0, 0.0, timeSinceClick);
}

void main() {
  vNodeType = nodeType;
  vColor = nodeColor;
  vDistanceFromRoot = distanceFromRoot;
  vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  vPosition = worldPos;

  float totalPulseIntensity = 0.0;
  for (int i = 0; i < 3; i++) {
    totalPulseIntensity += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
  }
  vPulseIntensity = min(totalPulseIntensity, 1.0);

  float timeScale = 0.5 + 0.5 * sin(uTime * 0.8 + distanceFromRoot * 0.2);
  float baseSize = nodeSize * (0.8 + 0.2 * timeScale);
  float pulseSize = baseSize * (1.0 + vPulseIntensity * 2.0);

  vec3 modifiedPosition = position;
  if (nodeType > 0.5) {
    float noiseVal = fbm(position * 0.1, uTime * 0.1);
    modifiedPosition += normal * noiseVal * 0.2;
  }

  vec4 mvPosition = modelViewMatrix * vec4(modifiedPosition, 1.0);
  gl_PointSize = pulseSize * uBaseNodeSize * (800.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}`,

  fragmentShader: `
uniform float uTime;
uniform vec3 uPulseColors[3];
uniform int uActivePalette;

varying vec3 vColor;
varying float vNodeType;
varying vec3 vPosition;
varying float vPulseIntensity;
varying float vDistanceFromRoot;

void main() {
  vec2 center = 2.0 * gl_PointCoord - 1.0;
  float dist = length(center);
  if (dist > 1.0) discard;
  float glowStrength = pow(1.0 - smoothstep(0.0, 1.0, dist), 1.4);

  vec3 baseColor = vColor * (0.8 + 0.2 * sin(uTime * 0.5 + vDistanceFromRoot * 0.3));
  vec3 finalColor = baseColor;
  if (vPulseIntensity > 0.0) {
    vec3 pulseColor = mix(vec3(1.0), uPulseColors[0], 0.3);
    finalColor = mix(baseColor, pulseColor, vPulseIntensity);
    finalColor *= (1.0 + vPulseIntensity * 0.7);
  }

  float alpha = glowStrength * (0.9 - 0.5 * dist);
  float camDistance = length(vPosition - cameraPosition);
  float distanceFade = smoothstep(80.0, 10.0, camDistance);
  if (vNodeType > 0.5) { alpha *= 0.85; } else { finalColor *= 1.2; }
  gl_FragColor = vec4(finalColor, alpha * distanceFade);
}`
};

// ====== 连线 Shader ======
const connectionShader = {
  vertexShader: noiseFunctions + `
attribute vec3 startPoint;
attribute vec3 endPoint;
attribute float connectionStrength;
attribute float pathIndex;
attribute vec3 connectionColor;

uniform float uTime;
uniform vec3 uPulsePositions[3];
uniform float uPulseTimes[3];
uniform float uPulseSpeed;

varying vec3 vColor;
varying float vConnectionStrength;
varying float vPulseIntensity;
varying float vPathPosition;

float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
  if (pulseTime < 0.0) return 0.0;
  float timeSinceClick = uTime - pulseTime;
  if (timeSinceClick < 0.0 || timeSinceClick > 3.0) return 0.0;
  float pulseRadius = timeSinceClick * uPulseSpeed;
  float distToClick = distance(worldPos, pulsePos);
  float pulseThickness = 2.0;
  float waveProximity = abs(distToClick - pulseRadius);
  return smoothstep(pulseThickness, 0.0, waveProximity) * smoothstep(3.0, 0.0, timeSinceClick);
}

void main() {
  float t = position.x;
  vPathPosition = t;
  vec3 midPoint = mix(startPoint, endPoint, 0.5);
  float pathOffset = sin(t * 3.14159) * 0.1;
  vec3 perpendicular = normalize(cross(normalize(endPoint - startPoint), vec3(0.0, 1.0, 0.0)));
  if (length(perpendicular) < 0.1) perpendicular = vec3(1.0, 0.0, 0.0);
  midPoint += perpendicular * pathOffset;

  vec3 p0 = mix(startPoint, midPoint, t);
  vec3 p1 = mix(midPoint, endPoint, t);
  vec3 finalPos = mix(p0, p1, t);

  float noiseTime = uTime * 0.2;
  float noiseVal = fbm(vec3(pathIndex * 0.1, t * 0.5, noiseTime), noiseTime);
  finalPos += perpendicular * noiseVal * 0.1;

  vec3 worldPos = (modelMatrix * vec4(finalPos, 1.0)).xyz;
  float totalPulseIntensity = 0.0;
  for (int i = 0; i < 3; i++) {
    totalPulseIntensity += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
  }
  vPulseIntensity = min(totalPulseIntensity, 1.0);
  vColor = connectionColor;
  vConnectionStrength = connectionStrength;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
}`,

  fragmentShader: `
uniform float uTime;
uniform vec3 uPulseColors[3];

varying vec3 vColor;
varying float vConnectionStrength;
varying float vPulseIntensity;
varying float vPathPosition;

void main() {
  vec3 baseColor = vColor * (0.7 + 0.3 * sin(uTime * 0.5 + vPathPosition * 10.0));
  float flowPattern = sin(vPathPosition * 20.0 - uTime * 3.0) * 0.5 + 0.5;
  float flowIntensity = 0.3 * flowPattern * vConnectionStrength;

  vec3 finalColor = baseColor;
  if (vPulseIntensity > 0.0) {
    vec3 pulseColor = mix(vec3(1.0), uPulseColors[0], 0.3);
    finalColor = mix(baseColor, pulseColor, vPulseIntensity);
    flowIntensity += vPulseIntensity * 0.5;
  }

  finalColor *= (0.6 + flowIntensity + vConnectionStrength * 0.4);
  float alpha = 0.8 * vConnectionStrength + 0.2 * flowPattern;
  alpha = mix(alpha, min(1.0, alpha * 2.0), vPulseIntensity);
  gl_FragColor = vec4(finalColor, alpha);
}`
};

// ====== 神经网络生成（使用原版 CodePen 完整算法） ======
class Node {
  constructor(position, level = 0, type = 0) {
    this.position = position;
    this.connections = [];
    this.level = level;
    this.type = type;
    this.size = type === 0 ? THREE.MathUtils.randFloat(0.7, 1.2) : THREE.MathUtils.randFloat(0.4, 0.9);
    this.distanceFromRoot = 0;
  }
  addConnection(node, strength = 1.0) {
    if (!this.isConnectedTo(node)) {
      this.connections.push({ node, strength });
      node.connections.push({ node: this, strength });
    }
  }
  isConnectedTo(node) {
    return this.connections.some(conn => conn.node === node);
  }
}

function generateNeuralNetwork(formationIndex, densityFactor = 1.0) {
  let nodes = [];
  let rootNode;

  function generateQuantumCortex() {
    rootNode = new Node(new THREE.Vector3(0, 0, 0), 0, 0); rootNode.size = 1.5; nodes.push(rootNode);
    const layers = 5, primaryAxes = 6, nodesPerAxis = 8, axisLength = 20;
    const axisEndpoints = [];
    for (let a = 0; a < primaryAxes; a++) {
      const phi = Math.acos(-1 + (2 * a) / primaryAxes);
      const theta = Math.PI * (1 + Math.sqrt(5)) * a;
      const dirVec = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi));
      let prevNode = rootNode;
      for (let i = 1; i <= nodesPerAxis; i++) {
        const t = i / nodesPerAxis;
        const distance = axisLength * Math.pow(t, 0.8);
        const pos = new THREE.Vector3().copy(dirVec).multiplyScalar(distance);
        const newNode = new Node(pos, i, i === nodesPerAxis ? 1 : 0);
        newNode.distanceFromRoot = distance; nodes.push(newNode);
        prevNode.addConnection(newNode, 1.0 - (t * 0.3)); prevNode = newNode;
        if (i === nodesPerAxis) axisEndpoints.push(newNode);
      }
    }
    const ringDistances = [5, 10, 15]; const ringNodes = [];
    for (const ringDist of ringDistances) {
      const nodesInRing = Math.floor(ringDist * 3 * densityFactor); const ringLayer = [];
      for (let i = 0; i < nodesInRing; i++) {
        const t = i / nodesInRing;
        const ringPhi = Math.acos(2 * Math.random() - 1); const ringTheta = 2 * Math.PI * t;
        const pos = new THREE.Vector3(ringDist * Math.sin(ringPhi) * Math.cos(ringTheta), ringDist * Math.sin(ringPhi) * Math.sin(ringTheta), ringDist * Math.cos(ringPhi));
        const newNode = new Node(pos, Math.ceil(ringDist / 5), Math.random() < 0.4 ? 1 : 0);
        newNode.distanceFromRoot = ringDist; nodes.push(newNode); ringLayer.push(newNode);
      }
      ringNodes.push(ringLayer);
      for (let i = 0; i < ringLayer.length; i++) {
        ringLayer[i].addConnection(ringLayer[(i + 1) % ringLayer.length], 0.7);
        if (i % 4 === 0 && ringLayer.length > 5) ringLayer[i].addConnection(ringLayer[(i + Math.floor(ringLayer.length / 2)) % ringLayer.length], 0.4);
      }
    }
    for (const ring of ringNodes) for (const node of ring) {
      let closestAxisNode = null; let minDist = Infinity;
      for (const n of nodes) { if (n === rootNode || n === node || n.type !== 0) continue; const dist = node.position.distanceTo(n.position); if (dist < minDist) { minDist = dist; closestAxisNode = n; } }
      if (closestAxisNode && minDist < 8) node.addConnection(closestAxisNode, 0.5 + (1 - minDist / 8) * 0.5);
    }
    for (let r = 0; r < ringNodes.length - 1; r++) {
      const innerRing = ringNodes[r]; const outerRing = ringNodes[r + 1];
      for (let i = 0; i < Math.floor(innerRing.length * 0.5); i++) {
        const a = innerRing[Math.floor(Math.random() * innerRing.length)]; const b = outerRing[Math.floor(Math.random() * outerRing.length)];
        if (!a.isConnectedTo(b)) a.addConnection(b, 0.6);
      }
    }
    for (let i = 0; i < axisEndpoints.length; i++) {
      const s = axisEndpoints[i]; const e = axisEndpoints[(i + 2) % axisEndpoints.length];
      let prev = s;
      for (let j = 1; j <= 3; j++) {
        const t = j / 4; const pos = new THREE.Vector3().lerpVectors(s.position, e.position, t).add(new THREE.Vector3(THREE.MathUtils.randFloatSpread(3), THREE.MathUtils.randFloatSpread(3), THREE.MathUtils.randFloatSpread(3)));
        const nn = new Node(pos, s.level, 0); nn.distanceFromRoot = rootNode.position.distanceTo(pos); nodes.push(nn);
        prev.addConnection(nn, 0.5); prev = nn;
      }
      prev.addConnection(e, 0.5);
    }
  }

  function generateHyperdimensionalMesh() {
    rootNode = new Node(new THREE.Vector3(0, 0, 0), 0, 0); rootNode.size = 1.5; nodes.push(rootNode);
    const dimensions = 4, nodesPerDimension = Math.floor(40 * densityFactor), maxRadius = 20;
    const dimensionVectors = [new THREE.Vector3(1, 1, 1).normalize(), new THREE.Vector3(-1, 1, -1).normalize(), new THREE.Vector3(1, -1, -1).normalize(), new THREE.Vector3(-1, -1, 1).normalize()];
    const dimensionNodes = [];
    for (let d = 0; d < dimensions; d++) {
      const dimNodes = [];
      for (let i = 0; i < nodesPerDimension; i++) {
        const distance = maxRadius * Math.pow(Math.random(), 0.7);
        const randomVec = new THREE.Vector3(THREE.MathUtils.randFloatSpread(1), THREE.MathUtils.randFloatSpread(1), THREE.MathUtils.randFloatSpread(1)).normalize();
        const biasedVec = new THREE.Vector3().addVectors(dimensionVectors[d].clone().multiplyScalar(0.6 + Math.random() * 0.4), randomVec.clone().multiplyScalar(0.3)).normalize();
        const pos = biasedVec.clone().multiplyScalar(distance);
        const newNode = new Node(pos, Math.floor(distance / (maxRadius / 4)) + 1, Math.random() < 0.4 || distance > maxRadius * 0.8 ? 1 : 0);
        newNode.distanceFromRoot = distance; nodes.push(newNode); dimNodes.push(newNode);
        if (distance < maxRadius * 0.3) rootNode.addConnection(newNode, 0.7);
      }
      dimensionNodes.push(dimNodes);
    }
    for (let d = 0; d < dimensions; d++) {
      const dimNodes = dimensionNodes[d].sort((a, b) => a.distanceFromRoot - b.distanceFromRoot);
      const layerCount = 4, npl = Math.ceil(dimNodes.length / layerCount);
      for (let layer = 0; layer < layerCount; layer++) {
        const si = layer * npl, ei = Math.min(si + npl, dimNodes.length);
        for (let i = si; i < ei; i++) {
          const node = dimNodes[i]; const cc = 1 + Math.floor(Math.random() * 3);
          const nearby = dimNodes.slice(si, ei).filter(n => n !== node).sort((a, b) => node.position.distanceTo(a.position) - node.position.distanceTo(b.position));
          for (let j = 0; j < Math.min(cc, nearby.length); j++) if (!node.isConnectedTo(nearby[j])) node.addConnection(nearby[j], 0.4 + Math.random() * 0.4);
          if (layer > 0) { const prevLayer = dimNodes.slice(Math.max(0, (layer - 1) * npl), layer * npl).sort((a, b) => node.position.distanceTo(a.position) - node.position.distanceTo(b.position)); if (prevLayer.length > 0 && !node.isConnectedTo(prevLayer[0])) node.addConnection(prevLayer[0], 0.8); }
        }
      }
    }
    for (let d1 = 0; d1 < dimensions; d1++) for (let d2 = d1 + 1; d2 < dimensions; d2++) {
      for (let i = 0; i < Math.floor(5 * densityFactor); i++) {
        const n1 = dimensionNodes[d1][Math.floor(Math.random() * dimensionNodes[d1].length)]; const n2 = dimensionNodes[d2][Math.floor(Math.random() * dimensionNodes[d2].length)];
        if (!n1.isConnectedTo(n2)) { const mp = new THREE.Vector3().lerpVectors(n1.position, n2.position, 0.5).add(new THREE.Vector3(THREE.MathUtils.randFloatSpread(2), THREE.MathUtils.randFloatSpread(2), THREE.MathUtils.randFloatSpread(2)));
          const nn = new Node(mp, Math.max(n1.level, n2.level), 0); nn.distanceFromRoot = rootNode.position.distanceTo(mp); nodes.push(nn); n1.addConnection(nn, 0.5); nn.addConnection(n2, 0.5); }
      }
    }
    for (let i = 0; i < Math.floor(10 * densityFactor); i++) {
      const sd = Math.floor(Math.random() * dimensions), ed = (sd + 2) % dimensions;
      const sn = dimensionNodes[sd][Math.floor(Math.random() * dimensionNodes[sd].length)], en = dimensionNodes[ed][Math.floor(Math.random() * dimensionNodes[ed].length)];
      if (!sn.isConnectedTo(en)) { const numPoints = 3 + Math.floor(Math.random() * 3); let prev = sn;
        for (let j = 1; j < numPoints; j++) { const t = j / numPoints; const pos = new THREE.Vector3().lerpVectors(sn.position, en.position, t).add(new THREE.Vector3(THREE.MathUtils.randFloatSpread(8) * Math.sin(t * Math.PI), THREE.MathUtils.randFloatSpread(8) * Math.sin(t * Math.PI), THREE.MathUtils.randFloatSpread(8) * Math.sin(t * Math.PI)));
          const nn = new Node(pos, Math.max(sn.level, en.level), 0); nn.distanceFromRoot = rootNode.position.distanceTo(pos); nodes.push(nn); prev.addConnection(nn, 0.4); prev = nn; }
        prev.addConnection(en, 0.4); }
    }
  }

  function generateNeuralVortex() {
    rootNode = new Node(new THREE.Vector3(0, 0, 0), 0, 0); rootNode.size = 1.8; nodes.push(rootNode);
    const numSpirals = 6, totalHeight = 30, maxRadius = 16, nodesPerSpiral = Math.floor(30 * densityFactor);
    const spiralNodes = [];
    for (let s = 0; s < numSpirals; s++) {
      const spiralPhase = (s / numSpirals) * Math.PI * 2; const spiralArray = [];
      for (let i = 0; i < nodesPerSpiral; i++) {
        const t = i / (nodesPerSpiral - 1); const height = (t - 0.5) * totalHeight; const radius = maxRadius * Math.sin(t * Math.PI);
        const angle = spiralPhase + t * Math.PI * 2 * 2.5;
        const pos = new THREE.Vector3(radius * Math.cos(angle), height, radius * Math.sin(angle)).add(new THREE.Vector3(THREE.MathUtils.randFloatSpread(1.5), THREE.MathUtils.randFloatSpread(1.5), THREE.MathUtils.randFloatSpread(1.5)));
        const newNode = new Node(pos, Math.floor(t * 5) + 1, Math.random() < 0.3 || i > nodesPerSpiral - 3 ? 1 : 0);
        newNode.distanceFromRoot = Math.sqrt(radius * radius + height * height); nodes.push(newNode); spiralArray.push(newNode);
      }
      spiralNodes.push(spiralArray);
    }
    for (const spiral of spiralNodes) { rootNode.addConnection(spiral[0], 1.0); for (let i = 0; i < spiral.length - 1; i++) spiral[i].addConnection(spiral[i + 1], 0.9); }
    for (let s = 0; s < numSpirals; s++) { const c = spiralNodes[s]; const n = spiralNodes[(s + 1) % numSpirals];
      for (let i = 0; i < 5; i++) { const t = i / 4; c[Math.floor(t * (c.length - 1))].addConnection(n[Math.floor(t * (n.length - 1))], 0.7); } }
    for (let s = 0; s < numSpirals; s++) { const c = spiralNodes[s]; const j = spiralNodes[(s + 2) % numSpirals];
      for (let i = 0; i < 3; i++) { const t1 = (i + 0.5) / 3; const t2 = (i + 1.0) / 3;
        const start = c[Math.floor(t1 * (c.length - 1))]; const end = j[Math.floor(t2 * (j.length - 1))];
        const mid = new THREE.Vector3().lerpVectors(start.position, end.position, 0.5).multiplyScalar(0.7);
        const bn = new Node(mid, Math.max(start.level, end.level), 0); bn.distanceFromRoot = rootNode.position.distanceTo(mid); nodes.push(bn);
        start.addConnection(bn, 0.6); bn.addConnection(end, 0.6); } }
    for (let r = 0; r < 5; r++) { const h = (r / 4 - 0.5) * totalHeight * 0.7;
      const rn = nodes.filter(n => n !== rootNode && Math.abs(n.position.y - h) < 2).sort((a, b) => Math.atan2(a.position.z, a.position.x) - Math.atan2(b.position.z, b.position.x));
      if (rn.length > 3) for (let i = 0; i < rn.length; i++) rn[i].addConnection(rn[(i + 1) % rn.length], 0.5); }
    const candidates = nodes.filter(n => n !== rootNode && n.position.length() > 5).sort(() => Math.random() - 0.5).slice(0, Math.floor(10 * densityFactor));
    for (const node of candidates) { const numSeg = 1 + Math.floor(Math.random() * 2); let prev = node;
      for (let i = 1; i <= numSeg; i++) { const t = i / (numSeg + 1); const segPos = node.position.clone().multiplyScalar(1 - t).add(new THREE.Vector3(THREE.MathUtils.randFloatSpread(2), THREE.MathUtils.randFloatSpread(2), THREE.MathUtils.randFloatSpread(2)));
        const nn = new Node(segPos, Math.floor(node.level * (1 - t)), 0); nn.distanceFromRoot = rootNode.position.distanceTo(segPos); nodes.push(nn); prev.addConnection(nn, 0.7); prev = nn; }
      prev.addConnection(rootNode, 0.8); }
  }

  function generateSynapticCloud() {
    rootNode = new Node(new THREE.Vector3(0, 0, 0), 0, 0); rootNode.size = 1.5; nodes.push(rootNode);
    const numClusters = 6, maxDist = 18; const clusterNodes = [];
    for (let c = 0; c < numClusters; c++) {
      const phi = Math.acos(2 * Math.random() - 1); const theta = 2 * Math.PI * Math.random(); const distance = maxDist * (0.3 + 0.7 * Math.random());
      const pos = new THREE.Vector3(distance * Math.sin(phi) * Math.cos(theta), distance * Math.sin(phi) * Math.sin(theta), distance * Math.cos(phi));
      const cn = new Node(pos, 1, 0); cn.size = 1.2; cn.distanceFromRoot = distance; nodes.push(cn); clusterNodes.push(cn); rootNode.addConnection(cn, 0.9);
    }
    for (let i = 0; i < clusterNodes.length; i++) for (let j = i + 1; j < clusterNodes.length; j++) {
      const dist = clusterNodes[i].position.distanceTo(clusterNodes[j].position); const prob = 1.0 - (dist / (maxDist * 2));
      if (Math.random() < prob) clusterNodes[i].addConnection(clusterNodes[j], 0.5 + 0.5 * (1 - dist / (maxDist * 2))); }
    for (const cluster of clusterNodes) {
      const clusterSize = Math.floor(20 * densityFactor); const cloudRadius = 7 + Math.random() * 3;
      for (let i = 0; i < clusterSize; i++) {
        const radius = cloudRadius * Math.pow(Math.random(), 0.5);
        const dir = new THREE.Vector3(THREE.MathUtils.randFloatSpread(2), THREE.MathUtils.randFloatSpread(2), THREE.MathUtils.randFloatSpread(2)).normalize();
        const pos = new THREE.Vector3().copy(cluster.position).add(dir.multiplyScalar(radius));
        const newNode = new Node(pos, 2 + Math.floor(radius / 3), Math.random() < 0.5 ? 1 : 0);
        newNode.distanceFromRoot = rootNode.position.distanceTo(pos); newNode.clusterRef = cluster; nodes.push(newNode);
        cluster.addConnection(newNode, 0.7 * (1 - radius / cloudRadius));
        const nearby = nodes.filter(n => n !== newNode && n !== cluster && n.clusterRef === cluster && n.position.distanceTo(pos) < cloudRadius * 0.4)
          .sort((a, b) => pos.distanceTo(a.position) - pos.distanceTo(b.position));
        const cc = Math.floor(Math.random() * 3);
        for (let j = 0; j < Math.min(cc, nearby.length); j++) newNode.addConnection(nearby[j], 0.4 * (1 - pos.distanceTo(nearby[j].position) / (cloudRadius * 0.4)));
      }
    }
    for (let i = 0; i < Math.floor(15 * densityFactor); i++) {
      const c1 = clusterNodes[Math.floor(Math.random() * clusterNodes.length)]; let c2;
      do { c2 = clusterNodes[Math.floor(Math.random() * clusterNodes.length)]; } while (c2 === c1);
      const bp = new THREE.Vector3().lerpVectors(c1.position, c2.position, 0.3 + Math.random() * 0.4).add(new THREE.Vector3(THREE.MathUtils.randFloatSpread(5), THREE.MathUtils.randFloatSpread(5), THREE.MathUtils.randFloatSpread(5)));
      const bn = new Node(bp, 2, 0); bn.distanceFromRoot = rootNode.position.distanceTo(bp); nodes.push(bn);
      c1.addConnection(bn, 0.5); c2.addConnection(bn, 0.5);
      const nearby = nodes.filter(n => n !== bn && n !== c1 && n !== c2 && n.position.distanceTo(bp) < 8);
      if (nearby.length > 0) bn.addConnection(nearby[Math.floor(Math.random() * nearby.length)], 0.4);
    }
    const outerNodes = nodes.filter(n => n.distanceFromRoot > maxDist * 0.6).sort(() => Math.random() - 0.5).slice(0, Math.floor(10 * densityFactor));
    for (const outerNode of outerNodes) { const numSeg = 2 + Math.floor(Math.random() * 2); let prev = outerNode;
      for (let i = 1; i <= numSeg; i++) { const t = i / (numSeg + 1); const segPos = outerNode.position.clone().multiplyScalar(1 - t * 0.8).add(new THREE.Vector3(THREE.MathUtils.randFloatSpread(4), THREE.MathUtils.randFloatSpread(4), THREE.MathUtils.randFloatSpread(4)));
        const nn = new Node(segPos, outerNode.level, 0); nn.distanceFromRoot = rootNode.position.distanceTo(segPos); nodes.push(nn); prev.addConnection(nn, 0.6); prev = nn; }
      const innerNodes = nodes.filter(n => n.distanceFromRoot < maxDist * 0.4 && n !== rootNode);
      if (innerNodes.length > 0) prev.addConnection(innerNodes[Math.floor(Math.random() * innerNodes.length)], 0.5); }
  }

  switch (formationIndex % 4) {
    case 0: generateQuantumCortex(); break;
    case 1: generateHyperdimensionalMesh(); break;
    case 2: generateNeuralVortex(); break;
    case 3: generateSynapticCloud(); break;
  }

  if (densityFactor < 1.0) {
    const origCount = nodes.length;
    nodes = nodes.filter((node, index) => { if (node === rootNode) return true; return ((index * 31 + Math.floor(densityFactor * 100)) % 100) < (densityFactor * 100); });
    nodes.forEach(node => { node.connections = node.connections.filter(conn => nodes.includes(conn.node)); });
    console.log(`[MagicHand] Density Filter: ${origCount} -> ${nodes.length} nodes`);
  }

  return { nodes, rootNode };
}

// ====== 可视化（完全对齐原版 CodePen） ======
let neuralNetwork = null, nodesMesh = null, connectionsMesh = null;

function createVis(formationIndex, densityFactor = 1.0) {
  if (nodesMesh) { scene.remove(nodesMesh); nodesMesh.geometry.dispose(); nodesMesh.material.dispose(); nodesMesh = null; }
  if (connectionsMesh) { scene.remove(connectionsMesh); connectionsMesh.geometry.dispose(); connectionsMesh.material.dispose(); connectionsMesh = null; }

  neuralNetwork = generateNeuralNetwork(formationIndex, densityFactor);
  if (!neuralNetwork || neuralNetwork.nodes.length === 0) return;

  const palette = colorPalettes[CFG.palIdx];

  // 节点几何体（使用原版 attribute 名称）
  const nodesGeometry = new THREE.BufferGeometry();
  const nodePositions = [], nodeTypes = [], nodeSizes = [], nodeColors = [], connectionIndices = [], distancesFromRoot = [];

  neuralNetwork.nodes.forEach((node) => {
    nodePositions.push(node.position.x, node.position.y, node.position.z);
    nodeTypes.push(node.type);
    nodeSizes.push(node.size);
    distancesFromRoot.push(node.distanceFromRoot);
    const indices = node.connections.slice(0, 3).map(conn => neuralNetwork.nodes.indexOf(conn.node));
    while (indices.length < 3) indices.push(-1);
    connectionIndices.push(...indices);
    const colorIndex = Math.min(node.level, palette.length - 1);
    const baseColor = palette[colorIndex % palette.length].clone().offsetHSL(THREE.MathUtils.randFloatSpread(0.05), THREE.MathUtils.randFloatSpread(0.1), THREE.MathUtils.randFloatSpread(0.1));
    nodeColors.push(baseColor.r, baseColor.g, baseColor.b);
  });

  nodesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
  nodesGeometry.setAttribute('nodeType', new THREE.Float32BufferAttribute(nodeTypes, 1));
  nodesGeometry.setAttribute('nodeSize', new THREE.Float32BufferAttribute(nodeSizes, 1));
  nodesGeometry.setAttribute('nodeColor', new THREE.Float32BufferAttribute(nodeColors, 3));
  nodesGeometry.setAttribute('connectionIndices', new THREE.Float32BufferAttribute(connectionIndices, 3));
  nodesGeometry.setAttribute('distanceFromRoot', new THREE.Float32BufferAttribute(distancesFromRoot, 1));

  nodesMesh = new THREE.Points(nodesGeometry, new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(pulseUniforms),
    vertexShader: nodeShader.vertexShader,
    fragmentShader: nodeShader.fragmentShader,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(nodesMesh);

  // 连线几何体（使用原版 attribute 名称）
  const connectionsGeometry = new THREE.BufferGeometry();
  const connectionColors = [], connectionStrengths = [], connectionPositions = [], startPoints = [], endPoints = [], pathIndices = [];
  const processedConnections = new Set(); let pathIndex = 0;

  neuralNetwork.nodes.forEach((node, nodeIndex) => {
    node.connections.forEach(connection => {
      const connectedNode = connection.node;
      const connectedIndex = neuralNetwork.nodes.indexOf(connectedNode);
      if (connectedIndex === -1) return;
      const key = [Math.min(nodeIndex, connectedIndex), Math.max(nodeIndex, connectedIndex)].join('-');
      if (!processedConnections.has(key)) {
        processedConnections.add(key);
        for (let i = 0; i < 15; i++) {
          const t = i / 14;
          connectionPositions.push(t, 0, 0);
          startPoints.push(node.position.x, node.position.y, node.position.z);
          endPoints.push(connectedNode.position.x, connectedNode.position.y, connectedNode.position.z);
          pathIndices.push(pathIndex);
          connectionStrengths.push(connection.strength);
          const avgLevel = Math.min(Math.floor((node.level + connectedNode.level) / 2), palette.length - 1);
          const baseColor = palette[avgLevel % palette.length].clone().offsetHSL(THREE.MathUtils.randFloatSpread(0.05), THREE.MathUtils.randFloatSpread(0.1), THREE.MathUtils.randFloatSpread(0.1));
          connectionColors.push(baseColor.r, baseColor.g, baseColor.b);
        }
        pathIndex++;
      }
    });
  });

  connectionsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(connectionPositions, 3));
  connectionsGeometry.setAttribute('startPoint', new THREE.Float32BufferAttribute(startPoints, 3));
  connectionsGeometry.setAttribute('endPoint', new THREE.Float32BufferAttribute(endPoints, 3));
  connectionsGeometry.setAttribute('connectionStrength', new THREE.Float32BufferAttribute(connectionStrengths, 1));
  connectionsGeometry.setAttribute('connectionColor', new THREE.Float32BufferAttribute(connectionColors, 3));
  connectionsGeometry.setAttribute('pathIndex', new THREE.Float32BufferAttribute(pathIndices, 1));

  connectionsMesh = new THREE.LineSegments(connectionsGeometry, new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(pulseUniforms),
    vertexShader: connectionShader.vertexShader,
    fragmentShader: connectionShader.fragmentShader,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(connectionsMesh);

  // 设置脉冲颜色（和原版一致）
  const pal = colorPalettes[CFG.palIdx];
  connectionsMesh.material.uniforms.uPulseColors.value[0].copy(pal[0]);
  connectionsMesh.material.uniforms.uPulseColors.value[1].copy(pal[1]);
  connectionsMesh.material.uniforms.uPulseColors.value[2].copy(pal[2]);
  nodesMesh.material.uniforms.uPulseColors.value[0].copy(pal[0]);
  nodesMesh.material.uniforms.uPulseColors.value[1].copy(pal[1]);
  nodesMesh.material.uniforms.uPulseColors.value[2].copy(pal[2]);
  nodesMesh.material.uniforms.uActivePalette.value = CFG.palIdx;
}

function updateTheme(paletteIndex) {
  CFG.palIdx = paletteIndex;
  if (!nodesMesh || !connectionsMesh || !neuralNetwork) return;

  const palette = colorPalettes[paletteIndex];
  const nodeColorsAttr = nodesMesh.geometry.attributes.nodeColor;
  for (let i = 0; i < nodeColorsAttr.count; i++) {
    const node = neuralNetwork.nodes[i]; if (!node) continue;
    const colorIndex = Math.min(node.level, palette.length - 1);
    const baseColor = palette[colorIndex % palette.length].clone().offsetHSL(THREE.MathUtils.randFloatSpread(0.05), THREE.MathUtils.randFloatSpread(0.1), THREE.MathUtils.randFloatSpread(0.1));
    nodeColorsAttr.setXYZ(i, baseColor.r, baseColor.g, baseColor.b);
  }
  nodeColorsAttr.needsUpdate = true;

  const connectionColorsArr = []; const processedConnections = new Set();
  neuralNetwork.nodes.forEach((node, nodeIndex) => {
    node.connections.forEach(connection => {
      const connectedNode = connection.node; const connectedIndex = neuralNetwork.nodes.indexOf(connectedNode);
      if (connectedIndex === -1) return;
      const key = [Math.min(nodeIndex, connectedIndex), Math.max(nodeIndex, connectedIndex)].join('-');
      if (!processedConnections.has(key)) {
        processedConnections.add(key);
        for (let i = 0; i < 15; i++) {
          const avgLevel = Math.min(Math.floor((node.level + connectedNode.level) / 2), palette.length - 1);
          const baseColor = palette[avgLevel % palette.length].clone().offsetHSL(THREE.MathUtils.randFloatSpread(0.05), THREE.MathUtils.randFloatSpread(0.1), THREE.MathUtils.randFloatSpread(0.1));
          connectionColorsArr.push(baseColor.r, baseColor.g, baseColor.b);
        }
      }
    });
  });
  connectionsMesh.geometry.setAttribute('connectionColor', new THREE.Float32BufferAttribute(connectionColorsArr, 3));
  connectionsMesh.geometry.attributes.connectionColor.needsUpdate = true;

  nodesMesh.material.uniforms.uPulseColors.value.forEach((c, i) => c.copy(palette[i % palette.length]));
  connectionsMesh.material.uniforms.uPulseColors.value.forEach((c, i) => c.copy(palette[i % palette.length]));
  nodesMesh.material.uniforms.uActivePalette.value = paletteIndex;
}

// ====== 脉冲（对齐原版 intersectPlane） ======
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const interactionPoint = new THREE.Vector3();
let lastPulseIndex = 0;

function triggerPulse(clientX, clientY) {
  pointer.x = (clientX / innerWidth) * 2 - 1;
  pointer.y = -(clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, cam);
  interactionPlane.normal.copy(cam.position).normalize();
  interactionPlane.constant = -interactionPlane.normal.dot(cam.position) + cam.position.length() * 0.5;

  if (raycaster.ray.intersectPlane(interactionPlane, interactionPoint)) {
    const time = clk.getElapsedTime();
    if (nodesMesh && connectionsMesh) {
      lastPulseIndex = (lastPulseIndex + 1) % 3;
      const palette = colorPalettes[CFG.palIdx];
      const randomColor = palette[Math.floor(Math.random() * palette.length)];
      nodesMesh.material.uniforms.uPulsePositions.value[lastPulseIndex].copy(interactionPoint);
      nodesMesh.material.uniforms.uPulseTimes.value[lastPulseIndex] = time;
      connectionsMesh.material.uniforms.uPulsePositions.value[lastPulseIndex].copy(interactionPoint);
      connectionsMesh.material.uniforms.uPulseTimes.value[lastPulseIndex] = time;
      nodesMesh.material.uniforms.uPulseColors.value[lastPulseIndex].copy(randomColor);
      connectionsMesh.material.uniforms.uPulseColors.value[lastPulseIndex].copy(randomColor);
    }
  }
}

// 场景翻转 180 度（带平滑动画）
let flipAnim = null;
function flipScene() {
  if (flipAnim) return; // 防止重叠
  const startRot = { x: scene.rotation.x, y: scene.rotation.y };
  const endRot = { x: startRot.x + Math.PI, y: startRot.y + Math.PI };
  const startTime = performance.now();
  const duration = 600; // ms

  flipAnim = { startRot, endRot, startTime, duration };
}

function updateFlipAnim() {
  if (!flipAnim) return;
  const elapsed = performance.now() - flipAnim.startTime;
  const t = Math.min(elapsed / flipAnim.duration, 1);
  // easeInOutCubic
  const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  scene.rotation.x = flipAnim.startRot.x + (flipAnim.endRot.x - flipAnim.startRot.x) * ease;
  scene.rotation.y = flipAnim.startRot.y + (flipAnim.endRot.y - flipAnim.startRot.y) * ease;

  if (t >= 1) flipAnim = null;
}

// ====== 手势识别 ======
const vid = document.getElementById('webcam');
const hCvs = document.getElementById('hand-canvas');
const hCtx = hCvs.getContext('2d');

// ====== 人像马赛克（Selfie Segmentation） ======
let selfieSeg = null;
let mosaicCanvas = null;
let mosaicCtx = null;
let maskTmpCanvas = null;
let maskTmpCtx = null;
const MOSAIC_BLOCK = 20;

function initSelfieSegmentation() {
  const MPSelfieSeg = window.SelfieSegmentation;
  if (typeof MPSelfieSeg === 'undefined') {
    console.warn('[MagicHand] SelfieSegmentation not available');
    return;
  }
  selfieSeg = new MPSelfieSeg({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/${f}`
  });
  selfieSeg.setOptions({ modelSelection: 0, selfieMode: true });

  // 创建马赛克离屏 canvas
  mosaicCanvas = document.createElement('canvas');
  mosaicCtx = mosaicCanvas.getContext('2d');
  // 复用 mask 读取 canvas
  maskTmpCanvas = document.createElement('canvas');
  maskTmpCtx = maskTmpCanvas.getContext('2d');
  console.log('[MagicHand] SelfieSegmentation initialized');
}

function applyMosaic(video, segmentationMask, targetCtx, w, h) {
  if (!mosaicCanvas) return;
  mosaicCanvas.width = w;
  mosaicCanvas.height = h;

  // 镜像绘制视频帧
  mosaicCtx.save();
  mosaicCtx.translate(w, 0);
  mosaicCtx.scale(-1, 1);
  mosaicCtx.drawImage(video, 0, 0, w, h);
  mosaicCtx.restore();

  // 读取像素数据
  const imageData = mosaicCtx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const block = MOSAIC_BLOCK;

  // 逐块处理
  for (let by = 0; by < h; by += block) {
    for (let bx = 0; bx < w; bx += block) {
      // 检查块中心是否在人像区域
      const cx = Math.min(bx + Math.floor(block / 2), w - 1);
      const cy = Math.min(by + Math.floor(block / 2), h - 1);
      const maskIdx = (cy * w + cx) * 4 + 3; // mask alpha channel
      const isPerson = segmentationMask[maskIdx] >= 128;

      const maxBW = Math.min(bx + block, w);
      const maxBH = Math.min(by + block, h);

      if (isPerson) {
        // 计算块内平均颜色
        let r = 0, g = 0, b = 0, count = 0;
        for (let y = by; y < maxBH; y++) {
          for (let x = bx; x < maxBW; x++) {
            const idx = (y * w + x) * 4;
            r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; count++;
          }
        }
        r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);

        // 填充马赛克块
        for (let y = by; y < maxBH; y++) {
          for (let x = bx; x < maxBW; x++) {
            const idx = (y * w + x) * 4;
            // 边缘像素用半透明黑色叠加模拟描边
            const isEdge = (x === bx || y === by || x === maxBW - 1 || y === maxBH - 1);
            if (isEdge) {
              data[idx] = Math.round(r * 0.3);
              data[idx + 1] = Math.round(g * 0.3);
              data[idx + 2] = Math.round(b * 0.3);
            } else {
              data[idx] = r; data[idx + 1] = g; data[idx + 2] = b;
            }
          }
        }
      } else {
        // 非人像区域 → 纯黑
        for (let y = by; y < maxBH; y++) {
          for (let x = bx; x < maxBW; x++) {
            const idx = (y * w + x) * 4;
            data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 0;
          }
        }
      }
    }
  }
  mosaicCtx.putImageData(imageData, 0, 0);
  return mosaicCanvas;
}
const gState = {
  lastFist: 0, lastOpen: 0, lastPeace: 0,
  lastThumbUp: 0, lastThumbDown: 0, lastFlip: 0,
  stableGesture: '', stableCount: 0, STABLE_THRESHOLD: 3,
  prevPalmFacing: null // 'up' or 'down'
};

function countFingers(lm) {
  let c = 0;
  if (Math.abs(lm[4].x - lm[2].x) > 0.05) c++;
  if (lm[8].y < lm[6].y) c++;
  if (lm[12].y < lm[10].y) c++;
  if (lm[16].y < lm[14].y) c++;
  if (lm[20].y < lm[18].y) c++;
  return c;
}

function detectGesture(lm) {
  const f = countFingers(lm);
  const thumbUp = lm[4].y < lm[3].y && lm[3].y < lm[2].y && f <= 2;
  const thumbDown = lm[4].y > lm[3].y && lm[3].y > lm[2].y && f <= 2;
  if (f === 0) return { name: 'Fist', label: 'Fist' };
  if (f === 5) return { name: 'Open', label: 'Open Hand' };
  if (f === 2) return { name: 'Peace', label: 'Peace' };
  if (thumbUp) return { name: 'ThumbUp', label: 'Thumb Up' };
  if (thumbDown) return { name: 'ThumbDown', label: 'Thumb Down' };
  return { name: 'Unknown', label: '?' };
}

// 检测手掌朝向（手心/手背）
// 用 landmark 0(wrist), 5(index_mcp), 17(pinky_mcp) 构建向量，叉积判断法线方向
function getPalmFacing(lm) {
  const wrist = lm[0];
  const indexMcp = lm[5];
  const pinkyMcp = lm[17];
  // 两个向量：wrist→indexMcp, wrist→pinkyMcp
  const ax = indexMcp.x - wrist.x, ay = indexMcp.y - wrist.y;
  const bx = pinkyMcp.x - wrist.x, by = pinkyMcp.y - wrist.y;
  // 叉积 z 分量：正 = 逆时针（手心朝上/朝摄像头），负 = 顺时针（手背朝上）
  const cross = ax * by - ay * bx;
  return cross > 0 ? 'up' : 'down';
}

function handleGesture(g, lm, now) {
  const s = gState;
  const cd = 500;
  const sGesture = document.getElementById('s-gesture');
  const sConf = document.getElementById('s-confidence');
  const gLabel = document.getElementById('gesture-label');
  if (sGesture) sGesture.textContent = g.label;
  if (sConf) sConf.textContent = g.name !== 'Unknown' ? '100%' : '--';
  if (gLabel) gLabel.textContent = g.label;

  if (g.name === 'Unknown') return;

  if (g.name !== s.stableGesture) { s.stableGesture = g.name; s.stableCount = 1; return; }
  s.stableCount++;
  if (s.stableCount < s.STABLE_THRESHOLD) return;

  let acted = false;
  if (g.name === 'Fist' && now - s.lastFist > cd) {
    s.lastFist = now; acted = true;
    triggerPulse(innerWidth / 2, innerHeight / 2);
    showToast('Pulse');
  } else if (g.name === 'Open' && now - s.lastOpen > cd) {
    s.lastOpen = now; acted = true;
    CFG.form = (CFG.form + 1) % CFG.nForms; createVis(CFG.form, CFG.dens);
    document.getElementById('s-formation').textContent = F_NAMES[CFG.form];
    showToast(F_NAMES[CFG.form]);
    oc.autoRotate = false; setTimeout(() => oc.autoRotate = true, 2000);
  } else if (g.name === 'Peace' && now - s.lastPeace > cd) {
    s.lastPeace = now; acted = true;
    CFG.palIdx = (CFG.palIdx + 1) % 4; updateTheme(CFG.palIdx);
    document.getElementById('s-theme').textContent = T_NAMES[CFG.palIdx];
    showToast(T_NAMES[CFG.palIdx]);
  } else if (g.name === 'ThumbUp' && now - s.lastThumbUp > cd) {
    s.lastThumbUp = now; acted = true;
    CFG.dens = Math.min(1, CFG.dens + .1); createVis(CFG.form, CFG.dens);
    document.getElementById('s-density').textContent = Math.round(CFG.dens * 100) + '%';
    showToast('Density ' + Math.round(CFG.dens * 100) + '%');
  } else if (g.name === 'ThumbDown' && now - s.lastThumbDown > cd) {
    s.lastThumbDown = now; acted = true;
    CFG.dens = Math.max(.2, CFG.dens - .1); createVis(CFG.form, CFG.dens);
    document.getElementById('s-density').textContent = Math.round(CFG.dens * 100) + '%';
    showToast('Density ' + Math.round(CFG.dens * 100) + '%');
  }
  if (acted) { s.stableGesture = ''; s.stableCount = 0; }

  // 翻转检测：手掌朝向变化时触发旋转（不受稳定器限制，实时响应）
  const facing = getPalmFacing(lm);
  if (s.prevPalmFacing && facing !== s.prevPalmFacing && now - s.lastFlip > 600) {
    s.lastFlip = now;
    s.prevPalmFacing = facing;
    flipScene();
    showToast('Flip');
    return;
  }
  s.prevPalmFacing = facing;
}

// ====== 启动摄像头 ======
async function startCamera() {
  const ov = document.getElementById('loading-overlay');
  const lt = document.getElementById('loading-text');
  if (ov) ov.classList.remove('hidden');
  if (lt) lt.textContent = 'Loading gesture model...';

  const MPHands = window.Hands;
  const MPCamera = window.Camera;
  const MPDrawConnectors = window.drawConnectors;
  const MPDrawLandmarks = window.drawLandmarks;
  const MPConnections = window.HAND_CONNECTIONS;

  if (typeof MPHands === 'undefined') {
    if (lt) lt.textContent = 'Failed to load gesture library. Check network and refresh.';
    return;
  }
  if (typeof MPCamera === 'undefined') {
    if (lt) lt.textContent = 'Failed to load camera utility. Check network and refresh.';
    return;
  }

  try {
    const hands = new MPHands({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.4
    });

    let frameCount = 0;
    let segCanvas = null;

    // 初始化 Selfie Segmentation（在 hands 之前，确保模型加载）
    initSelfieSegmentation();

    // Selfie Segmentation 帧处理
    if (selfieSeg) {
      selfieSeg.onResults(r => {
        if (!r.segmentationMask) return;
        const maskCanvas = r.segmentationMask;
        const segW = maskCanvas.width || 256;
        const segH = maskCanvas.height || 256;
        // 读取 mask
        maskTmpCanvas.width = segW; maskTmpCanvas.height = segH;
        maskTmpCtx.drawImage(maskCanvas, 0, 0);
        const maskImageData = maskTmpCtx.getImageData(0, 0, segW, segH);
        const result = applyMosaic(vid, maskImageData.data, maskTmpCtx, segW, segH);
        if (result) segCanvas = result;
      });
    }

    hands.onResults(r => {
      frameCount++;
      hCvs.width = hCvs.clientWidth; hCvs.height = hCvs.clientHeight;
      const cw = hCvs.width, ch = hCvs.height;

      // 清空并先绘制马赛克人像背景（如果有分割结果）
      hCtx.clearRect(0, 0, cw, ch);
      if (segCanvas) {
        hCtx.drawImage(segCanvas, 0, 0, cw, ch);
      }

      if (r.multiHandLandmarks && r.multiHandLandmarks.length > 0) {
        const lm = r.multiHandLandmarks[0];
        if (MPDrawConnectors && MPConnections) MPDrawConnectors(hCtx, lm, MPConnections, { color: 'rgba(255,255,255,0.6)', lineWidth: 2 });
        if (MPDrawLandmarks) MPDrawLandmarks(hCtx, lm, { color: '#fff', lineWidth: 1, radius: 3 });
        const g = detectGesture(lm);
        handleGesture(g, lm, performance.now());
      } else {
        const gLabel = document.getElementById('gesture-label');
        if (gLabel) gLabel.textContent = 'Waiting...';
        gState.stableGesture = ''; gState.stableCount = 0;
      }
    });

    if (lt) lt.textContent = 'Requesting camera permission...';

    const camUtil = new MPCamera(vid, {
      onFrame: async () => {
        await hands.send({ image: vid });
        if (selfieSeg && frameCount % 2 === 0) {
          try { await selfieSeg.send({ image: vid }); } catch(e) { /* skip */ }
        }
      },
      width: 640, height: 480
    });
    await camUtil.start();

    const camContainer = document.getElementById('camera-container');
    if (camContainer) camContainer.classList.remove('hidden');
    if (ov) ov.classList.add('hidden');
    showToast('Camera ready');
  } catch (e) {
    console.error('[MagicHand] 启动错误:', e);
    if (lt) lt.textContent = 'Error: ' + e.message;
    setTimeout(() => { if (ov) ov.classList.add('hidden'); }, 3000);
  }
}

// ====== 事件绑定 ======
const startBtn = document.getElementById('start-btn');
if (startBtn) {
  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startBtn.classList.add('hidden');
    startCamera();
  });
}

// 画面点击触发脉冲（区分 click 和 drag）
let pointerDownPos = null;
cvs.addEventListener('pointerdown', (e) => { pointerDownPos = { x: e.clientX, y: e.clientY }; });
cvs.addEventListener('click', (e) => {
  if (pointerDownPos) {
    const dx = e.clientX - pointerDownPos.x; const dy = e.clientY - pointerDownPos.y;
    if (dx * dx + dy * dy > 25) return;
  }
  triggerPulse(e.clientX, e.clientY);
});

// ====== 动画循环 ======
const clk = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clk.getElapsedTime();
  if (!CFG.paused) {
    if (nodesMesh) { nodesMesh.material.uniforms.uTime.value = t; nodesMesh.rotation.y = Math.sin(t * 0.05) * 0.08; }
    if (connectionsMesh) { connectionsMesh.material.uniforms.uTime.value = t; connectionsMesh.rotation.y = Math.sin(t * 0.05) * 0.08; }
  }
  oc.update();
  updateFlipAnim();
  comp.render();
}

function onResize() {
  cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); comp.setSize(innerWidth, innerHeight);
  bloomPass.resolution.set(innerWidth, innerHeight);
}
addEventListener('resize', onResize);

// ====== 初始化 ======
console.log('[MagicHand] Initializing...');
createVis(CFG.form, CFG.dens);
updateTheme(CFG.palIdx);
animate();
console.log('[MagicHand] Initialization complete');
