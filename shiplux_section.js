
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

// 1. Generate a procedural Earth-like texture for displacement
function createEarthTexture() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Background (Ocean) - Flat
    ctx.fillStyle = '#666666';
    ctx.fillRect(0, 0, size, size);

    // Function to draw soft blobs
    function drawBlob(x, y, r, distortion) {
        ctx.beginPath();
        for (let i = 0; i <= 360; i+=10) {
            const angle = i * Math.PI / 180;
            const radius = r + (Math.random() * distortion - distortion/2);
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = '#ffffff'; // Land is high (white)
        ctx.fill();

        // Soften edges
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffffff';
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Rough approximation of continents using blobs on the UV map
    // UV map: x=0 is -180 deg, x=1 is 180 deg. y=0 is North, y=1 is South.

    // Americas (Left side)
    drawBlob(size * 0.25, size * 0.3, size * 0.12, 30); // North America
    drawBlob(size * 0.3, size * 0.65, size * 0.09, 25); // South America

    // Eurasia & Africa (Right side)
    drawBlob(size * 0.55, size * 0.5, size * 0.11, 30); // Africa
    drawBlob(size * 0.6, size * 0.25, size * 0.14, 40); // Europe/Asia

    // Australia
    drawBlob(size * 0.85, size * 0.7, size * 0.05, 10);

    // Noise Overlay for texture
    ctx.globalCompositeOperation = 'overlay';
    for (let i = 0; i < 2000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.1})`;
        ctx.fillRect(x, y, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

const displacementMap = createEarthTexture();

// Larger Globe with more segments for detail
const globeGeometry = new THREE.SphereGeometry(8, 256, 256);
const globeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.8,
    metalness: 0.1,
    displacementMap: displacementMap,
    displacementScale: 0.3, // More pronounced continents
    displacementBias: -0.1, // Keep oceans down
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
    startDot.userData = { type: 'location', name: "Location A", isStart: true };

    const endDot = new THREE.Mesh(dotGeo, dotMat);
    endDot.position.copy(end);
    endDot.userData = { type: 'location', name: "Location B", isStart: false };

    globeGroup.add(arc);
    globeGroup.add(startDot);
    globeGroup.add(endDot);

    return { startDot, endDot };
}

// Add a few paths with Names
const route1 = createArc(40, -74, 51, 0); // NY to London
route1.startDot.userData.name = "New York, USA";
route1.endDot.userData.name = "London, UK";

const route2 = createArc(35, 139, 34, -118); // Tokyo to LA
route2.startDot.userData.name = "Tokyo, Japan";
route2.endDot.userData.name = "Los Angeles, USA";

const route3 = createArc(-22, -43, 48, 2); // Rio to Paris
route3.startDot.userData.name = "Rio de Janeiro, Brazil";
route3.endDot.userData.name = "Paris, France";

// --- Positioning ---
// The globe in the image is to the right and slightly cut off
globeGroup.position.x = 6; // Moved further right due to size
globeGroup.position.y = 0;

// --- Interaction Logic ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let autoRotateSpeed = 0.0005;

// Inputs
const pickupInput = document.querySelectorAll('input')[0];
const deliveryInput = document.querySelectorAll('input')[1];
const quoteBtn = document.querySelector('.quote-btn');

// Events
window.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

window.addEventListener('mousemove', (e) => {
    // 1. Drag Rotation
    if (isDragging) {
        const deltaMove = {
            x: e.clientX - previousMousePosition.x,
            y: e.clientY - previousMousePosition.y
        };

        // Apply rotation
        const rotateSpeed = 0.005;
        globeGroup.rotation.y += deltaMove.x * rotateSpeed;
        globeGroup.rotation.x += deltaMove.y * rotateSpeed;

        previousMousePosition = { x: e.clientX, y: e.clientY };

        // Stop auto rotation temporarily
        autoRotateSpeed = 0;
    } else {
        // Resume slowly
        autoRotateSpeed = THREE.MathUtils.lerp(autoRotateSpeed, 0.0005, 0.02);
    }

    // 2. Parallax (reduced if dragging)
    if (!isDragging) {
        const x = (e.clientX / window.innerWidth) - 0.5;
        const y = (e.clientY / window.innerHeight) - 0.5;

        gsap.to(globeGroup.rotation, {
            z: 0.1 + (x * 0.05),
            duration: 1,
            overwrite: 'auto'
        });
    }

    // 3. Hover/Click Raycasting
    // Normalized mouse for raycasting
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// Click Handler for Dots
window.addEventListener('click', (e) => {
    // Raycast
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(globeGroup.children);

    for (let i = 0; i < intersects.length; i++) {
        const object = intersects[i].object;
        if (object.userData.type === 'location') {
            // Found a dot
            const name = object.userData.name;

            // Populate Form (Simple Logic: Alternate or fill empty)
            if (pickupInput.value === "") {
                pickupInput.value = name;
                // Animate input
                gsap.from(pickupInput, { scale: 1.1, duration: 0.2 });
            } else if (deliveryInput.value === "") {
                deliveryInput.value = name;
                gsap.from(deliveryInput, { scale: 1.1, duration: 0.2 });
            } else {
                // Reset and start over
                pickupInput.value = name;
                deliveryInput.value = "";
                gsap.from(pickupInput, { scale: 1.1, duration: 0.2 });
            }

            // Pulse the dot
            gsap.to(object.scale, { x: 2, y: 2, z: 2, yoyo: true, repeat: 1, duration: 0.3 });
        }
    }
});

// Intelligent Interaction: Hover Quote Button
quoteBtn.addEventListener('mouseenter', () => {
    // Spin faster
    gsap.to(globeGroup.rotation, {
        y: globeGroup.rotation.y + 1, // rapid spin
        duration: 1.5,
        ease: "power2.out"
    });

    // Pulse all dots
    globeGroup.children.forEach(child => {
        if(child.userData.type === 'location') {
            gsap.to(child.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.3, yoyo: true, repeat: 1 });
        }
    });
});

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    // Auto Rotate
    if(!isDragging) {
        globeGroup.rotation.y += autoRotateSpeed;
    }

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
