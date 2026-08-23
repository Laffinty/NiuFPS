import * as THREE from '../vendor/three/three.module.js';
import {
  WORLD,
  SPAWN,
} from './config.js';
import {
  mulberry32,
  fbm,
  clamp,
  distance2D,
} from './utils.js';
import {
  createTree,
  createRock,
} from './models.js';

export class World {
  constructor(scene, seed = 20260824) {
    this.scene = scene;
    this.seed = seed;
    this.random = mulberry32(seed);
    this.colliders = [];
    this.water = null;
    this.start = new THREE.Vector3();
    this.goal = new THREE.Vector3();
  }

  init() {
    this.createLights();
    this.createGround();
    this.createWater();
    this.createObstacles();
    this.createGoalMarker();
    this.createSpawnPoints();
  }

  heightAt(x, z) {
    const riverDist = Math.abs(z);
    const riverHalf = WORLD.riverHalfWidth + WORLD.riverBank;
    const channel = riverDist < riverHalf
      ? 1 - (riverDist / riverHalf)
      : 0;
    const river = -2.05 * channel * channel * (3 - 2 * channel);

    const hills = fbm(x * 0.008 + 37.7, z * 0.008 + 11.3, 4, this.seed);
    const detail = fbm(x * 0.035 + 5.1, z * 0.035 + 8.7, 3, this.seed + 91);
    const mountain = fbm(x * 0.0035 + 0.4, z * 0.0035 + 0.8, 3, this.seed + 7) * WORLD.mountainScale;

    return river + hills * 2.1 + detail * 0.35 + mountain;
  }

  createLights() {
    this.scene.background = new THREE.Color(0x8eb7d6);
    this.scene.fog = new THREE.Fog(0xa4c7b0, 90, 380);

    const hemi = new THREE.HemisphereLight(0xbde4ff, 0x38503a, 1.15);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff1c6, 2.1);
    sun.position.set(70, 110, 45);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -230;
    sun.shadow.camera.right = 230;
    sun.shadow.camera.top = 230;
    sun.shadow.camera.bottom = -230;
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 320;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);
    this.sun = sun;
  }

  createGround() {
    const size = WORLD.half * 2;
    const segments = WORLD.groundSegments;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const y = this.heightAt(x, z);
      positions.setY(i, y);

      const riverDist = Math.abs(z);
      const slope = Math.abs(y - this.heightAt(x, z + 1.2));
      if (riverDist < WORLD.riverHalfWidth + 2.2) {
        color.set(y < -0.7 ? 0x9c7a45 : 0x6f9f6b);
      } else if (y > 3.4) {
        color.set(0x7d858b);
      } else if (slope > 1.2) {
        color.set(0x5d8061);
      } else {
        color.set(0x4f8f4a);
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.98,
      metalness: 0,
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.name = 'ground';
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.ground = ground;
  }

  createWater() {
    const size = WORLD.half * 2;
    const geometry = new THREE.PlaneGeometry(size, (WORLD.riverHalfWidth + 0.6) * 2, 1, 1);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2b9fd6,
      roughness: 0.18,
      metalness: 0.05,
      transparent: true,
      opacity: 0.72,
    });
    const water = new THREE.Mesh(geometry, material);
    water.position.y = WORLD.waterY;
    water.name = 'water';
    this.scene.add(water);
    this.water = water;
  }

  createObstacles() {
    const positions = [];
    const minSeparation = 5.2;
    const riverAvoid = WORLD.riverHalfWidth + WORLD.riverBank + 1.4;

    const tryAdd = (x, z, type) => {
      if (Math.abs(x) > WORLD.half - 5 || Math.abs(z) > WORLD.half - 5) return false;
      if (Math.abs(z) < riverAvoid) return false;
      if (positions.some((p) => distance2D({ x, z }, p) < minSeparation)) return false;
      positions.push({ x, z });
      if (type === 'tree') {
        const tree = createTree();
        tree.position.set(x, this.heightAt(x, z), z);
        const scale = 0.85 + this.random() * 0.6;
        tree.scale.setScalar(scale);
        tree.rotation.y = this.random() * Math.PI * 2;
        this.scene.add(tree);
        this.colliders.push({
          x,
          z,
          radius: 0.42 * scale,
          minY: this.heightAt(x, z) - 0.2,
          maxY: this.heightAt(x, z) + 2.6 * scale,
          type: 'tree',
          mesh: tree,
        });
      } else {
        const rock = createRock();
        rock.position.set(x, this.heightAt(x, z) + 0.05, z);
        const scale = 0.65 + this.random() * 1.1;
        rock.scale.setScalar(scale);
        rock.rotation.y = this.random() * Math.PI * 2;
        this.scene.add(rock);
        this.colliders.push({
          x,
          z,
          radius: 0.68 * scale,
          minY: this.heightAt(x, z) - 0.2,
          maxY: this.heightAt(x, z) + 1.35 * scale,
          type: 'rock',
          mesh: rock,
        });
      }
      return true;
    };

    let treePlaced = 0;
    let guard = 0;
    while (treePlaced < WORLD.treeCount && guard < 12000) {
      guard += 1;
      const x = (this.random() * 2 - 1) * (WORLD.half - 8);
      const z = (this.random() * 2 - 1) * (WORLD.half - 8);
      if (tryAdd(x, z, 'tree')) treePlaced += 1;
    }

    let rockPlaced = 0;
    guard = 0;
    while (rockPlaced < WORLD.rockCount && guard < 8000) {
      guard += 1;
      const x = (this.random() * 2 - 1) * (WORLD.half - 8);
      const z = (this.random() * 2 - 1) * (WORLD.half - 8);
      if (tryAdd(x, z, 'rock')) rockPlaced += 1;
    }
  }

  createGoalMarker() {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 4.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x2c3c2a, roughness: 0.7 }),
    );
    pole.position.y = 2.1;
    pole.castShadow = true;
    group.add(pole);

    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.85, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xe34d3c, roughness: 0.7, side: THREE.DoubleSide }),
    );
    flag.position.set(0.68, 3.45, 0);
    group.add(flag);

    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.5, 0.12, 24),
      new THREE.MeshStandardMaterial({ color: 0xe34d3c, emissive: 0x441008, roughness: 0.8, transparent: true, opacity: 0.45 }),
    );
    beacon.position.y = 0.08;
    beacon.name = 'goalBeacon';
    group.add(beacon);
    group.name = 'goal';
    group.visible = false;
    this.scene.add(group);
    this.goalMarker = group;
  }

  createSpawnPoints() {
    const half = WORLD.half;
    const margin = SPAWN.minEdge;
    const d = SPAWN.distance / 2;
    let best = null;

    for (let attempt = 0; attempt < 2000; attempt += 1) {
      const angle = this.random() * Math.PI * 2;
      const dx = Math.cos(angle) * d;
      const dz = Math.sin(angle) * d;
      const maxMidX = half - Math.abs(dx) - margin;
      const maxMidZ = half - Math.abs(dz) - margin;
      if (maxMidX <= 0 || maxMidZ <= 0) continue;

      const midX = (this.random() * 2 - 1) * maxMidX;
      const midZ = (this.random() * 2 - 1) * maxMidZ;
      const start = { x: midX - dx, z: midZ - dz };
      const goal = { x: midX + dx, z: midZ + dz };

      if (!this.isPositionClear(start, 5.5, false)) continue;
      if (!this.isPositionClear(goal, 5.5, false)) continue;
      best = { start, goal, angle };
      break;
    }

    if (!best) {
      const angle = Math.PI / 4;
      const dx = Math.cos(angle) * d;
      const dz = Math.sin(angle) * d;
      best = {
        start: { x: -dx, z: -dz },
        goal: { x: dx, z: dz },
        angle,
      };
    }

    this.start.set(best.start.x, this.heightAt(best.start.x, best.start.z), best.start.z);
    this.goal.set(best.goal.x, this.heightAt(best.goal.x, best.goal.z), best.goal.z);
    this.goalMarker.position.copy(this.goal);
    this.goalMarker.visible = true;
  }

  isPositionClear(pos, minObstacleDist, allowWater) {
    if (!allowWater && Math.abs(pos.z) < WORLD.riverHalfWidth + 2.0) return false;
    if (Math.abs(pos.x) > WORLD.half - 4 || Math.abs(pos.z) > WORLD.half - 4) return false;
    if (this.colliders.some((c) => distance2D(pos, c) < c.radius + minObstacleDist)) return false;
    return true;
  }

  isInWater(position) {
    return Math.abs(position.z) < WORLD.riverHalfWidth + 1.2;
  }

  isOutOfBounds(position, radius = 0) {
    const limit = WORLD.half - 2 - radius;
    return Math.abs(position.x) > limit || Math.abs(position.z) > limit;
  }

  clampToBounds(position, radius = 0) {
    const limit = WORLD.half - 2 - radius;
    position.x = clamp(position.x, -limit, limit);
    position.z = clamp(position.z, -limit, limit);
    return position;
  }

  resolveCircleCollision(position, radius) {
    for (const collider of this.colliders) {
      const dx = position.x - collider.x;
      const dz = position.z - collider.z;
      const min = collider.radius + radius;
      const distSq = dx * dx + dz * dz;
      if (distSq >= min * min) continue;
      const dist = Math.sqrt(distSq) || 0.0001;
      const push = (min - dist) / dist;
      position.x += dx * push;
      position.z += dz * push;
    }
    this.clampToBounds(position, radius);
    return position;
  }

  update(dt, time) {
    if (this.water) {
      this.water.material.opacity = 0.66 + Math.sin(time * 0.9) * 0.05;
      this.water.position.y = WORLD.waterY + Math.sin(time * 1.4) * 0.025;
    }
    if (this.goalMarker) {
      const beacon = this.goalMarker.getObjectByName('goalBeacon');
      if (beacon) beacon.rotation.y += dt * 0.6;
    }
  }
}
