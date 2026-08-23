import * as THREE from '../vendor/three/three.module.js';

function mat(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.9,
    metalness: options.metalness ?? 0.0,
    flatShading: options.flatShading ?? true,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  });
}

export function createCowModel() {
  const root = new THREE.Group();
  root.name = 'cow';

  const bodyMat = mat(0xe6a93a, { roughness: 0.85 });
  const bellyMat = mat(0xf4cf6e, { roughness: 0.9 });
  const hornMat = mat(0xf5ead0, { roughness: 0.55 });
  const darkMat = mat(0x2d2018, { roughness: 0.8 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.8, 0.5), bodyMat);
  body.position.y = 1.08;
  body.castShadow = true;
  root.add(body);

  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.34), bellyMat);
  belly.position.set(0, 0.82, 0.04);
  root.add(belly);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.42), bodyMat);
  head.position.set(0, 1.55, 0.18);
  head.castShadow = true;
  head.name = 'head';
  root.add(head);

  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.2), bellyMat);
  muzzle.position.set(0, 1.44, 0.43);
  root.add(muzzle);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), darkMat);
  nose.position.set(0, 1.45, 0.54);
  root.add(nose);

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), darkMat);
  leftEye.position.set(-0.12, 1.62, 0.36);
  root.add(leftEye);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.12;
  root.add(rightEye);

  const leftEar = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 8), bodyMat);
  leftEar.position.set(-0.25, 1.68, 0.12);
  leftEar.rotation.z = 0.35;
  root.add(leftEar);
  const rightEar = leftEar.clone();
  rightEar.position.x = 0.25;
  rightEar.rotation.z = -0.35;
  root.add(rightEar);

  const horns = [];
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.38, 8), hornMat);
    horn.position.set(side * 0.17, 1.75, 0.13);
    horn.rotation.z = side * -0.5;
    horn.castShadow = true;
    root.add(horn);
    horns.push(horn);
  }

  const armGeo = new THREE.BoxGeometry(0.16, 0.52, 0.18);
  const leftArm = new THREE.Mesh(armGeo, bodyMat);
  leftArm.position.set(-0.55, 1.28, 0.12);
  leftArm.castShadow = true;
  leftArm.name = 'leftArm';
  root.add(leftArm);
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.55;
  rightArm.name = 'rightArm';
  root.add(rightArm);

  const legGeo = new THREE.BoxGeometry(0.18, 0.52, 0.2);
  const legPositions = [
    [-0.28, 0.26, 0.14],
    [0.28, 0.26, 0.14],
    [-0.28, 0.26, -0.16],
    [0.28, 0.26, -0.16],
  ];
  const legs = [];
  for (const pos of legPositions) {
    const leg = new THREE.Mesh(legGeo, darkMat);
    leg.position.set(...pos);
    leg.castShadow = true;
    leg.name = 'leg';
    root.add(leg);
    legs.push(leg);
  }

  root.userData = { horns, leftArm, rightArm, legs, head };
  return root;
}

export function createAK47Model() {
  const group = new THREE.Group();
  const metal = mat(0x20262a, { roughness: 0.4, metalness: 0.65 });
  const wood = mat(0x7a4a22, { roughness: 0.65, metalness: 0.05 });
  const dark = mat(0x111214, { roughness: 0.5, metalness: 0.35 });

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.58), metal);
  receiver.position.set(0, 0, -0.12);
  receiver.castShadow = true;
  group.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.42, 10), metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.62);
  group.add(barrel);

  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.06, 0.06), dark);
  sight.position.set(0, 0.1, -0.42);
  group.add(sight);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.32), wood);
  stock.position.set(0, -0.025, 0.32);
  group.add(stock);

  const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.11), wood);
  magazine.position.set(0, -0.14, -0.04);
  magazine.rotation.x = 0.35;
  group.add(magazine);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.07), wood);
  grip.position.set(0, -0.12, 0.12);
  grip.rotation.x = -0.35;
  group.add(grip);

  group.name = 'ak47';
  return group;
}

export function createFirstPersonArms() {
  const group = new THREE.Group();
  const cow = mat(0xe6a93a, { roughness: 0.85 });
  const dark = mat(0x2d2018, { roughness: 0.8 });

  const gun = createAK47Model();
  gun.position.set(0.26, -0.22, -0.55);
  gun.rotation.y = -0.02;
  gun.scale.setScalar(0.78);
  group.add(gun);

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.18), cow);
  leftArm.position.set(-0.04, -0.31, -0.32);
  leftArm.rotation.z = 0.35;
  leftArm.rotation.x = -0.5;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.52, 0.19), cow);
  rightArm.position.set(0.23, -0.25, -0.28);
  rightArm.rotation.x = -0.45;
  group.add(rightArm);

  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), dark);
  leftHand.position.set(-0.04, -0.48, -0.48);
  group.add(leftHand);
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), dark);
  rightHand.position.set(0.25, -0.48, -0.47);
  group.add(rightHand);

  group.name = 'firstPersonArms';
  return group;
}

export function createWolfModel() {
  const group = new THREE.Group();
  const fur = mat(0x5c6066, { roughness: 0.9 });
  const light = mat(0xa9aeb5, { roughness: 0.9 });
  const dark = mat(0x202124, { roughness: 0.8 });
  const eyeMat = mat(0xffc42e, { roughness: 0.35 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.48, 1.05), fur);
  body.position.y = 0.55;
  body.castShadow = true;
  body.name = 'body';
  group.add(body);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.42), light);
  chest.position.set(0, 0.5, 0.44);
  group.add(chest);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.42), fur);
  head.position.set(0, 0.78, 0.68);
  head.castShadow = true;
  head.name = 'head';
  group.add(head);

  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 8), light);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0.72, 0.92);
  group.add(snout);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), dark);
  nose.position.set(0, 0.7, 0.98);
  group.add(nose);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
    eye.position.set(side * 0.11, 0.86, 0.82);
    group.add(eye);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 8), dark);
    ear.position.set(side * 0.13, 1.02, 0.62);
    ear.rotation.z = side * -0.18;
    group.add(ear);
  }

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, 0.38, 8), dark);
  tail.position.set(0, 0.76, -0.72);
  tail.rotation.x = 0.35;
  group.add(tail);

  const legs = [];
  const legGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.5, 8);
  const legPositions = [
    [-0.2, 0.28, 0.38],
    [0.2, 0.28, 0.38],
    [-0.2, 0.28, -0.4],
    [0.2, 0.28, -0.4],
  ];
  for (const pos of legPositions) {
    const leg = new THREE.Mesh(legGeo, dark);
    leg.position.set(...pos);
    leg.castShadow = true;
    leg.name = 'leg';
    group.add(leg);
    legs.push(leg);
  }

  group.userData = { legs, head };
  return group;
}

export function createSnakeModel(segmentCount = 9) {
  const group = new THREE.Group();
  const green = mat(0x1f7a43, { roughness: 0.55 });
  const light = mat(0x46a55e, { roughness: 0.6 });
  const dark = mat(0x10231a, { roughness: 0.7 });

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.38), green);
  head.position.y = 0.16;
  head.castShadow = true;
  head.name = 'head';
  group.add(head);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), dark);
    eye.position.set(side * 0.12, 0.24, 0.18);
    group.add(eye);
  }

  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.18), mat(0xff4b4b));
  tongue.position.set(0, 0.12, 0.32);
  group.add(tongue);

  const segments = [];
  for (let i = 0; i < segmentCount; i += 1) {
    const radius = 0.17 - i * 0.007;
    const segment = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), i % 2 ? light : green);
    segment.position.set(0, 0.14, -0.28 - i * 0.36);
    segment.castShadow = true;
    group.add(segment);
    segments.push(segment);
  }

  group.userData = { head, segments, tongue };
  return group;
}

export function createTree() {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 2.2, 8), mat(0x684a2c));
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  trunk.name = 'trunk';
  group.add(trunk);

  const canopyMat = mat(0x2c6e36, { roughness: 0.95 });
  const canopy1 = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.3, 8), canopyMat);
  canopy1.position.y = 2.7;
  canopy1.castShadow = true;
  canopy1.receiveShadow = true;
  group.add(canopy1);

  const canopy2 = new THREE.Mesh(new THREE.ConeGeometry(0.82, 1.7, 8), mat(0x3b8742, { roughness: 0.95 }));
  canopy2.position.y = 3.35;
  canopy2.castShadow = true;
  group.add(canopy2);

  group.name = 'tree';
  return group;
}

export function createRock() {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.8, 0),
    mat(0x7d858b, { roughness: 1, flatShading: true }),
  );
  rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  rock.position.y = 0.35;
  rock.castShadow = true;
  rock.receiveShadow = true;
  rock.name = 'rock';
  return rock;
}
