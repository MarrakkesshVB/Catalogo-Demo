import * as THREE from "three";

/**
 * ==========================================================================
 * PARTÍCULAS ROJO CORAZÓN PARA EL PANEL ADMIN (js/admin-fx.js)
 * Versión liviana de la experiencia 3D: solo polvo estelar de la marca.
 * ==========================================================================
 */
document.addEventListener("DOMContentLoaded", () => {
  if (typeof THREE === "undefined" || !THREE) return;

  const canvas = document.getElementById("webgl-canvas");
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 7.5);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  // --- Polvo estelar rojo corazón ---
  const particleCount = 220;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // Textura de partícula con el rojo de la marca (#e63946)
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(230, 57, 70, 1)");
  g.addColorStop(0.5, "rgba(230, 57, 70, 0.4)");
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);

  const mat = new THREE.PointsMaterial({
    size: 0.14,
    map: tex,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // --- Deriva lenta y elegante ---
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    points.rotation.y = t * 0.03;
    points.rotation.x = t * 0.012;
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
});