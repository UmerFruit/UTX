import { useEffect, useRef } from 'react';

// We load Three.js r128 from CDN to exactly match the original HTML animation.
// The npm "three" package (0.182.x) changed lighting, color management, and
// material rendering so significantly that the scene looks completely different.

declare global {
  interface Window {
    __THREE_R128__: any;
  }
}

function loadThreeR128(): Promise<any> {
  if (window.__THREE_R128__) return Promise.resolve(window.__THREE_R128__);

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = () => {
      // Stash the r128 reference and delete the global so it doesn't leak
      window.__THREE_R128__ = (window as any).THREE;
      delete (window as any).THREE;
      resolve(window.__THREE_R128__);
    };
    script.onerror = () => reject(new Error('Failed to load Three.js r128'));
    document.head.appendChild(script);
  });
}

const DnaHelix = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let animationId: number | null = null;
    let cancelled = false;
    let renderer: any = null;

    loadThreeR128().then((THREE) => {
      if (cancelled || !container || !canvas) return;

      // ── Exact copy of the original HTML Three.js code ──

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        container.offsetWidth / container.offsetHeight,
        0.1,
        1000
      );
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
      });

      renderer.setSize(container.offsetWidth, container.offsetHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      camera.position.z = 15;

      // DNA Helix Parameters
      const helixRadius = 3;
      const helixHeight = 20;
      const turns = 4;
      const particlesPerTurn = 18;
      const totalParticles = turns * particlesPerTurn;

      // Materials
      const purpleMaterial = new THREE.MeshPhongMaterial({
        color: 0x8b5cf6,
        emissive: 0x8b5cf6,
        emissiveIntensity: 0.3,
        shininess: 100,
      });

      const blueMaterial = new THREE.MeshPhongMaterial({
        color: 0x3b82f6,
        emissive: 0x3b82f6,
        emissiveIntensity: 0.3,
        shininess: 100,
      });

      const connectorMaterial = new THREE.MeshPhongMaterial({
        color: 0x6366f1,
        transparent: true,
        opacity: 0.4,
      });

      // Create DNA Helix
      const dnaGroup = new THREE.Group();
      const strand1: any[] = [];
      const strand2: any[] = [];
      const connectors: any[] = [];
      const bases1: any[] = [];
      const bases2: any[] = [];

      // Pre-create materials for bases
      const baseMaterial1 = new THREE.MeshPhongMaterial({
        color: 0xff6b35,
        emissive: 0xff6b35,
        emissiveIntensity: 0.3,
      });
      const baseMaterial2 = new THREE.MeshPhongMaterial({
        color: 0x4ecdc4,
        emissive: 0x4ecdc4,
        emissiveIntensity: 0.3,
      });

      for (let i = 0; i < totalParticles; i++) {
        const angle = (i / particlesPerTurn) * Math.PI * 2;
        const y = (i / totalParticles) * helixHeight - helixHeight / 2;

        // Strand 1 particle
        const sphere1Geometry = new THREE.SphereGeometry(0.3, 16, 16);
        const sphere1 = new THREE.Mesh(sphere1Geometry, purpleMaterial);
        sphere1.position.x = Math.cos(angle) * helixRadius;
        sphere1.position.z = Math.sin(angle) * helixRadius;
        sphere1.position.y = y;
        dnaGroup.add(sphere1);
        strand1.push(sphere1);

        // Strand 2 particle (opposite side)
        const sphere2Geometry = new THREE.SphereGeometry(0.3, 16, 16);
        const sphere2 = new THREE.Mesh(sphere2Geometry, blueMaterial);
        sphere2.position.x = Math.cos(angle + Math.PI) * helixRadius;
        sphere2.position.z = Math.sin(angle + Math.PI) * helixRadius;
        sphere2.position.y = y;
        dnaGroup.add(sphere2);
        strand2.push(sphere2);

        // Connector between pairs (every 2nd particle)
        if (i % 2 === 0) {
          const distance = sphere1.position.distanceTo(sphere2.position);
          const connectorGeometry = new THREE.CylinderGeometry(
            0.08,
            0.08,
            distance,
            8
          );
          const connector = new THREE.Mesh(
            connectorGeometry,
            connectorMaterial
          );

          // Position connector at midpoint
          connector.position.x =
            (sphere1.position.x + sphere2.position.x) / 2;
          connector.position.y = y;
          connector.position.z =
            (sphere1.position.z + sphere2.position.z) / 2;

          // Rotate connector to connect the two spheres
          const direction = new THREE.Vector3().subVectors(
            sphere2.position,
            sphere1.position
          );
          connector.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
          );

          dnaGroup.add(connector);
          connectors.push(connector);

          // Add nucleotide bases
          const baseGeometry = new THREE.SphereGeometry(0.15, 8, 8);

          const base1 = new THREE.Mesh(baseGeometry, baseMaterial1);
          base1.position.x =
            sphere1.position.x + direction.x * 0.3;
          base1.position.y = y + 0.3;
          base1.position.z =
            sphere1.position.z + direction.z * 0.3;
          dnaGroup.add(base1);
          bases1.push({ mesh: base1, particleIndex: i });

          const base2 = new THREE.Mesh(baseGeometry, baseMaterial2);
          base2.position.x =
            sphere2.position.x - direction.x * 0.3;
          base2.position.y = y - 0.3;
          base2.position.z =
            sphere2.position.z - direction.z * 0.3;
          dnaGroup.add(base2);
          bases2.push({ mesh: base2, particleIndex: i });
        }
      }

      scene.add(dnaGroup);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const pointLight1 = new THREE.PointLight(0x8b5cf6, 1, 100);
      pointLight1.position.set(10, 10, 10);
      scene.add(pointLight1);

      const pointLight2 = new THREE.PointLight(0x3b82f6, 1, 100);
      pointLight2.position.set(-10, -10, 10);
      scene.add(pointLight2);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(0, 1, 1);
      scene.add(directionalLight);

      // Animation
      let time = 0;

      // Set fixed slant like "/" - the structure stays tilted but doesn't move
      dnaGroup.rotation.x = 0;
      dnaGroup.rotation.z = -Math.PI / 6;

      function animate() {
        animationId = requestAnimationFrame(animate);
        time += 0.015;

        // Animate each bead along its circular path
        strand1.forEach((sphere: any, i: number) => {
          const baseAngle = (i / particlesPerTurn) * Math.PI * 2;
          const animatedAngle = baseAngle + time;
          const y = (i / totalParticles) * helixHeight - helixHeight / 2;

          sphere.position.x = Math.cos(animatedAngle) * helixRadius;
          sphere.position.z = Math.sin(animatedAngle) * helixRadius;
          sphere.position.y = y;

          // Subtle pulse
          const scale = 1 + Math.sin(time * 3 + i * 0.2) * 0.1;
          sphere.scale.set(scale, scale, scale);
        });

        strand2.forEach((sphere: any, i: number) => {
          const baseAngle =
            (i / particlesPerTurn) * Math.PI * 2 + Math.PI;
          const animatedAngle = baseAngle + time;
          const y = (i / totalParticles) * helixHeight - helixHeight / 2;

          sphere.position.x = Math.cos(animatedAngle) * helixRadius;
          sphere.position.z = Math.sin(animatedAngle) * helixRadius;
          sphere.position.y = y;

          // Subtle pulse
          const scale =
            1 + Math.sin(time * 3 + i * 0.2 + Math.PI) * 0.1;
          sphere.scale.set(scale, scale, scale);
        });

        // Update connectors and bases to follow the beads
        connectors.forEach((connector: any, idx: number) => {
          const i = idx * 2;
          if (strand1[i] && strand2[i]) {
            const sphere1 = strand1[i];
            const sphere2 = strand2[i];
            const y =
              (i / totalParticles) * helixHeight - helixHeight / 2;

            // Position at midpoint
            connector.position.x =
              (sphere1.position.x + sphere2.position.x) / 2;
            connector.position.y = y;
            connector.position.z =
              (sphere1.position.z + sphere2.position.z) / 2;

            // Rotate to connect the two spheres
            const direction = new THREE.Vector3().subVectors(
              sphere2.position,
              sphere1.position
            );
            const normalizedDir = direction.clone().normalize();
            connector.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              normalizedDir
            );

            // Update bases positions
            if (bases1[idx] && bases2[idx]) {
              bases1[idx].mesh.position.x =
                sphere1.position.x + normalizedDir.x * 0.8;
              bases1[idx].mesh.position.y = y;
              bases1[idx].mesh.position.z =
                sphere1.position.z + normalizedDir.z * 0.8;

              bases2[idx].mesh.position.x =
                sphere2.position.x - normalizedDir.x * 0.8;
              bases2[idx].mesh.position.y = y;
              bases2[idx].mesh.position.z =
                sphere2.position.z - normalizedDir.z * 0.8;
            }
          }
        });

        renderer.render(scene, camera);
      }

      animate();

      // Handle window resize
      const handleResize = () => {
        if (!container) return;
        const width = container.offsetWidth;
        const height = container.offsetHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };

      window.addEventListener('resize', handleResize);

      // Store cleanup for the outer effect
      const prevCleanup = cleanupFn;
      cleanupFn = () => {
        prevCleanup?.();
        window.removeEventListener('resize', handleResize);
      };
    });

    let cleanupFn: (() => void) | null = null;

    // Cleanup
    return () => {
      cancelled = true;
      if (animationId !== null) cancelAnimationFrame(animationId);
      cleanupFn?.();
      if (renderer) {
        renderer.dispose();
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[600px]">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

export default DnaHelix;
