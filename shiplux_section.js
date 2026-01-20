
// Scene Setup
const canvas = document.querySelector('#shipluxCanvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // White background

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 20; // Distance to view the globe nicely
camera.position.x = 0;
camera.position.y = 0;

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Slightly reduced
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(-5, 5, 10);
scene.add(dirLight);

// --- The Globe ---
const globeGroup = new THREE.Group();
scene.add(globeGroup);

// 1. Generate a procedural noise texture for displacement (to simulate landmasses)
function createNoiseTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#808080'; // Mid grey
    ctx.fillRect(0, 0, size, size);

    // simple random clouds
    for (let i = 0; i < 60; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = Math.random() * 50 + 20;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.2})`;
        ctx.fill();
    }

    // Add some darker patches
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = Math.random() * 50 + 20;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.2})`;
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

const displacementMap = createNoiseTexture();

// Larger Globe
const globeGeometry = new THREE.SphereGeometry(8, 128, 128);
const globeMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5f5f5, // Almost white
    roughness: 0.7, // Matte
    metalness: 0.0,
    displacementMap: displacementMap,
    displacementScale: 0.15, // Subtle relief
});
const globe = new THREE.Mesh(globeGeometry, globeMaterial);
globeGroup.add(globe);

// --- Arcs (Flight Paths) ---
// Helper to get point on sphere
function getPointOnSphere(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));
    return new THREE.Vector3(x, y, z);
}

// Create Arcs
function createArc(startLat, startLon, endLat, endLon) {
    const radius = 8; // Match new globe radius
    const start = getPointOnSphere(startLat, startLon, radius);
    const end = getPointOnSphere(endLat, endLon, radius);

    // Control point (midpoint projected out)
    const dist = start.distanceTo(end);
    const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(radius + (dist * 0.5)); // Dynamic height based on distance

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);

    // Use TubeGeometry for thickness
    const geometry = new THREE.TubeGeometry(curve, 32, 0.03, 8, false); // Radius 0.03
    const material = new THREE.MeshBasicMaterial({ color: 0xff9900 });
    const arc = new THREE.Mesh(geometry, material);

    // Endpoints (Dots)
    const dotGeo = new THREE.SphereGeometry(0.15, 16, 16); // Slightly larger
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xff9900 });

    const startDot = new THREE.Mesh(dotGeo, dotMat);
    startDot.position.copy(start);

    const endDot = new THREE.Mesh(dotGeo, dotMat);
    endDot.position.copy(end);

    globeGroup.add(arc);
    globeGroup.add(startDot);
    globeGroup.add(endDot);
}

// Add a few paths
createArc(40, -74, 51, 0); // NY to London approx
createArc(35, 139, 34, -118); // Tokyo to LA
createArc(-22, -43, 48, 2); // Rio to Paris

// --- Positioning ---
// The globe in the image is to the right and slightly cut off
globeGroup.position.x = 6; // Moved further right due to size
globeGroup.position.y = 0;

// --- Animation ---
function animate() {
    requestAnimationFrame(animate);

    // Slowly rotate globe
    globeGroup.rotation.y += 0.0005; // Slower

    renderer.render(scene, camera);
}
animate();

// Initial Tilt
globeGroup.rotation.x = 0.3;
globeGroup.rotation.z = 0.1;

// --- Resize Handler ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Mouse Interaction (Subtle Parallax) ---
// Simplified to avoid conflict with auto-rotation
document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth) - 0.5;
    const y = (e.clientY / window.innerHeight) - 0.5;

    // Only tilt (X/Z) based on mouse, let Y spin freely
    gsap.to(globeGroup.rotation, {
        x: 0.3 + (y * 0.1),
        z: 0.1 + (x * 0.1),
        duration: 1
    });
});

// --- UI Entry Animation ---
gsap.from(".title-block h1", {
    y: 50,
    opacity: 0,
    duration: 1.5,
    ease: "power3.out",
    delay: 0.5
});

gsap.from(".form-block", {
    x: 50,
    opacity: 0,
    duration: 1.5,
    ease: "power3.out",
    delay: 0.8
});

gsap.from(".logo, .contact-info, .bottom-bar", {
    opacity: 0,
    duration: 1,
    delay: 1.5
});
