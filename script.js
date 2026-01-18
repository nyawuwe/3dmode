// --- Setup Main Scene (Background) ---
const canvas = document.querySelector('#canvas3d');
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 5;

// --- Setup Mini Scene (Foreground UI) ---
const canvasMini = document.querySelector('#canvas-mini');
const rendererMini = new THREE.WebGLRenderer({ canvas: canvasMini, antialias: true, alpha: true });
rendererMini.setSize(window.innerWidth, window.innerHeight);
rendererMini.setPixelRatio(Math.min(window.devicePixelRatio, 2));
rendererMini.setClearColor(0x000000, 0); // Transparent

const miniScene = new THREE.Scene();
const miniCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
miniCamera.position.z = 3.5;

// --- The Main Sphere (Sun) ---
const sphereGeometry = new THREE.SphereGeometry(1.2, 128, 128);

// Shared GLSL Noise Function
const noiseChunk = `
    uniform float uTime;
    uniform vec2 uHover;
    uniform float uDistort;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute( permute( permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                    dot(p2,x2), dot(p3,x3) ) );
    }
`;

const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    ${noiseChunk}

    void main() {
        vNormal = normalize(normalMatrix * normal);
        float noise = snoise(position * 2.0 + uTime * 0.5 + vec3(uHover, 0.0));
        vec3 newPos = position + normal * noise * uDistort;
        vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    uniform vec3 uColorCenter;
    uniform vec3 uColorMid;
    uniform vec3 uColorEdge;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float intensity = dot(normal, viewDir);

        vec3 color;
        float midPoint = 0.6;

        if (intensity > midPoint) {
            float t = (intensity - midPoint) / (1.0 - midPoint);
            color = mix(uColorMid, uColorCenter, t);
        } else {
            float t = intensity / midPoint;
            color = mix(uColorEdge, uColorMid, t);
        }
        gl_FragColor = vec4(color, 1.0);
    }
`;

// Main Sphere Material
const sphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uColorCenter: { value: new THREE.Color('#ffffba') },
        uColorMid: { value: new THREE.Color('#ffaa00') },
        uColorEdge: { value: new THREE.Color('#ff4d4d') },
        uHover: { value: new THREE.Vector2(0.5, 0.5) },
        uDistort: { value: 0.04 },
    },
    vertexShader,
    fragmentShader,
    transparent: true
});
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

// Mini Sphere (Shared Mesh for Mini Scene)
const miniMaterial = sphereMaterial.clone();
const miniSphere = new THREE.Mesh(sphereGeometry, miniMaterial);
miniScene.add(miniSphere);


// --- Interactions ---
const mouse = new THREE.Vector2();
const targetRotation = new THREE.Vector2();
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

document.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX - windowHalfX);
    mouse.y = (event.clientY - windowHalfY);

    // Shader Uniform update
    const uX = event.clientX / window.innerWidth;
    const uY = 1.0 - (event.clientY / window.innerHeight);

    sphereMaterial.uniforms.uHover.value.x = uX;
    sphereMaterial.uniforms.uHover.value.y = uY;

    miniMaterial.uniforms.uHover.value.x = uX;
    miniMaterial.uniforms.uHover.value.y = uY;
});

// Scroll Interactions (GSAP)
gsap.registerPlugin(ScrollTrigger);

// Initial State
sphere.position.y = 0;

// Hero -> Manifesto (Main Sphere Fades Out)
gsap.to(sphere.scale, {
    x: 0, y: 0, z: 0,
    scrollTrigger: {
        trigger: ".manifesto",
        start: "top bottom",
        end: "top center",
        scrub: 1,
    }
});

// Stack Animation (Reveal on Scroll)
const stackTimeline = gsap.timeline({
    scrollTrigger: {
        trigger: ".manifesto",
        start: "top 70%",
        end: "center center",
        scrub: 1
    }
});

stackTimeline
    .from(".card-back-1", { y: 20, opacity: 0, scale: 0.95 }, 0)
    .from(".card-back-2", { y: 40, opacity: 0, scale: 0.9 }, 0.1)
    .from(".card-front", { y: 50, opacity: 0 }, 0);

// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // Update Uniforms
    sphereMaterial.uniforms.uTime.value = elapsedTime;
    miniMaterial.uniforms.uTime.value = elapsedTime;

    // Rotate Main Sphere
    targetRotation.x = (mouse.y * 0.001);
    targetRotation.y = (mouse.x * 0.001);

    sphere.rotation.x += 0.05 * (targetRotation.x - sphere.rotation.x);
    sphere.rotation.y += 0.05 * (targetRotation.y - sphere.rotation.y);
    sphere.rotation.z += 0.002;

    // Rotate Mini Sphere
    miniSphere.rotation.copy(sphere.rotation);
    miniSphere.rotation.z -= 0.005;

    // --- Render Main Scene (Background) ---
    renderer.render(scene, camera);

    // --- Render Mini Globes (Foreground Scissor) ---
    rendererMini.setScissorTest(false);
    rendererMini.clear();
    rendererMini.setScissorTest(true);

    const targets = [];

    // Manifesto Visual
    const manifestoTarget = document.querySelector('.visual-target');
    if(manifestoTarget) targets.push({ el: manifestoTarget, type: 'manifesto' });

    // Data Cards
    const cardTargets = document.querySelectorAll('.mini-globe-target');
    cardTargets.forEach(el => targets.push({ el: el, type: 'card', parent: el.closest('.data-card') }));

    targets.forEach((item) => {
        const rect = item.el.getBoundingClientRect();

        // Check if visible
        if (rect.bottom < 0 || rect.top > window.innerHeight ||
            rect.right < 0 || rect.left > window.innerWidth) {
            return;
        }

        const width = rect.width;
        const height = rect.height;
        const left = rect.left;
        const bottom = window.innerHeight - rect.bottom;

        rendererMini.setViewport(left, bottom, width, height);
        rendererMini.setScissor(left, bottom, width, height);

        // Styling based on type
        if (item.type === 'manifesto') {
            // Restore default colors for the main sun/globe look
            miniMaterial.uniforms.uColorCenter.value.set('#ffffba');
            miniMaterial.uniforms.uColorMid.value.set('#ffaa00');
            miniMaterial.uniforms.uColorEdge.value.set('#ff4d4d');

            // Adjust scale if needed for this view
            miniSphere.scale.set(0.9, 0.9, 0.9);
        } else if (item.type === 'card' && item.parent) {
            const colorHex = item.parent.getAttribute('data-color');
            if(colorHex) {
                const baseColor = new THREE.Color(colorHex);
                miniMaterial.uniforms.uColorMid.value.copy(baseColor);
                miniMaterial.uniforms.uColorCenter.value.set('#ffffff');
                miniMaterial.uniforms.uColorEdge.value.copy(baseColor).multiplyScalar(0.8);
            }
            miniSphere.scale.set(1, 1, 1);
        }

        rendererMini.render(miniScene, miniCamera);
    });

    rendererMini.setScissorTest(false);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    miniCamera.aspect = 1;
    miniCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererMini.setSize(window.innerWidth, window.innerHeight);
});
