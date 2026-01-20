// --- Constants & Config ---
const CONFIG = {
    orbitRadius: 2.8,
    sphereRadius: 1.6,
    colors: {
        ring: 0x333333,
        dot: 0x000000,
        token: 0x444444,
        active: 0x000000
    }
};

// --- DOM Elements ---
const container = document.getElementById('canvas-container');
const validatorList = document.querySelector('.validator-list');
const dashContent = document.querySelector('.dash-content');

// --- Three.js Setup ---
const scene = new THREE.Scene();

// Perspective Camera
const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 0, 9.5); // Adjusted for better framing
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
});
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// --- Group for Parallax ---
const mainGroup = new THREE.Group();
scene.add(mainGroup);

// --- 1. Orbital Ring Sphere ---
const sphereGroup = new THREE.Group();
mainGroup.add(sphereGroup);

function createRing(radius, tube, axisRotation) {
    // Using TorusGeometry for physical volume or LineLoop for thin lines?
    // Image shows very thin lines. LineLoop or highly segmented thin tube.
    // Let's use LineLoop for crispness.

    const curve = new THREE.EllipseCurve(
        0, 0,            // ax, aY
        radius, radius,  // xRadius, yRadius
        0, 2 * Math.PI,  // aStartAngle, aEndAngle
        false,           // aClockwise
        0                // aRotation
    );

    const points = curve.getPoints(64);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.15
    });

    const ring = new THREE.LineLoop(geometry, material);

    // Rotate ring
    if (axisRotation) {
        ring.rotation.y = axisRotation;
    }

    return ring;
}

// Create Meridian Rings (Vertical)
const ringCount = 8;
for (let i = 0; i < ringCount; i++) {
    const angle = (i / ringCount) * Math.PI;
    const ring = createRing(CONFIG.sphereRadius, 0.01, angle);
    sphereGroup.add(ring);
}

// Create Parallel Rings (Horizontal) - Optional, image mostly shows vertical meridians intersecting
// But let's add one equator and maybe 2 tropics for structure
const equator = createRing(CONFIG.sphereRadius, 0.01, 0);
equator.rotation.x = Math.PI / 2;
sphereGroup.add(equator);


// --- Dots on Sphere ---
const dotsGroup = new THREE.Group();
sphereGroup.add(dotsGroup);

const dotGeometry = new THREE.SphereGeometry(0.04, 16, 16);
const dotMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });

// Place dots at intersections roughly
for (let i = 0; i < ringCount; i++) {
    const theta = (i / ringCount) * Math.PI; // Y rotation of ring

    // Add dots along this ring
    for (let j = 0; j < 8; j++) {
        // Parametric equation for a point on a rotated circle
        const phi = (j / 8) * Math.PI * 2;

        // Base circle in XY plane
        const x = CONFIG.sphereRadius * Math.cos(phi);
        const y = CONFIG.sphereRadius * Math.sin(phi);
        const z = 0;

        // Rotate around Y axis by theta
        const rx = x * Math.cos(theta) + z * Math.sin(theta);
        const ry = y;
        const rz = -x * Math.sin(theta) + z * Math.cos(theta);

        if (Math.random() > 0.4) { // Randomly omit some
            const dot = new THREE.Mesh(dotGeometry, dotMaterial);
            dot.position.set(rx, ry, rz);
            dotsGroup.add(dot);
        }
    }
}

// Center Core
const coreGeo = new THREE.SphereGeometry(0.2, 32, 32);
const coreMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const core = new THREE.Mesh(coreGeo, coreMat);
sphereGroup.add(core);


// --- 2. Orbiting "Tokens" (Validators) ---
const orbitsGroup = new THREE.Group();
mainGroup.add(orbitsGroup);

// Token Geometry: Flat Cylinder
const tokenGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.02, 32);
tokenGeometry.rotateX(Math.PI / 2); // Face Z

const tokenMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.3,
    metalness: 0.2
});

const tokens = [];
const tokenCount = 12;

for (let i = 0; i < tokenCount; i++) {
    const token = new THREE.Mesh(tokenGeometry, tokenMaterial.clone());

    // Random Orbital Params
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1); // Spherical distribution
    const radius = CONFIG.orbitRadius + (Math.random() * 0.5);

    token.position.setFromSphericalCoords(radius, phi, theta);
    token.lookAt(0,0,0); // Face center? Or Camera? Let's face camera later

    token.userData = {
        radius: radius,
        theta: theta,
        phi: phi,
        speedTheta: (Math.random() - 0.5) * 0.005,
        speedPhi: (Math.random() - 0.5) * 0.005,
        id: i
    };

    orbitsGroup.add(token);
    tokens.push(token);
}

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 5, 10);
scene.add(dirLight);

const spotLight = new THREE.SpotLight(0xffaaaa, 0.5); // Pinkish tint
spotLight.position.set(-5, 0, 5);
scene.add(spotLight);


// --- Overlay Logic (SVG Connection) ---
const overlaySvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
Object.assign(overlaySvg.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '10',
    overflow: 'visible'
});
dashContent.style.position = 'relative';
dashContent.appendChild(overlaySvg);

const connectionPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
connectionPath.setAttribute("fill", "none");
connectionPath.setAttribute("stroke", "rgba(0,0,0,0.4)");
connectionPath.setAttribute("stroke-width", "1");
overlaySvg.appendChild(connectionPath);

const connectionEndDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
connectionEndDot.setAttribute("r", "3");
connectionEndDot.setAttribute("fill", "#fff");
connectionEndDot.setAttribute("stroke", "#000");
connectionEndDot.setAttribute("stroke-width", "1.5");
overlaySvg.appendChild(connectionEndDot);


// --- State Management ---
let activeToken = null;
let activeListItem = null;
let mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster();
let targetRotation = { x: 0, y: 0 };


// --- Mock Data & List Generation ---
function generateListData() {
    let html = '';
    for(let i=0; i<15; i++) {
        const hash = '0x' + Math.random().toString(16).substr(2, 6) + '...' + Math.random().toString(36).substr(2, 8);
        const blockNum = 492880 + i;
        html += `<div class="list-item" data-index="${i}">
            <span class="block-num">${blockNum}</span>
            <span class="hash">${hash}</span>
        </div>`;
    }
    validatorList.innerHTML = html;

    // Add Listeners
    document.querySelectorAll('.list-item').forEach(item => {
        item.addEventListener('mouseenter', (e) => {
            setActiveItem(item, parseInt(item.dataset.index));
        });
    });
}
generateListData();

// Select a random initial active item
const initialIndex = 6;
const items = document.querySelectorAll('.list-item');
if(items[initialIndex]) setActiveItem(items[initialIndex], initialIndex);


function setActiveItem(domItem, index) {
    // Reset previous
    if(activeListItem) activeListItem.classList.remove('active-connection');
    if(activeToken) {
        activeToken.material.color.setHex(CONFIG.colors.token);
        activeToken.scale.set(1,1,1);
    }

    // Set New
    activeListItem = domItem;
    activeListItem.classList.add('active-connection');

    // Map list index to a token (wrap around if needed)
    const tokenIndex = index % tokens.length;
    activeToken = tokens[tokenIndex];

    // Highlight Token
    activeToken.material.color.setHex(CONFIG.colors.active);
    activeToken.scale.set(1.5, 1.5, 1.5);

    // Trigger update
    updateConnectionLine();
}


// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    // 1. Rotate Sphere
    sphereGroup.rotation.y += 0.001;
    sphereGroup.rotation.z += 0.0005;

    // 2. Animate Tokens
    tokens.forEach(token => {
        const ud = token.userData;
        ud.theta += ud.speedTheta;
        ud.phi += ud.speedPhi;

        token.position.setFromSphericalCoords(ud.radius, ud.phi, ud.theta);
        token.lookAt(camera.position); // Billboarding
    });

    // 3. Parallax Easing
    mainGroup.rotation.x += (targetRotation.x - mainGroup.rotation.x) * 0.05;
    mainGroup.rotation.y += (targetRotation.y - mainGroup.rotation.y) * 0.05;

    // 4. Update Line
    updateConnectionLine();

    renderer.render(scene, camera);
}

function updateConnectionLine() {
    if(!activeToken || !activeListItem) return;

    // 3D Point to Screen
    const vector = activeToken.position.clone();
    vector.applyMatrix4(activeToken.parent.matrixWorld); // Apply group transforms
    vector.project(camera);

    const x = (vector.x * 0.5 + 0.5) * container.clientWidth;
    const y = (-(vector.y * 0.5) + 0.5) * container.clientHeight;

    // DOM Point
    const parentRect = dashContent.getBoundingClientRect();
    const itemRect = activeListItem.getBoundingClientRect();

    const domX = itemRect.left - parentRect.left;
    const domY = itemRect.top - parentRect.top + (itemRect.height / 2);

    // Draw Bezier Curve
    // M startX startY C cp1x cp1y, cp2x cp2y, endX endY
    const cp1X = x + (domX - x) * 0.5;
    const cp1Y = y;
    const cp2X = x + (domX - x) * 0.5;
    const cp2Y = domY;

    const d = `M ${x} ${y} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${domX} ${domY}`;

    connectionPath.setAttribute("d", d);

    // Dot at end
    connectionEndDot.setAttribute("cx", domX);
    connectionEndDot.setAttribute("cy", domY);
}


// --- Input Handling ---
document.addEventListener('mousemove', (e) => {
    // Normalized device coordinates -1 to 1
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;

    // Update mouse vector for Raycaster
    // We need coordinates relative to the canvas container, not full window for raycasting if canvas is smaller?
    // Actually, raycaster needs NDC of the camera view.
    // Our canvas fills the container. Let's calculate NDC relative to canvas.
    const rect = container.getBoundingClientRect();
    const canvasX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const canvasY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    mouse.set(canvasX, canvasY);

    // Parallax Target (use window relative for global feel)
    targetRotation.x = y * 0.1;
    targetRotation.y = x * 0.1;

    // Raycasting for 3D Hover
    checkIntersection();
});

function checkIntersection() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(tokens);

    if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object !== activeToken) {
            // Find corresponding list item
            // We mapped list items to tokens via modulo in setActiveItem.
            // Here we need to find the list item that maps to this token ID.
            // Since tokens are fewer than list items, multiple list items might map to one token.
            // We'll just pick the first visible one or matching index if possible.
            // Ideally, token.userData.id matches list index? No, modulo used.

            // Let's reverse find: which list item would activate this token?
            // tokenIndex = listIndex % tokens.length
            // so listIndex could be tokenIndex.
            const targetIndex = object.userData.id;
            const item = document.querySelector(`.list-item[data-index="${targetIndex}"]`);

            if(item) {
                setActiveItem(item, targetIndex);
                // Scroll to item if needed
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        // Cursor pointer
        container.style.cursor = 'pointer';
    } else {
        container.style.cursor = 'default';
    }
}

// Resize
window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

// Start
animate();
