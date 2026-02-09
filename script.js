
// --- Setup ---
const canvas = document.querySelector('#canvas3d');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// --- Background Gradient ---
const bgGeometry = new THREE.PlaneGeometry(20, 20);
const bgMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uColorOuter: { value: new THREE.Color('#b3e5fc') },
        uColorInner: { value: new THREE.Color('#ff9980') },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 uColorOuter;
        uniform vec3 uColorInner;
        varying vec2 vUv;
        void main() {
            float dist = distance(vUv, vec2(0.5));
            float mixValue = smoothstep(0.0, 0.65, dist); // Slight tweak
            vec3 color = mix(uColorInner, uColorOuter, mixValue);
            gl_FragColor = vec4(color, 1.0);
        }
    `,
    depthWrite: false,
});
const bgPlane = new THREE.Mesh(bgGeometry, bgMaterial);
bgPlane.position.z = -5;
scene.add(bgPlane);

// --- The Sphere ---
const sphereGeometry = new THREE.SphereGeometry(1.2, 128, 128); // Higher Detail
const sphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uColorCenter: { value: new THREE.Color('#ffffba') }, // Yellow
        uColorMid: { value: new THREE.Color('#ffaa00') },    // Orange
        uColorEdge: { value: new THREE.Color('#ff4d4d') },   // Red
        uHover: { value: new THREE.Vector2(0.5, 0.5) },
        uDistort: { value: 0.08 }, // Amplitude of noise
    },
    vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        uniform float uTime;
        uniform vec2 uHover;
        uniform float uDistort;

        // Simplex noise (truncated for brevity, using same logic as before)
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

        void main() {
            vNormal = normalize(normalMatrix * normal);
            float noise = snoise(position * 2.0 + uTime * 0.5 + vec3(uHover, 0.0));
            vec3 newPos = position + normal * noise * uDistort;
            vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
            vViewPosition = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform vec3 uColorCenter;
        uniform vec3 uColorMid;
        uniform vec3 uColorEdge;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPosition);
            float intensity = dot(normal, viewDir); // 0 at edge, 1 at center

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
    `
});
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

// --- Interactions ---

// 1. Mouse Hover (Distortion & Rotation target)
const mouse = new THREE.Vector2();
const targetRotation = new THREE.Vector2();
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

document.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX - windowHalfX);
    mouse.y = (event.clientY - windowHalfY);

    // Shader Uniform update
    sphereMaterial.uniforms.uHover.value.x = event.clientX / window.innerWidth;
    sphereMaterial.uniforms.uHover.value.y = 1.0 - (event.clientY / window.innerHeight);
});

// 2. Scroll Interactions (GSAP)
gsap.registerPlugin(ScrollTrigger);

// Initial State
sphere.position.y = 0;

// Hero -> Manifesto
gsap.to(sphere.position, {
    y: 1.5, // Move up (so it goes behind/above?) or down?
            // If I scroll down, content comes up. If sphere moves up (+y), it exits top.
            // If I want it to follow, it should move with camera? Camera is fixed.
            // Let's move sphere UP so it disappears or acts as a header.
    scrollTrigger: {
        trigger: ".manifesto",
        start: "top bottom",
        end: "center center",
        scrub: 1,
    }
});
// Scale down slightly
gsap.to(sphere.scale, {
    x: 0.6, y: 0.6, z: 0.6,
    scrollTrigger: {
        trigger: ".manifesto",
        start: "top bottom",
        end: "center center",
        scrub: 1
    }
});

// Mechanisms section - Sphere Interaction
const cards = document.querySelectorAll('.mechanism-card');
cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        const colorHex = card.getAttribute('data-color');
        const color = new THREE.Color(colorHex);

        // Tween Uniforms
        gsap.to(sphereMaterial.uniforms.uColorEdge.value, {
            r: color.r, g: color.g, b: color.b,
            duration: 0.5
        });
        gsap.to(sphereMaterial.uniforms.uDistort, {
            value: 0.2, // More distortion
            duration: 0.5
        });
    });

    card.addEventListener('mouseleave', () => {
        // Reset to Reddish
        gsap.to(sphereMaterial.uniforms.uColorEdge.value, {
            r: 1.0, g: 0.3, b: 0.3, // Roughly original red
            duration: 0.5
        });
        gsap.to(sphereMaterial.uniforms.uDistort, {
            value: 0.08,
            duration: 0.5
        });
    });
});


// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    sphereMaterial.uniforms.uTime.value = elapsedTime;

    // Smooth Rotation follow mouse
    targetRotation.x = (mouse.y * 0.001);
    targetRotation.y = (mouse.x * 0.001);

    sphere.rotation.x += 0.05 * (targetRotation.x - sphere.rotation.x);
    sphere.rotation.y += 0.05 * (targetRotation.y - sphere.rotation.y);

    // Idle rotation
    sphere.rotation.z += 0.002;

    renderer.render(scene, camera);
}
animate();

// --- Resize ---
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

window.addEventListener('resize', debounce(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, 250));
