
// --- 1. Background Mesh Gradient (Canvas 2D or ThreeJS) ---
// We'll use a simple Three.js Plane with a Shader for the nice gradient background.

function initBackground() {
    const canvas = document.getElementById('bg-canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Shader for the Aurora/Mesh Gradient
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColor1: { value: new THREE.Color('#a18cd1') }, // Purple/Lavendar
            uColor2: { value: new THREE.Color('#fbc2eb') }, // Pink/Peach
            uColor3: { value: new THREE.Color('#8fd3f4') }, // Cyan/Blue
            uColor4: { value: new THREE.Color('#ffffff') }, // White
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            uniform vec3 uColor3;
            uniform vec3 uColor4;
            varying vec2 vUv;

            // Simplex Noise Function (Simplified)
            vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
            float snoise(vec2 v){
                const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy) );
                vec2 x0 = v - i + dot(i, C.xx);
                vec2 i1;
                i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod(i, 289.0);
                vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                + i.x + vec3(0.0, i1.x, 1.0 ));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m ;
                m = m*m ;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                vec3 g;
                g.x  = a0.x  * x0.x  + h.x  * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            void main() {
                // Moving coordinates
                vec2 uv = vUv;
                float noise1 = snoise(uv * 1.5 + uTime * 0.1);
                float noise2 = snoise(uv * 2.0 - uTime * 0.15);

                // Mix colors based on position and noise
                vec3 color = mix(uColor1, uColor2, uv.y + noise1 * 0.2);
                color = mix(color, uColor3, uv.x + noise2 * 0.2);

                // Add white soft highlights
                float spot = smoothstep(0.3, 0.8, snoise(uv * 3.0 + uTime * 0.05));
                color = mix(color, uColor4, spot * 0.3);

                gl_FragColor = vec4(color, 1.0);
            }
        `
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(plane);

    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        material.uniforms.uTime.value = clock.getElapsedTime();
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}


// --- 2. The Date Picker 3D Object (Center Column) ---

function initDatePicker() {
    const container = document.getElementById('canvas-picker-container');
    const scene = new THREE.Scene();

    // Camera setup for small object
    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(2, 3, 4);
    scene.add(pointLight);

    const blueLight = new THREE.PointLight(0x4444ff, 0.8);
    blueLight.position.set(-2, -1, 2);
    scene.add(blueLight);

    // --- The Object (The "Block") ---
    // A rounded capsule/box shape.
    // Since Three.js CapsuleGeometry is vertical, we rotate it or use a stretched sphere/cylinder.
    // Let's use a Cylinder with spherical ends for a pill, or just a scaled Sphere.
    // Better: ExtrudeGeometry or a Box with high radius.
    // Simplest reliable "Pill": Cylinder with half-spheres.

    const group = new THREE.Group();
    scene.add(group);

    // Material: Dark, glossy, "smoked glass" or matte black plastic
    const mainMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x111111,
        roughness: 0.3,
        metalness: 0.1,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
        transparent: true,
        opacity: 0.95
    });

    // Geometry: A stretched box with rounded corners is hard in basic Three.js geometry.
    // We will use a scaled Cylinder for the body and spheres for ends.
    // Or just a very squashed sphere.
    // Let's try a Cylinder oriented horizontally.

    const radius = 0.8;
    const length = 1.4; // Length of the straight part

    const cylinderGeo = new THREE.CylinderGeometry(radius, radius, length, 64, 1, true);
    cylinderGeo.rotateZ(Math.PI / 2);
    const cylinder = new THREE.Mesh(cylinderGeo, mainMaterial);

    const sphereGeo = new THREE.SphereGeometry(radius, 64, 32);
    const sphereLeft = new THREE.Mesh(sphereGeo, mainMaterial);
    sphereLeft.position.x = -length / 2;

    const sphereRight = new THREE.Mesh(sphereGeo, mainMaterial);
    sphereRight.position.x = length / 2;

    group.add(cylinder);
    group.add(sphereLeft);
    group.add(sphereRight);

    // -- Caps/End-faces need to be closed if using open cylinder, but we used spheres.
    // Wait, the cylinder is open-ended? 'true' argument. Yes. So spheres cover it perfectly.

    // --- The "Interface" inside (Calendar Grid) ---
    // We'll simulate this with a Plane inside slightly, or floating just above surface.
    // Since it's a pill, the surface is curved. A plane inside might look like a screen.

    const gridTextureCanvas = document.createElement('canvas');
    gridTextureCanvas.width = 512;
    gridTextureCanvas.height = 256;
    const ctx = gridTextureCanvas.getContext('2d');

    // Draw UI interface on canvas
    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0,0, 512, 256);

    // Grid of numbers
    ctx.fillStyle = '#444'; // Inactive dates
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';

    const rows = 5;
    const cols = 7;
    const startX = 100;
    const startY = 60;
    const gapX = 45;
    const gapY = 35;

    let day = 1;
    for(let r=0; r<rows; r++){
        for(let c=0; c<cols; c++){
            if(day > 31) break;

            // Highlight one day
            if(day === 18) {
                 ctx.fillStyle = '#fff';
                 ctx.beginPath();
                 ctx.arc(startX + c*gapX, startY + r*gapY - 7, 15, 0, Math.PI*2);
                 ctx.fill();
                 ctx.fillStyle = '#000'; // Text color
            } else {
                 ctx.fillStyle = '#555';
            }

            ctx.fillText(day.toString(), startX + c*gapX, startY + r*gapY);
            day++;
        }
    }

    // Header lines
    ctx.fillStyle = '#333';
    ctx.fillRect(100, 20, 300, 10); // "Month" bar

    const uiTexture = new THREE.CanvasTexture(gridTextureCanvas);

    // UI Plane
    const uiGeometry = new THREE.PlaneGeometry(2.4, 1.2);
    const uiMaterial = new THREE.MeshBasicMaterial({
        map: uiTexture,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    const uiPlane = new THREE.Mesh(uiGeometry, uiMaterial);
    uiPlane.position.z = radius * 0.5; // Inside the "glass"
    group.add(uiPlane);


    // --- Interaction ---
    const mouse = new THREE.Vector2();
    const targetRotation = new THREE.Vector2();

    // We track mouse relative to the container center
    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Normalize -1 to 1
        mouse.x = (x / rect.width) * 2 - 1;
        mouse.y = -(y / rect.height) * 2 + 1;
    });

    container.addEventListener('mouseleave', () => {
        mouse.x = 0;
        mouse.y = 0;
    });

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        // Smooth follow
        targetRotation.x = mouse.y * 0.5; // Max tilt up/down
        targetRotation.y = mouse.x * 0.5; // Max tilt left/right

        group.rotation.x += 0.05 * (targetRotation.x - group.rotation.x);
        group.rotation.y += 0.05 * (targetRotation.y - group.rotation.y);

        // Idle float
        group.position.y = Math.sin(Date.now() * 0.002) * 0.05;

        renderer.render(scene, camera);
    }
    animate();

    // Resize
    new ResizeObserver(() => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }).observe(container);
}

// Initialize everything
window.addEventListener('load', () => {
    initBackground();
    initDatePicker();
});
