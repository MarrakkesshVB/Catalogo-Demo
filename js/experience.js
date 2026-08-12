import * as THREE from "three";

/**
 * ==========================================================================
 * EXPERIENCIA 3D Y EFECTOS CINEMÁTICOS (js/experience.js)
 * Renderiza el smartphone 3D flotante con Three.js, partículas interactivas
 * y orquestación de scroll cinematográfico con soporte mobile-first.
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  // Verificar disponibilidad de Three.js
  if (typeof THREE === "undefined" || !THREE) {
    console.warn("Three.js no está cargado. Se omitirá el canvas 3D.");
    initFallbackEffects();
    return;
  }

  init3DExperience();
  initScrollAnimations();
});

function init3DExperience() {
  const canvas = document.getElementById("webgl-canvas");
  if (!canvas) return;

  // Detectar dispositivo móvil
  const isMobile = window.innerWidth < 768;

  // 1. Escena, Cámara y Renderizador
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 7.5);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  // Limitar pixelRatio para máximo rendimiento en pantallas Retina/Mobile
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // 2. Luces Cinematográficas
  const ambientLight = new THREE.AmbientLight(0x2a3a55, 2.0);
  scene.add(ambientLight);

  // Luz frontal/superior
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
  keyLight.position.set(5, 8, 5);
  scene.add(keyLight);

  // Luz de borde cian (Rim Light Izquierda)
  const cyanRim = new THREE.PointLight(0xaad3f2, 4.0, 20);
  cyanRim.position.set(-5, -2, 4);
  scene.add(cyanRim);

  // Luz de borde azul eléctrico (Rim Light Derecha)
  const blueRim = new THREE.PointLight(0x6aa9dd, 4.0, 20);
  blueRim.position.set(5, 2, -3);
  scene.add(blueRim);

  // Luz púrpura suave de relleno
  const purpleRim = new THREE.PointLight(0xe63946, 2.0, 15);
  purpleRim.position.set(0, -6, 2);
  scene.add(purpleRim);

  // 3. Construcción del Smartphone 3D Procedural (Titanium Frame & Triple Cam)
  const phoneGroup = new THREE.Group();
  scene.add(phoneGroup);

  // Materiales de alta calidad PBR
  const titaniumMaterial = new THREE.MeshStandardMaterial({
    color: 0xaad3f2,
    metalness: 0.7,
    roughness: 0.3,
    envMapIntensity: 1.5
  });

  const screenGlassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x050811,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.1,
    opacity: 0.25,
    transparent: true,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05
  });

  const lensGlassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0a1128,
    metalness: 0.9,
    roughness: 0.08,
    clearcoat: 1.0
  });

  const cameraBumpMaterial = new THREE.MeshStandardMaterial({
    color: 0x7fb8e6,
    metalness: 0.9,
    roughness: 0.25
  });

  // Cuerpo del Teléfono (Chasis)
  const phoneWidth = 1.4;
  const phoneHeight = 2.8;
  const phoneDepth = 0.16;

  const bodyGeometry = createRoundedBoxGeometry(phoneWidth, phoneHeight, phoneDepth, 0.15);
  const phoneBody = new THREE.Mesh(bodyGeometry, titaniumMaterial);
  phoneGroup.add(phoneBody);

  // Pantalla Fontal OLED (PANTALLA BRILLANTE)
  const screenGeometry = new THREE.PlaneGeometry(phoneWidth - 0.08, phoneHeight - 0.08);
  
  // Crear textura canvas para la pantalla con fondo degradado y logo
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 512;
  screenCanvas.height = 1024;
  const ctx = screenCanvas.getContext("2d");

  // Fondo OLED Cyber Dark
  const grad = ctx.createLinearGradient(0, 0, 512, 1024);
  grad.addColorStop(0, "#000000");
  grad.addColorStop(0.4, "#050505");
  grad.addColorStop(0.7, "#0a0a0a");
  grad.addColorStop(1, "#111111");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 1024);

  // Texto / Marca en Pantalla
  ctx.fillStyle = "#f2c94c";
  ctx.font = "bold 46px 'Helvetica Neue', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("★ 5.0 EN GOOGLE", 256, 500);

  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = "600 20px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText("FLORENCIA CELULARES", 256, 545);

  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  const screenMaterial = new THREE.MeshBasicMaterial({
    map: screenTexture,
    transparent: false
  });

  const screenMesh = new THREE.Mesh(screenGeometry, screenMaterial);
  screenMesh.position.z = 0.145;
  phoneGroup.add(screenMesh);

  // Cristal de Pantalla Superior
  const screenOverlay = new THREE.Mesh(screenGeometry, screenGlassMaterial);
  screenOverlay.position.z = 0.148;
  phoneGroup.add(screenOverlay);

  // Módulo de Cámara Trasera (Isla)
  const bumpWidth = 0.65;
  const bumpHeight = 0.75;
  const bumpDepth = 0.06;
  const bumpGeo = createRoundedBoxGeometry(bumpWidth, bumpHeight, bumpDepth, 0.08);
  const cameraBump = new THREE.Mesh(bumpGeo, cameraBumpMaterial);
  cameraBump.position.set(-0.28, 0.82, -(phoneDepth / 2) - (bumpDepth / 2));
  phoneGroup.add(cameraBump);

  // Lentes de Cámara Triple Pro (3 cilindros)
  const lensPositions = [
    { x: -0.42, y: 0.98, r: 0.13 },
    { x: -0.42, y: 0.66, r: 0.13 },
    { x: -0.15, y: 0.82, r: 0.13 }
  ];

  lensPositions.forEach((pos) => {
    // Anillo exterior de titanio
    const ringGeo = new THREE.CylinderGeometry(pos.r + 0.02, pos.r + 0.02, 0.08, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, titaniumMaterial);
    ringMesh.position.set(pos.x, pos.y, -(phoneDepth / 2) - bumpDepth - 0.02);
    phoneGroup.add(ringMesh);

    // Cristal interior del lente
    const lensGeo = new THREE.CylinderGeometry(pos.r, pos.r, 0.085, 32);
    lensGeo.rotateX(Math.PI / 2);
    const lensMesh = new THREE.Mesh(lensGeo, lensGlassMaterial);
    lensMesh.position.set(pos.x, pos.y, -(phoneDepth / 2) - bumpDepth - 0.025);
    phoneGroup.add(lensMesh);
  });

  // Flash LED y sensor LiDAR
  const flashGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.07, 16);
  flashGeo.rotateX(Math.PI / 2);
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
  const flashMesh = new THREE.Mesh(flashGeo, flashMat);
  flashMesh.position.set(-0.15, 1.02, -(phoneDepth / 2) - bumpDepth - 0.02);
  phoneGroup.add(flashMesh);

  // 4. Sistema de Partículas Ambientales (Polvo estelar brillante)
  const particleCount = isMobile ? 60 : 380;
  const particlesGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const scales = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
    scales[i] = Math.random() * 0.06 + 0.02;
  }

  particlesGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // Generar textura de partícula suave cian
  const particleCanvas = document.createElement("canvas");
  particleCanvas.width = 64;
  particleCanvas.height = 64;
  const pCtx = particleCanvas.getContext("2d");
  const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
  pGrad.addColorStop(0, "rgba(170, 211, 242, 1)");
  pGrad.addColorStop(0.5, "rgba(106, 169, 221, 0.5)");
  pGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 64, 64);

  const particleTexture = new THREE.CanvasTexture(particleCanvas);

  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.15,
    map: particleTexture,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const particleSystem = new THREE.Points(particlesGeo, particlesMaterial);
  scene.add(particleSystem);

  // 5. Red de Partículas Neuronales (Efecto Galaxy AI / Inteligencia)
  const nodeCount = isMobile ? 24 : 45;
  const nodeGeo = new THREE.BufferGeometry();
  const nodePositions = new Float32Array(nodeCount * 3);

  for (let i = 0; i < nodeCount; i++) {
    nodePositions[i * 3] = (Math.random() - 0.5) * 6;
    nodePositions[i * 3 + 1] = (Math.random() - 0.5) * 6;
    nodePositions[i * 3 + 2] = (Math.random() - 0.5) * 4;
  }

  nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));

  const nodeMat = new THREE.PointsMaterial({
    color: 0xaad3f2,
    size: 0.08,
    transparent: true,
    opacity: 0, // Se activa en la escena de IA
    blending: THREE.AdditiveBlending
  });

  const nodeSystem = new THREE.Points(nodeGeo, nodeMat);
  scene.add(nodeSystem);

  // Lineas de conexion inter-nodo
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xaad3f2,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending
  });

  const lineGeo = new THREE.BufferGeometry();
  const linePositions = [];

  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      const dx = nodePositions[i * 3] - nodePositions[j * 3];
      const dy = nodePositions[i * 3 + 1] - nodePositions[j * 3 + 1];
      const dz = nodePositions[i * 3 + 2] - nodePositions[j * 3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 2.0) {
        linePositions.push(
          nodePositions[i * 3], nodePositions[i * 3 + 1], nodePositions[i * 3 + 2],
          nodePositions[j * 3], nodePositions[j * 3 + 1], nodePositions[j * 3 + 2]
        );
      }
    }
  }

  lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  const linesMesh = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(linesMesh);

  // 6. Estado de Interacción Mouse / Parallax
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

  window.addEventListener("mousemove", (e) => {
    mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 0.8;
    mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 0.8;
  });

  window.addEventListener("touchmove", (e) => {
    if (e.touches.length > 0) {
      mouse.targetX = (e.touches[0].clientX / window.innerWidth - 0.5) * 0.5;
      mouse.targetY = (e.touches[0].clientY / window.innerHeight - 0.5) * 0.5;
    }
  }, { passive: true });

  // 7. Render Loop con Interpolación Suave (Lerp)
  let scrollProgress = 0;
  let targetScrollProgress = 0;

  function calculateScroll() {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (totalHeight > 0) {
      targetScrollProgress = Math.min(Math.max(window.scrollY / totalHeight, 0), 1);
    }
  }

  window.addEventListener("scroll", calculateScroll, { passive: true });
  calculateScroll();

  const clock = new THREE.Clock();
  let isCanvasVisible = true;

  // Pausa el render 3D cuando el canvas sale de pantalla (ahorra GPU en móvil)
  const observerCanvas = new IntersectionObserver(
    (entries) => {
      isCanvasVisible = entries[0].isIntersecting;
    },
    { threshold: 0 }
  );
  observerCanvas.observe(canvas);

  function animate() {
    requestAnimationFrame(animate);
    if (!isCanvasVisible) return; // ← corte temprano: no renderiza si no se ve

    const elapsedTime = clock.getElapsedTime();

    // Lerp del scroll para animación ultrasuave
    scrollProgress += (targetScrollProgress - scrollProgress) * 0.08;

    // Lerp del mouse para el giroscopio 3D
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    // Rotación de las partículas flotantes
    particleSystem.rotation.y = elapsedTime * 0.03;
    particleSystem.rotation.x = elapsedTime * 0.015;

    nodeSystem.rotation.y = elapsedTime * 0.05;
    linesMesh.rotation.y = elapsedTime * 0.05;

    // --- LÓGICA DE ESCENAS SEGÚN EL SCROLL ---
    // Escena 0: Hero (0.00 - 0.18)
    // Escena 1: Especificaciones & Cámara (0.18 - 0.42)
    // Escena 2: Inteligencia Artificial / Neural (0.42 - 0.65)
    // Escena 3: Catálogo & Confianza (0.65 - 1.00)

    if (scrollProgress < 0.20) {
      // HERO
      const p = scrollProgress / 0.20;
      
      phoneGroup.position.x = (1 - p) * 0 + (isMobile ? 0 : 0.2);
      phoneGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.12 - (p * 0.5);
      phoneGroup.position.z = 0;

      phoneGroup.rotation.x = 0.15 + Math.sin(elapsedTime * 0.8) * 0.05 + mouse.y;
      phoneGroup.rotation.y = -0.3 + (p * Math.PI * 1.1) + mouse.x;
      phoneGroup.rotation.z = Math.sin(elapsedTime * 0.5) * 0.03;

      nodeMat.opacity = 0;
      lineMat.opacity = 0;

    } else if (scrollProgress >= 0.20 && scrollProgress < 0.45) {
      // ESCENA 1: CÁMARAS Y ESPECIFICACIONES
      const p = (scrollProgress - 0.20) / 0.25;

      // El celular se posiciona mostrando la cámara trasera
      phoneGroup.position.x = isMobile ? 0 : (1.8 * (1 - p) + -1.6 * p);
      phoneGroup.position.y = -0.1 + Math.sin(elapsedTime * 1.2) * 0.08;
      phoneGroup.position.z = 0.5;

      phoneGroup.rotation.x = -0.1 + mouse.y * 0.5;
      phoneGroup.rotation.y = Math.PI + (p * 0.8) + mouse.x * 0.5;
      phoneGroup.rotation.z = -0.15;

      nodeMat.opacity = Math.max(0, (p - 0.7) * 3);
      lineMat.opacity = Math.max(0, (p - 0.7) * 2);

    } else if (scrollProgress >= 0.45 && scrollProgress < 0.68) {
      // ESCENA 2: INTELIGENCIA ARTIFICIAL (GALAXY AI / NEURAL MESH)
      const p = (scrollProgress - 0.45) / 0.23;

      phoneGroup.position.x = 0;
      phoneGroup.position.y = 0.1 + Math.sin(elapsedTime * 2.0) * 0.1;
      phoneGroup.position.z = 1.0;

      phoneGroup.rotation.x = 0.3 + Math.sin(elapsedTime * 1.5) * 0.1 + mouse.y;
      phoneGroup.rotation.y = Math.PI * 2 + (p * Math.PI) + mouse.x;
      phoneGroup.rotation.z = 0.25;

      // Activar red neuronal
      nodeMat.opacity = 0.85 + Math.sin(elapsedTime * 4.0) * 0.15;
      lineMat.opacity = 0.45 + Math.sin(elapsedTime * 3.0) * 0.15;

    } else {
      // ESCENA 3: TRANSICIÓN AL CATÁLOGO
      const p = (scrollProgress - 0.68) / 0.32;

      // Se retira suavemente hacia la parte superior derecha como marca de agua 3D
      phoneGroup.position.x = isMobile ? 0 : 2.5;
      phoneGroup.position.y = 1.8 - (p * 0.5);
      phoneGroup.position.z = -2.0;

      phoneGroup.rotation.x = 0.2 + mouse.y * 0.2;
      phoneGroup.rotation.y = elapsedTime * 0.2 + mouse.x * 0.2;
      phoneGroup.rotation.z = 0.1;

      nodeMat.opacity = Math.max(0, 0.5 - p * 2);
      lineMat.opacity = Math.max(0, 0.3 - p * 2);
    }

    renderer.render(scene, camera);
  }

  animate();

  // Resize Listener
  window.addEventListener("resize", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 768 ? 1.5 : 2));
  });
}

/**
 * Función de utilidad para crear una caja con esquinas redondeadas en Three.js
 */
function createRoundedBoxGeometry(width, height, depth, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const w = width;
  const h = height;
  const r = radius;

  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  const extrudeSettings = {
    depth: depth,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: radius * 0.4,
    bevelThickness: radius * 0.4
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.center();
  return geometry;
}

/**
 * Revelado progresivo de elementos al hacer scroll (Scroll Trigger nativo)
 */
function initScrollAnimations() {
  const revealElements = document.querySelectorAll(".scroll-reveal");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: "0px 0px -50px 0px"
  });

  revealElements.forEach((el) => observer.observe(el));
}

/**
 * Fallback en caso de no cargar Three.js
 */
function initFallbackEffects() {
  console.log("Iniciando efectos CSS simples de respaldo...");
  initScrollAnimations();
}
