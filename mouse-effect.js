// mouse-effect.js
// 鼠标轨迹效果 —— 原始代码，未做任何更改
// Support me by PayPal: https://paypal.com/paypalme/sabosugi 
import * as THREE from 'three';
import GUI from 'lil-gui';

// --- Configuration & Physics Params ---
const params = {
    pointsNumber: 10,
    spring: 0.4,
    friction: 0.5,
    thickness: 8,         
    strength: 0.05,        
    rgbShift: 0.05,
};

// --- Core Variables ---
let scene, camera, renderer, material;
let dispTexture;

// Offscreen canvas for displacement map only
let dispCanvas, dispCtx;

// Interaction state
let mouseMoved = false;
const pointer = {
    x: 0.5 * window.innerWidth,
    y: 0.5 * window.innerHeight,
};

let trail = [];

// Hide loading immediately since we no longer need to load an image
document.getElementById('loading').style.opacity = '0';

// Kick off directly
setupWebgl();

function setupWebgl() {
    const dpr = Math.min(window.devicePixelRatio, 2);

    // 1. Setup Displacement canvas only
    setupDisplacementCanvas(dpr);
    initTrail();

    // 2. Setup Three.js Textures — displacement only
    dispTexture = new THREE.CanvasTexture(dispCanvas);
    dispTexture.minFilter = THREE.LinearFilter;
    dispTexture.magFilter = THREE.LinearFilter;
    dispTexture.generateMipmaps = false;

    // 3. Setup Three.js Scene
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    let mainCanvas = document.getElementById('webgl-canvas');
    const newCanvas = document.createElement('canvas');
    newCanvas.id = 'webgl-canvas';
    mainCanvas.parentNode.replaceChild(newCanvas, mainCanvas);
    mainCanvas = newCanvas;

    // alpha: true so the canvas is transparent — the bg-shader shows through
    renderer = new THREE.WebGLRenderer({ canvas: mainCanvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(dpr);

    // 4. Custom Shader Material — distortion only, no background texture
    material = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
            u_disp: { value: dispTexture },
            u_resolution: { value: new THREE.Vector2(window.innerWidth * dpr, window.innerHeight * dpr) },
            u_strength: { value: params.strength },
            u_rgbShift: { value: params.rgbShift }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            uniform sampler2D u_disp;
            uniform vec2 u_resolution;
            uniform float u_strength;
            uniform float u_rgbShift;

            void main() {
                vec2 uv = vUv;
                vec2 texel = vec2(3.0 / u_resolution.x, 3.0 / u_resolution.y);

                // 读取位移贴图的法线梯度
                float right  = texture2D(u_disp, uv + vec2(texel.x,  0.0)).r;
                float left   = texture2D(u_disp, uv - vec2(texel.x,  0.0)).r;
                float top    = texture2D(u_disp, uv + vec2(0.0,  texel.y)).r;
                float bottom = texture2D(u_disp, uv - vec2(0.0,  texel.y)).r;
                float center = texture2D(u_disp, uv).r;

                float dx = right - left;
                float dy = top   - bottom;
                float dispMag = length(vec2(dx, dy));

                // 无位移区域完全透明
                if (center < 0.01 && dispMag < 0.005) {
                    gl_FragColor = vec4(0.0);
                    return;
                }

                // --- 液体折射色彩层 ---
                // 与 bg-shader 同色系：橙红/金/暗紫
                vec3 colorA = vec3(0.95, 0.45, 0.10); // 橙红
                vec3 colorB = vec3(1.00, 0.75, 0.20); // 金黄
                vec3 colorC = vec3(0.55, 0.10, 0.30); // 暗紫红

                // 用法线方向 + 中心亮度混合颜色，产生折射感
                float t = clamp(dx * 2.5 + 0.5, 0.0, 1.0);
                vec3 refractColor = mix(colorC, colorA, t);
                refractColor = mix(refractColor, colorB, clamp(center * 1.8, 0.0, 1.0));

                // 轨迹中心更亮（高光点）
                vec3 highlight = vec3(1.0, 0.92, 0.78);
                refractColor = mix(refractColor, highlight, pow(center, 2.5));

                // 色散：R/G/B 通道在法线方向上微偏移，增强液体感
                float shift = dispMag * u_rgbShift * 6.0;
                float rShift = texture2D(u_disp, uv + vec2( shift,  shift * 0.5)).r;
                float bShift = texture2D(u_disp, uv + vec2(-shift, -shift * 0.5)).r;
                refractColor.r = mix(refractColor.r, 1.0, rShift * 0.4);
                refractColor.b = mix(refractColor.b, 0.6, bShift * 0.3);

                // alpha：轨迹边缘渐隐，中心不透明
                float alpha = clamp(center * 2.8, 0.0, 0.92);
                alpha = max(alpha, clamp(dispMag * u_strength * 80.0, 0.0, 0.5));

                gl_FragColor = vec4(refractColor * (0.7 + center * 0.5), alpha);
            }
        `
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 5. GUI & Events
    setupGUI();
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    
    animate(0);
}

function setupDisplacementCanvas(dpr) {
    if (!dispCanvas) {
        dispCanvas = document.createElement('canvas');
        dispCtx = dispCanvas.getContext('2d');
    }
    
    dispCanvas.width = window.innerWidth * dpr;
    dispCanvas.height = window.innerHeight * dpr;
}

function initTrail() {
    trail = new Array(params.pointsNumber);
    for (let i = 0; i < params.pointsNumber; i++) {
        trail[i] = { x: pointer.x, y: pointer.y, dx: 0, dy: 0 };
    }
}

function onPointerMove(e) {
    mouseMoved = true;
    if(e.touches) {
        pointer.x = e.touches[0].clientX;
        pointer.y = e.touches[0].clientY;
    } else {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
    }
}

function onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    
    renderer.setSize(w, h);
    material.uniforms.u_resolution.value.set(w * dpr, h * dpr);
    
    setupDisplacementCanvas(dpr);
}

function setupGUI() {
    // GUI hidden
}


function animate(t) {
    requestAnimationFrame(animate);
    if (!material) return; 

    const dpr = Math.min(window.devicePixelRatio, 2);

    // Intro motion if mouse hasn't moved
    if (!mouseMoved) {
        pointer.x = (0.5 + 0.3 * Math.cos(0.002 * t) * Math.sin(0.005 * t)) * window.innerWidth;
        pointer.y = (0.5 + 0.2 * Math.cos(0.005 * t) + 0.1 * Math.cos(0.01 * t)) * window.innerHeight;
    }

    // Physics Update
    trail.forEach((p, pIdx) => {
        const prev = pIdx === 0 ? pointer : trail[pIdx - 1];
        const spring = pIdx === 0 ? 0.4 * params.spring : params.spring;
        
        p.dx += (prev.x - p.x) * spring;
        p.dy += (prev.y - p.y) * spring;
        p.dx *= params.friction;
        p.dy *= params.friction;
        p.x += p.dx;
        p.y += p.dy;
    });

    // Draw Displacement Map with Original Tapering Logic
    dispCtx.fillStyle = 'black';
    dispCtx.fillRect(0, 0, dispCanvas.width, dispCanvas.height);
    
    dispCtx.lineCap = "round";
    dispCtx.lineJoin = "round";
    // Very slight blur to keep the edges soft for the displacement map
    dispCtx.shadowBlur = params.thickness * 0.2 * dpr; 
    dispCtx.shadowColor = 'white';
    dispCtx.strokeStyle = 'white';
    
    dispCtx.beginPath();
    dispCtx.moveTo(trail[0].x * dpr, trail[0].y * dpr);

    // Reverted to your original beautiful tapering loop
    for (let i = 1; i < trail.length - 1; i++) {
        const xc = 0.5 * (trail[i].x + trail[i + 1].x);
        const yc = 0.5 * (trail[i].y + trail[i + 1].y);
        
        dispCtx.quadraticCurveTo(trail[i].x * dpr, trail[i].y * dpr, xc * dpr, yc * dpr);
        // Dynamically reduce width based on index
        dispCtx.lineWidth = Math.max(1, params.thickness * dpr * ((trail.length - i) / trail.length));
        dispCtx.stroke();
    }
    dispCtx.lineTo(trail[trail.length - 1].x * dpr, trail[trail.length - 1].y * dpr);
    dispCtx.stroke();

    // Render
    dispTexture.needsUpdate = true;
    renderer.render(scene, camera);
}
