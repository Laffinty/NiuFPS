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

export function createCowModel(options = {}) {
  // pose: 'combat'（默认，游戏内造型）/ 'hero'（主菜单立绘）
  const pose = options.pose || 'combat';
  const withGun = pose === 'hero';
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
  // Hero pose: 头微抬、略微侧倾，呈现「自信摆 pose」
  if (pose === 'hero') {
    head.rotation.x = -0.18;
    head.rotation.y = 0.08;
    head.position.y = 1.6;
  }
  root.add(head);

  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.2), bellyMat);
  muzzle.position.set(0, 1.44, 0.43);
  if (pose === 'hero') {
    muzzle.position.set(0, 1.49, 0.46);
  }
  root.add(muzzle);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), darkMat);
  nose.position.set(0, 1.45, 0.54);
  if (pose === 'hero') nose.position.set(0, 1.50, 0.58);
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
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.55;
  rightArm.name = 'rightArm';

  if (pose === 'hero') {
    // 双手胸前交叠握 AK：双臂前伸内收，托住胸前位置
    leftArm.position.set(-0.18, 1.42, 0.42);
    leftArm.rotation.set(-1.05, 0.0, 0.45);
    rightArm.position.set(0.18, 1.36, 0.42);
    rightArm.rotation.set(-1.05, 0.0, -0.45);
  }
  root.add(leftArm);
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
    if (pose === 'hero') {
      // 微外八字 + 双腿间距略宽，立绘更稳
      leg.position.x *= 1.12;
    }
    root.add(leg);
    legs.push(leg);
  }

  let gun = null;
  if (withGun) {
    // 胸前斜抱 AK-47 的简化版本：直接复用 createAK47Model，按 hero 比例缩放、旋转到位
    gun = createAK47Model();
    gun.name = 'heroGun';
    gun.scale.setScalar(0.92);
    gun.position.set(0, 1.32, 0.58);
    gun.rotation.set(0, -0.32, 0.18);
    root.add(gun);
  }

  root.userData = { horns, leftArm, rightArm, legs, head, gun, pose };
  return root;
}

export function createAK47Model() {
  // AK-47 第一人称模型。坐标轴：枪管指向 -Z，准星在 +Y，右侧为 +X。
  // 整枪以握把中心为原点，便于后续套用 viewmodel 偏移。
  const root = new THREE.Group();
  root.name = 'ak47';

  const blackened = mat(0x14181d, { roughness: 0.35, metalness: 0.7 });
  const darkSteel = mat(0x26292f, { roughness: 0.45, metalness: 0.55 });
  const brightSteel = mat(0x3a3e44, { roughness: 0.4, metalness: 0.6 });
  const wood = mat(0x6c3d1c, { roughness: 0.7, metalness: 0.05 });
  const woodLight = mat(0x8a4f25, { roughness: 0.7, metalness: 0.05 });
  const bakelite = mat(0x1c1610, { roughness: 0.6, metalness: 0.05 });

  // === 机匣本体（receiver） ===
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.058, 0.34), darkSteel);
  receiver.position.set(0, 0.045, 0.18);
  root.add(receiver);

  // 机匣顶部导轨 + 防尘盖（dust cover），略微凸出。
  const receiverCover = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.014, 0.32), blackened);
  receiverCover.position.set(0, 0.082, 0.18);
  root.add(receiverCover);

  // 防尘盖上的横向加强筋（视觉细节）。
  for (let i = 0; i < 5; i += 1) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.003, 0.005), darkSteel);
    rib.position.set(0, 0.090, 0.05 + i * 0.06);
    root.add(rib);
  }

  // === 准星 / 照门 ===
  // 后照门（receiver 后段顶部）
  const rearSightBase = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.012, 0.03), blackened);
  rearSightBase.position.set(0, 0.095, 0.30);
  root.add(rearSightBase);
  const rearSightLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.022, 0.006), blackened);
  rearSightLeaf.position.set(0, 0.108, 0.30);
  root.add(rearSightLeaf);

  // 前准星（gas block 顶部）
  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.018, 0.012), blackened);
  frontSight.position.set(0, 0.107, -0.18);
  root.add(frontSight);

  // === 枪管 + 导气箍 ===
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.48, 12), darkSteel);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.055, -0.30);
  root.add(barrel);

  const gasBlock = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.034, 0.04), blackened);
  gasBlock.position.set(0, 0.075, -0.18);
  root.add(gasBlock);

  // 导气管
  const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.20, 10), brightSteel);
  gasTube.rotation.x = Math.PI / 2;
  gasTube.position.set(0, 0.092, -0.06);
  root.add(gasTube);

  // === 枪口制退器（斜切口补偿器） ===
  const muzzleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 12), blackened);
  muzzleBase.rotation.x = Math.PI / 2;
  muzzleBase.position.set(0, 0.055, -0.555);
  root.add(muzzleBase);

  const muzzleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.012, 12), blackened);
  muzzleTip.rotation.x = Math.PI / 2;
  muzzleTip.position.set(0, 0.055, -0.582);
  root.add(muzzleTip);

  // 枪口参考点（用于 muzzle flash / 弹道起点）
  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.name = 'muzzlePoint';
  muzzlePoint.position.set(0, 0.055, -0.6);
  root.add(muzzlePoint);

  // === 木质护木（handguard） ===
  // 上护木（带通气孔）
  const handguardTop = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.026, 0.18), wood);
  handguardTop.position.set(0, 0.073, -0.06);
  root.add(handguardTop);

  // 下护木（与上护木之间留缝隙）
  const handguardBottom = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.026, 0.18), woodLight);
  handguardBottom.position.set(0, 0.025, -0.06);
  root.add(handguardBottom);

  // 通气孔装饰（小长条凹槽）
  for (let i = 0; i < 3; i += 1) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.047, 0.006, 0.008), bakelite);
    slot.position.set(0, 0.052, -0.02 - i * 0.05);
    root.add(slot);
  }

  // === 清洁杆（枪管下方细管） ===
  const cleaningRod = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.30, 6), brightSteel);
  cleaningRod.rotation.x = Math.PI / 2;
  cleaningRod.position.set(0, 0.034, -0.10);
  root.add(cleaningRod);

  // === 弹匣（magazine，弯曲造型） ===
  const magazine = new THREE.Group();
  magazine.name = 'magazine';
  // 用 9 段薄板逐段向前偏移，模拟 7.62x39 弹匣的香蕉弯曲。
  const magSegments = 9;
  const segHeight = 0.022;
  for (let i = 0; i < magSegments; i += 1) {
    const t = i / (magSegments - 1);
    const width = 0.052 - t * 0.006;
    const depth = 0.034;
    const zOffset = -t * 0.075; // 越往下越靠前（-Z 方向）
    const yOffset = -i * segHeight;
    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(width, segHeight, depth),
      i % 2 === 0 ? bakelite : wood,
    );
    seg.position.set(0, yOffset, zOffset);
    magazine.add(seg);
  }
  // 弹匣底板
  const magBasePlate = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.008, 0.04), blackened);
  magBasePlate.position.set(0, -magSegments * segHeight + 0.004, -0.075);
  magazine.add(magBasePlate);
  // 弹匣卡笋
  const magLatch = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.008), brightSteel);
  magLatch.position.set(0, 0.012, 0.012);
  magazine.add(magLatch);
  // 把顶部对齐到机匣底部（机匣底面 y≈0.016），让弹匣看上去是从机匣里伸出来。
  magazine.position.set(0, 0.024, 0.06);
  root.add(magazine);

  // === 扳机 + 扳机护圈 ===
  const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.06), darkSteel);
  triggerGuard.position.set(0, 0.012, 0.10);
  root.add(triggerGuard);

  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.022, 0.005), brightSteel);
  trigger.position.set(0, 0.024, 0.085);
  trigger.rotation.x = 0.18;
  root.add(trigger);

  // === 握把（pistol grip） ===
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.10, 0.052), bakelite);
  grip.position.set(0, -0.038, 0.10);
  grip.rotation.x = 0.22;
  root.add(grip);

  // 握把侧面防滑纹
  for (let i = 0; i < 4; i += 1) {
    const check = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.003, 0.005), mat(0x080604, { roughness: 0.95 }));
    check.position.set(0, -0.018 - i * 0.018, 0.087);
    check.rotation.x = 0.22;
    root.add(check);
  }

  // === 拉机柄（charging handle）+ 栓体 ===
  const chargingHandle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.045), brightSteel);
  chargingHandle.position.set(0.04, 0.082, 0.10);
  chargingHandle.rotation.x = Math.PI / 2;
  root.add(chargingHandle);

  // 拉机柄固定点（用于拉动动画）
  const chargingHandleAnchor = new THREE.Object3D();
  chargingHandleAnchor.name = 'chargingHandle';
  chargingHandleAnchor.position.set(0.04, 0.082, 0.10);
  chargingHandleAnchor.add(chargingHandle);
  root.add(chargingHandleAnchor);

  // === 枪托（stock） ===
  const stockUpper = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.034, 0.20), wood);
  stockUpper.position.set(0, 0.045, 0.46);
  root.add(stockUpper);

  const stockLower = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.022, 0.20), woodLight);
  stockLower.position.set(0, 0.020, 0.46);
  root.add(stockLower);

  // 枪托尾板
  const buttPlate = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.072, 0.012), bakelite);
  buttPlate.position.set(0, 0.030, 0.565);
  root.add(buttPlate);

  // 枪托尾板上的小细节（凸起的卡扣）
  const buttHook = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.010, 0.008), blackened);
  buttHook.position.set(0, 0.002, 0.572);
  root.add(buttHook);

  root.userData = { magazine, chargingHandleAnchor, muzzlePoint };
  return root;
}

export function createFirstPersonArms() {
  // 第一人称武器组：arms 容器内有一个 gunHolder 子组，
  // 后续对 gunHolder 应用 sway/bob/后坐力/换弹动画；arms 自身只跟随相机视线。
  const group = new THREE.Group();
  group.name = 'firstPersonArms';

  const fur = mat(0xe6a93a, { roughness: 0.85 });
  const furDark = mat(0xb98833, { roughness: 0.9 });
  const hoof = mat(0x2d2018, { roughness: 0.55 });
  const sleeve = mat(0x5d3618, { roughness: 0.95 });

  // === gunHolder：CS 风格武器挂点（屏幕右下、枪管伸向 -Z）===
  const gunHolder = new THREE.Group();
  gunHolder.name = 'gunHolder';
  gunHolder.position.set(0.12, -0.16, -0.50);
  gunHolder.rotation.set(0.0, 0.03, -0.005);
  gunHolder.scale.setScalar(0.78);
  group.add(gunHolder);

  // 武器本体（枪管指向 -Z，grip 在原点附近）
  const gun = createAK47Model();
  gunHolder.add(gun);

  // === 左手：包在 handguard 前端左侧 ===
  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.08), hoof);
  leftHand.position.set(-0.045, 0.060, -0.13);
  leftHand.rotation.set(0, -0.35, 0);
  gunHolder.add(leftHand);

  // 4 根手指扣在护木下方
  for (let i = 0; i < 3; i += 1) {
    const finger = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.028, 0.012), hoof);
    finger.position.set(-0.012 - i * 0.014, 0.025, -0.16 + i * 0.018);
    gunHolder.add(finger);
  }

  // 左前臂：从手向屏外（+X, -Y 方向）延伸
  const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.36, 10), fur);
  // 圆柱默认沿 Y，先绕 Z 旋转 90° 让它沿 X，再绕 Y 微调让其倾斜向下。
  leftForearm.rotation.set(0, 0.18, Math.PI / 2);
  leftForearm.position.set(0.22, 0.04, -0.20);
  gunHolder.add(leftForearm);

  const leftSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.06, 10), sleeve);
  leftSleeve.rotation.set(0, 0.18, Math.PI / 2);
  leftSleeve.position.set(0.40, 0.04, -0.20);
  gunHolder.add(leftSleeve);

  // === 右手：包在 pistol grip 上，扳机手指伸向扳机 ===
  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.065), hoof);
  rightHand.position.set(0.025, -0.075, 0.115);
  rightHand.rotation.set(0.32, 0, 0);
  gunHolder.add(rightHand);

  // 3 根手指扣在握把前方
  for (let i = 0; i < 3; i += 1) {
    const finger = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.024, 0.012), hoof);
    finger.position.set(0.025, -0.075 + i * 0.014, 0.130 + i * 0.010);
    finger.rotation.set(0.32, 0, 0);
    gunHolder.add(finger);
  }

  // 扳机手指（更细长，朝扳机）
  const triggerFinger = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.04), hoof);
  triggerFinger.position.set(0.0, -0.022, 0.085);
  triggerFinger.rotation.set(0.5, 0, 0);
  gunHolder.add(triggerFinger);

  // 右前臂：从手向屏外（+X, -Y）延伸
  const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.34, 10), furDark);
  rightForearm.rotation.set(-0.25, 0.30, Math.PI / 2 + 0.20);
  rightForearm.position.set(0.22, -0.16, 0.20);
  gunHolder.add(rightForearm);

  const rightSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.06, 10), sleeve);
  rightSleeve.rotation.set(-0.25, 0.30, Math.PI / 2 + 0.20);
  rightSleeve.position.set(0.40, -0.16, 0.20);
  gunHolder.add(rightSleeve);

  group.userData = {
    gun,
    gunHolder,
    leftHand,
    rightHand,
    magazine: gun.userData.magazine,
    chargingHandle: gun.userData.chargingHandleAnchor,
    muzzlePoint: gun.userData.muzzlePoint,
  };
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
