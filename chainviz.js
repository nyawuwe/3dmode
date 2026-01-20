// --- Constants & Config ---
const CONFIG = {
    colorCenter: 0x000000,
    colorPoints: 0x1a1a1a,
    colorLines: 0x333333,
    orbitRadius: 2.5,
    particleCount: 200, // For the central sphere "dots"
};

// --- DOM Elements ---
const container = document.getElementById('canvas-container');
const validatorList = document.querySelector('.validator-list');

// --- Three.js Setup ---
const scene = new THREE.Scene();

// Perspective Camera
const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 0, 8); // Start further back
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
    alpha: true, // Transparent background
    antialias: true
});
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// --- 1. Central Abstract Sphere (Dots/Nodes) ---
const sphereGroup = new THREE.Group();
scene.add(sphereGroup);

// Create a Geodesic-like structure using points
const geometry = new THREE.IcosahedronGeometry(1.5, 4); // Radius 1.5, Detail 4
const positions = geometry.attributes.position.array;

// We will create a points system
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = positions.length / 3;
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const particlesMaterial = new THREE.PointsMaterial({
    color: 0x222222,
    size: 0.04,
    transparent: true,
    opacity: 0.6
});
const particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
sphereGroup.add(particleSystem);

// Inner faint wireframe sphere for volume
const innerGeo = new THREE.SphereGeometry(1.45, 32, 32);
const innerMat = new THREE.MeshBasicMaterial({
    color: 0xffaaaa, // Subtle red hint from image center
    wireframe: true,
    transparent: true,
    opacity: 0.05
});
const innerSphere = new THREE.Mesh(innerGeo, innerMat);
sphereGroup.add(innerSphere);

// --- 2. Orbiting "Blocks" (Validators) ---
const orbitsGroup = new THREE.Group();
scene.add(orbitsGroup);

const blockGeometries = [
    new THREE.BoxGeometry(0.2, 0.2, 0.2),
    new THREE.TetrahedronGeometry(0.15),
    new THREE.OctahedronGeometry(0.15)
];

const blockMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.4,
    metalness: 0.1,
});

const blocks = [];
const blockCount = 18;

for (let i = 0; i < blockCount; i++) {
    // Randomize shape
    const geo = blockGeometries[Math.floor(Math.random() * blockGeometries.length)];
    const mesh = new THREE.Mesh(geo, blockMaterial);

    // Orbital parameters
    const angle = (i / blockCount) * Math.PI * 2;
    const radius = 2.2 + (Math.random() * 0.8); // Varying distance
    const yOffset = (Math.random() - 0.5) * 2.5; // Spread vertically

    mesh.position.set(
        Math.cos(angle) * radius,
        yOffset,
        Math.sin(angle) * radius
    );

    // Store orbital data for animation
    mesh.userData = {
        radius: radius,
        angle: angle,
        speed: 0.002 + Math.random() * 0.003,
        yOffset: yOffset,
        bobSpeed: Math.random() * 0.01,
        bobOffset: Math.random() * Math.PI
    };

    orbitsGroup.add(mesh);
    blocks.push(mesh);

    // Add thin lines connecting some blocks to center or others?
    // Let's add a "trail" or connection line to the center for a few of them
    if (i % 3 === 0) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            mesh.position
        ]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.1 });
        const line = new THREE.Line(lineGeo, lineMat);
        mesh.userData.line = line; // Store ref to update
        orbitsGroup.add(line);
    }
}

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// --- Populate List Data (Mock) ---
function generateListData() {
    let html = '';
    for(let i=0; i<20; i++) {
        // Generate random hash
        const hash = '0x' + Math.random().toString(16).substr(2, 6) + '...' + Math.random().toString(36).substr(2, 8);
        const blockNum = 492880 + i;

        // Mark the 7th item as "active" to match image composition
        const isActive = (i === 6) ? 'active-connection' : '';

        html += `<div class="list-item ${isActive}" data-index="${i}">
            <span class="block-num">${blockNum}</span>
            <span class="hash">${hash}</span>
        </div>`;
    }
    validatorList.innerHTML = html;
}
generateListData();

// --- Visual Connection (Line from 3D object to DOM element) ---
// We need an SVG overlay or Canvas overlay to draw the line
const overlaySvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
overlaySvg.style.position = 'absolute';
overlaySvg.style.top = '0';
overlaySvg.style.left = '0';
overlaySvg.style.width = '100%';
overlaySvg.style.height = '100%';
overlaySvg.style.pointerEvents = 'none';
overlaySvg.style.zIndex = '10'; // Above canvas, below some UI?
overlaySvg.style.overflow = 'visible'; // Ensure line is not clipped even if it goes out of bounds slightly

const dashContent = document.querySelector('.dash-content');
dashContent.style.position = 'relative';
dashContent.appendChild(overlaySvg);

const connectionLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
connectionLine.setAttribute("stroke", "rgba(0,0,0,0.3)");
connectionLine.setAttribute("stroke-width", "1");
overlaySvg.appendChild(connectionLine);

const connectionDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
connectionDot.setAttribute("r", "3");
connectionDot.setAttribute("fill", "#000");
overlaySvg.appendChild(connectionDot);

// Pick one block to be the "Active" one
const activeBlockIndex = 6; // Matching the list item index roughly
const activeBlock = blocks[activeBlockIndex % blocks.length];
// Highlight it in 3D
activeBlock.material = activeBlock.material.clone();
activeBlock.material.color.setHex(0x000000); // Darker
activeBlock.scale.set(1.5, 1.5, 1.5);

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    // Rotate central sphere
    sphereGroup.rotation.y += 0.001;
    sphereGroup.rotation.z += 0.0005;

    // Animate Blocks
    blocks.forEach(block => {
        const ud = block.userData;

        // Update Angle
        ud.angle += ud.speed;

        // Bobbing
        const bobY = Math.sin(Date.now() * 0.001 + ud.bobOffset) * 0.2;

        // Update Position
        block.position.x = Math.cos(ud.angle) * ud.radius;
        block.position.z = Math.sin(ud.angle) * ud.radius;
        block.position.y = ud.yOffset + bobY;

        // Rotate block itself
        block.rotation.x += 0.01;
        block.rotation.y += 0.01;

        // Update Line if exists
        if (ud.line) {
            const positions = ud.line.geometry.attributes.position.array;
            // Point 0 is 0,0,0. Point 1 is block pos.
            positions[3] = block.position.x;
            positions[4] = block.position.y;
            positions[5] = block.position.z;
            ud.line.geometry.attributes.position.needsUpdate = true;
        }
    });

    updateConnectionLine();

    renderer.render(scene, camera);
}

function updateConnectionLine() {
    // Project active block position to 2D screen space
    const vector = activeBlock.position.clone();
    vector.project(camera);

    // Map to canvas coords (0,0 is top-left of canvas)
    // Canvas is the first element in dash-content grid, so its 0,0 aligns with dash-content 0,0
    const x = (vector.x * 0.5 + 0.5) * container.clientWidth;
    const y = (-(vector.y * 0.5) + 0.5) * container.clientHeight;

    // Get DOM element position relative to the dash-content (SVG parent)
    const activeDom = document.querySelector('.active-connection');
    if(activeDom) {
        const rect = activeDom.getBoundingClientRect();
        const parentRect = dashContent.getBoundingClientRect();

        // Calculate coords relative to the SVG/Container
        const domX = rect.left - parentRect.left;
        const domY = rect.top - parentRect.top + (rect.height / 2);

        connectionLine.setAttribute("x1", x);
        connectionLine.setAttribute("y1", y);
        connectionLine.setAttribute("x2", domX);
        connectionLine.setAttribute("y2", domY);

        connectionDot.setAttribute("cx", x);
        connectionDot.setAttribute("cy", y);
    }
}

// Start
animate();

// --- Resize Handling ---
window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});
