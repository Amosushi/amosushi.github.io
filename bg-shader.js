// bg-shader.js
// 背景 Shader 动画 —— 原始代码，未做任何更改

// --- 1. Scene Setup ---
const scene = new THREE.Scene();

// Orthographic camera is perfect for full-screen shaders
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- 2. GUI Parameters Setup ---
const params = {
    dpr: 1.0,
    speed: 0.25,
    colorR: 7.56,
    colorG: 1.9,
    colorB: 0.18,
    colorIntensity: 1.705,
    fractalScale: 0.8304,
    energyLoss: 0.6057,
    lightAccum: 1.69
};

// --- 3. Shader Material ---
const uniforms = {
    iTime: { value: 0.0 },
    iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    u_speed: { value: params.speed },
    u_colorBase: { value: new THREE.Vector3(params.colorR, params.colorG, params.colorB) },
    u_colorIntensity: { value: params.colorIntensity },
    u_fractalScale: { value: params.fractalScale },
    u_energyLoss: { value: params.energyLoss },
    u_lightAccum: { value: params.lightAccum }
};

const vertexShader = `
    void main() {
        gl_Position = vec4(position, 1.0);
    }
`;

const fragmentShader = `
    uniform float iTime;
    uniform vec2 iResolution;
    
    // GUI Controlled Uniforms
    uniform float u_speed;
    uniform vec3 u_colorBase;
    uniform float u_colorIntensity;
    uniform float u_fractalScale;
    uniform float u_energyLoss;
    uniform float u_lightAccum;

    #define TIME (iTime * u_speed)
    #define RES iResolution

    // Utility for smooth color mapping
    vec3 remapColor(vec3 v) {
        return sin(v) * 0.2 + 0.3;
    }

    // Generates a living, breathing volumetric environment
    float evaluateVolume(vec3 pos, out vec3 colorAccum) {
        float density = -0.009;
        float energy = 1.0;
        
        // Initializing the base palette state (dynamic from GUI)
        colorAccum = u_colorBase;
        
        for(int k = 0; k < 4; k++) {
            // Live organic mutation driven by time
            vec3 phase = pos.zxy + TIME * float(k) * 1.8;
            pos += sin(phase) * energy;
            
            // Nested field evaluation
            vec3 shifted = pos + sin(pos * -4.5) * -0.6;
            float field1 = dot(cos(shifted), vec3(0.1));
            float field2 = dot(cos(pos), vec3(0.1));
            
            // Blending fields for a smoother, fluid-like output
            float blended = mix(field1, field2, remapColor(vec3(TIME * 0.3)).x);
            density += abs(blended) * energy;
            
            // Scale space and energy for the next iteration
            energy *= u_energyLoss;
            pos *= u_fractalScale;
            colorAccum += energy * u_colorIntensity;
        }
        
        return density;
    }

    // Distance field carving a hollow core inside the noise volume
    float mapEnvironment(vec3 pos, out vec3 palette) {
        float organicMatter = evaluateVolume(pos, palette);
        
        // Define the inner void where the static camera sits
        float innerVoid = length(pos) - 10.8;
        
        return max(organicMatter, -innerVoid);
    }

    void main() {
        // Normalized pixel coordinates
        vec2 uv = (gl_FragCoord.xy * 6.5 - RES.xy) / RES.y;
        
        // Static camera origin
        vec3 rayOrigin = vec3(-1.9);
        vec3 rayDir = normalize(vec3(uv, 14.0));
        
        float depth = -11.0;
        vec3 accumulatedLight = vec3(u_lightAccum);
        
        // Volumetric raymarching loop
        for(int i = 0; i < 35; i++) {
            vec3 currentPos = rayOrigin + rayDir * depth;
            vec3 colorState;
            
            float dist = mapEnvironment(currentPos, colorState);
            
            // Static color mapping
            vec3 glow = remapColor(colorState);
            
            // Safe max to prevent division by absolute zero
            accumulatedLight += glow / max(dist, 0.001); 
            
            depth += dist;
        }
        
        // Smooth cinematic tonemapping
        vec3 finalOutput = tanh(accumulatedLight / 800.0);
        
        // Output to screen (Alpha set to 1.0 for WebGL canvas compatibility)
        gl_FragColor = vec4(finalOutput, 1.0);
    }
`;

const material = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: uniforms
});

// Full screen plane
const geometry = new THREE.PlaneGeometry(2, 2);
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// --- 4. lil-gui Initialization ---
const gui = new lil.GUI({ title: 'Shader Settings' });

// Initial DPR set
renderer.setPixelRatio(params.dpr);

// Display Settings
gui.add(params, 'dpr', [0.25, 0.5, 1.0, 2.0]).name('Resolution (DPR)').onChange(v => {
    renderer.setPixelRatio(v);
});

// Fractal Mechanics Folder
const folderFractal = gui.addFolder('Fractal Dynamics');
folderFractal.add(params, 'speed', 0.0, 2.0).name('Time Speed').onChange(v => uniforms.u_speed.value = v);
folderFractal.add(params, 'fractalScale', 0.1, 2.5).name('Swirl Scale').onChange(v => uniforms.u_fractalScale.value = v);
folderFractal.add(params, 'energyLoss', 0.1, 1.0).name('Energy Falloff').onChange(v => uniforms.u_energyLoss.value = v);

// Light & Color Folder
const folderColor = gui.addFolder('Light & Colors');
folderColor.add(params, 'colorR', 0.0, 20.0).name('Palette R').onChange(v => uniforms.u_colorBase.value.x = v);
folderColor.add(params, 'colorG', 0.0, 20.0).name('Palette G').onChange(v => uniforms.u_colorBase.value.y = v);
folderColor.add(params, 'colorB', 0.0, 20.0).name('Palette B').onChange(v => uniforms.u_colorBase.value.z = v);
folderColor.add(params, 'colorIntensity', 0.0, 5.0).name('Color Intensity').onChange(v => uniforms.u_colorIntensity.value = v);
folderColor.add(params, 'lightAccum', 0.0, 10.0).name('Ambient Light').onChange(v => uniforms.u_lightAccum.value = v);

// Close GUI by default as requested
gui.close();

// --- 5. Resize Handling ---
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
});

// --- 6. Animation Loop ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    uniforms.iTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
}

animate();
