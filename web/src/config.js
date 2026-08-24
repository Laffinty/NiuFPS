export const GAME_TITLE = '森林突围：黄牛 FPS';

export const WORLD = {
  half: 215,
  riverHalfWidth: 6.5,
  riverBank: 5.5,
  waterY: -1.18,
  groundSegments: 144,
  treeCount: 150,
  rockCount: 64,
  mountainScale: 5.4,
};

export const SPAWN = {
  // 起点和集结点始终相差这个直线距离，保证每局公平。
  distance: 305,
  minEdge: 32,
  goalRadius: 6.5,
};

export const PLAYER = {
  height: 1.82,
  radius: 0.55,
  eyeHeight: 1.62,
  crouchHeight: 1.02,
  walkSpeed: 4.6,
  runSpeed: 7.3,
  crouchSpeed: 2.6,
  waterSpeedScale: 0.56,
  jumpSpeed: 8.6,
  gravity: -30,
  maxHealth: 100,
  mouseSensitivity: 0.0021,
};

export const WEAPONS = {
  ak47: {
    key: 'ak47',
    name: 'AK-47',
    slot: 1,
    magazine: 30,
    reserve: 120,
    fireInterval: 0.105,
    reloadTime: 2.2,
    damage: 22,
    headshotMultiplier: 2.1,
    baseSpread: 0.0032,
    movingSpread: 0.052,
    airborneSpread: 0.085,
    recoilPerShot: 0.0105,
    maxRecoilSpread: 0.11,
    recoilRecovery: 2.4,
  },
  headbutt: {
    key: 'headbutt',
    name: '牛角头槌',
    slot: 2,
    cooldown: 0.82,
    damage: 62,
    range: 2.55,
    arc: Math.PI * 0.58,
    lungeSpeed: 8.4,
  },
};

export const DIFFICULTY = {
  easy: {
    label: '简单',
    wolfScale: 0.55,
    wolfSpeedScale: 0.82,
    wolfDamageScale: 0.68,
    aggroScale: 0.78,
    playerDamageScale: 1.25,
  },
  normal: {
    label: '普通',
    wolfScale: 1.0,
    wolfSpeedScale: 1.0,
    wolfDamageScale: 1.0,
    aggroScale: 1.0,
    playerDamageScale: 1.0,
  },
  hard: {
    label: '困难',
    wolfScale: 1.5,
    wolfSpeedScale: 1.16,
    wolfDamageScale: 1.35,
    aggroScale: 1.22,
    playerDamageScale: 0.9,
  },
};

export const WOLF = {
  baseCount: 100,
  maxHealth: 70,
  speed: 4.3,
  chaseSpeed: 6.0,
  aggroRange: 34,
  attackRange: 1.75,
  attackCooldown: 1.25,
  damage: 12,
  radius: 0.62,
};

export const SNAKE = {
  maxHealth: 180,
  speed: 2.2,
  chaseSpeed: 5.4,
  aggroRange: 26,
  attackRange: 1.55,
  attackCooldown: 1.8,
  biteDamage: 9999,
  radius: 0.42,
  segmentCount: 9,
};

export const CAMERA = {
  thirdPersonDistance: 5.4,
  thirdPersonHeight: 1.9,
  minPitch: -0.8,
  maxPitch: 1.25,
};
export const TOUCH = {
  lookSensitivity: 0.0028,
  joystickRadius: 66,
  joystickDeadZone: 0.14,
  buttonMin: 48,
};
