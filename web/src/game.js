import * as THREE from '../vendor/three/three.module.js';
import {
  WORLD,
  SPAWN,
  PLAYER,
  WEAPONS,
  DIFFICULTY,
  WOLF,
  SNAKE,
  CAMERA,
} from './config.js';
import {
  clamp,
  distance2D,
  raycastCylinder,
  lerp,
  smooth,
} from './utils.js';
import { InputManager } from './input.js';
import { OrientationGate } from './orientation-gate.js';
import { AudioManager } from './audio.js';
import { World } from './world.js';
import { Player, Wolf, Snake } from './entities.js';

export class Game {
  constructor() {
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.world = null;
    this.input = null;
    this.audio = null;
    this.player = null;
    this.wolves = [];
    this.snake = null;
    this.state = 'idle';
    this.settings = null;
    this.timer = new THREE.Timer();
    this.elapsed = 0;
    this.kills = 0;
    this.totalSpawnedEnemies = 0;
    this.tracers = [];
    this.particles = [];
    this.muzzleFlashes = [];
    this.goalFlash = 0;
    this.ui = {};
  }

  init() {
    this.cacheUi();
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.id = 'game-canvas';
    this.renderer.domElement.classList.add('game-canvas');
    document.getElementById('game-root').appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      76,
      window.innerWidth / window.innerHeight,
      0.05,
      720,
    );
    this.camera.rotation.order = 'YXZ';

    this.input = new InputManager();
    this.input.attach();

    this.gate = new OrientationGate((blocked) => this.onGateChange(blocked));
    this.gate.attach();
    this.audio = new AudioManager();

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape') this.togglePause();
    });

    this.bindUiEvents();
    this.onResize();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  cacheUi() {
    this.ui.startScreen = document.getElementById('start-screen');
    this.ui.startButton = document.getElementById('start-button');
    this.ui.difficulty = document.getElementById('difficulty');
    this.ui.perspective = document.getElementById('perspective');
    this.ui.wolfCount = document.getElementById('wolf-count');
    this.ui.hud = document.getElementById('hud');
    this.ui.healthFill = document.getElementById('health-fill');
    this.ui.healthText = document.getElementById('health-text');
    this.ui.ammo = document.getElementById('ammo');
    this.ui.weapon = document.getElementById('weapon');
    this.ui.distance = document.getElementById('distance');
    this.ui.enemies = document.getElementById('enemies');
    this.ui.timer = document.getElementById('timer');
    this.ui.crosshair = document.getElementById('crosshair');
    this.ui.damage = document.getElementById('damage-vignette');
    this.ui.minimap = document.getElementById('minimap');
    this.ui.pauseScreen = document.getElementById('pause-screen');
    this.ui.endScreen = document.getElementById('end-screen');
    this.ui.endTitle = document.getElementById('end-title');
    this.ui.endStats = document.getElementById('end-stats');
    this.ui.restartButton = document.getElementById('restart-button');
    this.ui.resumeButton = document.getElementById('resume-button');
    this.ui.pauseButton = document.getElementById('btn-pause');
    this.ui.message = document.getElementById('game-message');
  }

  bindUiEvents() {
    this.ui.startButton.addEventListener('click', () => {
      this.audio.init();
      this.startFromMenu();
    });
    this.ui.difficulty.addEventListener('change', () => this.updateWolfPreview());
    this.ui.restartButton.addEventListener('click', () => {
      this.audio.init();
      this.startFromMenu();
    });
    this.ui.resumeButton.addEventListener('click', () => {
      this.resume();
    });
    this.ui.pauseButton.addEventListener('click', () => {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
    });
    this.updateWolfPreview();
  }

  updateWolfPreview() {
    const diff = DIFFICULTY[this.ui.difficulty.value] || DIFFICULTY.normal;
    const count = Math.round(WOLF.baseCount * diff.wolfScale);
    this.ui.wolfCount.textContent = `${count} 只狼`;
  }

  startFromMenu() {
    const difficulty = DIFFICULTY[this.ui.difficulty.value] || DIFFICULTY.normal;
    this.settings = {
      difficultyKey: this.ui.difficulty.value,
      difficulty,
      viewMode: this.ui.perspective.value === 'third' ? 'third' : 'first',
      seed: Math.floor(Math.random() * 0x7fffffff),
      startTime: 0,
    };
    this.startGame(this.settings);
  }

  startGame(settings) {
    this.clearGame();
    this.state = 'playing';
    this.elapsed = 0;
    this.kills = 0;
    this.totalSpawnedEnemies = 0;
    this.settings = settings;

    this.world = new World(this.scene, settings.seed);
    this.world.init();
    this.player = new Player(this.scene, this.world, this.input);
    this.player.setViewMode(settings.viewMode);

    const goalDir = new THREE.Vector3(
      this.world.goal.x - this.world.start.x,
      0,
      this.world.goal.z - this.world.start.z,
    ).normalize();
    const startYaw = Math.atan2(-goalDir.x, -goalDir.z);
    this.player.spawn(this.world.start, startYaw);

    this.spawnEnemies(settings.difficulty);
    this.totalSpawnedEnemies = this.wolves.length + (this.snake ? 1 : 0);

    this.ui.startScreen.classList.add('hidden');
    this.ui.hud.classList.remove('hidden');
    this.ui.pauseScreen.classList.add('hidden');
    this.ui.endScreen.classList.add('hidden');
    this.ui.message.textContent = '穿过森林，抵达红色集结旗。蛇咬必死！';
    setTimeout(() => { this.ui.message.textContent = ''; }, 5000);

    if (!this.input.isTouch) this.input.requestPointerLock();
    this.gate?.evaluate(true);
  }

  clearGame() {
    this.wolves.forEach((wolf) => wolf.dispose());
    this.snake?.dispose();
    this.wolves = [];
    this.snake = null;
    this.tracers.forEach((tracer) => this.scene.remove(tracer.line));
    this.tracers = [];
    this.particles.forEach((particle) => this.scene.remove(particle.mesh));
    this.particles = [];
    this.muzzleFlashes.forEach((flash) => this.scene.remove(flash.sprite));
    this.muzzleFlashes = [];

    if (this.world) {
      while (this.scene.children.length) this.scene.remove(this.scene.children[0]);
      this.world = null;
    }
    if (this.player) {
      this.player.scene.remove(this.player.object);
      this.player.scene.remove(this.player.arms);
      this.player = null;
    }
  }

  spawnEnemies(difficulty) {
    const wolfCount = Math.round(WOLF.baseCount * difficulty.wolfScale);
    const random = this.world.random;
    const occupied = [];
    const minEnemySeparation = 3.8;

    const pickPosition = (minPlayerDist) => {
      for (let i = 0; i < 120; i += 1) {
        const x = (random() * 2 - 1) * (WORLD.half - 16);
        const z = (random() * 2 - 1) * (WORLD.half - 16);
        const pos = { x, z };
        if (!this.world.isPositionClear(pos, 4.2, false)) continue;
        if (distance2D(pos, this.world.start) < minPlayerDist) continue;
        if (distance2D(pos, this.world.goal) < 8) continue;
        if (occupied.some((p) => distance2D(pos, p) < minEnemySeparation)) continue;
        occupied.push(pos);
        return pos;
      }
      return null;
    };

    for (let i = 0; i < wolfCount; i += 1) {
      const pos = pickPosition(18);
      if (!pos) break;
      const config = {
        maxHealth: WOLF.maxHealth,
        speed: WOLF.speed * difficulty.wolfSpeedScale,
        chaseSpeed: WOLF.chaseSpeed * difficulty.wolfSpeedScale,
        aggroRange: WOLF.aggroRange * difficulty.aggroScale,
        attackRange: WOLF.attackRange,
        attackCooldown: WOLF.attackCooldown,
        damage: WOLF.damage * difficulty.wolfDamageScale,
        radius: WOLF.radius,
      };
      const wolf = new Wolf(this.scene, this.world, this.player, config, i, random);
      wolf.position.set(pos.x, this.world.heightAt(pos.x, pos.z), pos.z);
      wolf.chooseWaypoint();
      this.wolves.push(wolf);
    }

    const snakePos = pickPosition(26) || { x: 0, z: 14 };
    const snakeConfig = {
      maxHealth: SNAKE.maxHealth,
      speed: SNAKE.speed * difficulty.wolfSpeedScale,
      chaseSpeed: SNAKE.chaseSpeed * difficulty.wolfSpeedScale,
      aggroRange: SNAKE.aggroRange * difficulty.aggroScale,
      attackRange: SNAKE.attackRange,
      attackCooldown: SNAKE.attackCooldown,
      biteDamage: SNAKE.biteDamage,
      radius: SNAKE.radius,
      segmentCount: SNAKE.segmentCount,
    };
    this.snake = new Snake(this.scene, this.world, this.player, snakeConfig, random);
    this.snake.position.set(snakePos.x, this.world.heightAt(snakePos.x, snakePos.z), snakePos.z);
    this.snake.chooseWaypoint();
  }

  tick() {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.05);
    if (this.state === 'playing') {
      this.elapsed += dt;
      this.update(dt, this.elapsed);
    } else if (this.state === 'idle' && this.world) {
      this.world.update(dt, this.elapsed);
    }
    this.renderer.render(this.scene, this.camera);
  }

  update(dt, time) {
    this.handleInput();
    this.player.update(dt, time);
    this.updateCamera(dt, time);
    this.updateCombat(dt);
    this.updateEnemies(dt, time);
    this.updateEffects(dt);
    this.world.update(dt, time);
    this.checkEndConditions();
    this.updateHud(time);
  }

  handleInput() {
    const requested = this.input.consumeWeaponRequest();
    if (requested) this.player.switchWeapon(requested);

    if (this.input.consumeView()) {
      this.player.setViewMode(this.player.viewMode === 'first' ? 'third' : 'first');
    }

    if (this.input.consumeReload()) {
      if (this.player.startReload()) this.audio.reload();
    }
  }

  updateCamera(dt, time) {
    const eye = this.player.getEyePosition();
    if (this.player.viewMode === 'first') {
      this.camera.position.copy(eye);
      this.camera.rotation.order = 'YXZ';
      const camYaw = this.player.yaw + this.player.recoilYaw;
      const camPitch = this.player.pitch + this.player.recoilPitch;
      this.camera.rotation.y = camYaw;
      this.camera.rotation.x = camPitch;
      this.camera.rotation.z = 0;

      // 第一人称武器：位置贴在眼睛上，旋转对相机做轻微滞后，让枪"沉一些"。
      this.player.arms.position.copy(eye);
      this.player.arms.visible = this.player.weapon === 'ak47';
      this.player.arms.rotation.order = 'YXZ';
      const armLag = Math.min(1, dt * 22);
      this.player.arms.rotation.y = lerp(this.player.arms.rotation.y, camYaw, armLag);
      this.player.arms.rotation.x = lerp(this.player.arms.rotation.x, camPitch, armLag);
      this.player.arms.rotation.z = 0;

      // 在 arms 内部的 gunHolder 上叠加 sway / bob / 后坐力 / 换弹。
      this.applyWeaponAnimation(dt, time);
    } else {
      const forward = this.player.forward;
      const behind = forward.clone().multiplyScalar(-1);
      const desired = this.player.position.clone()
        .addScaledVector(behind, CAMERA.thirdPersonDistance);
      desired.y = this.player.position.y + CAMERA.thirdPersonHeight;
      this.camera.position.lerp(desired, Math.min(1, dt * 9));
      const lookTarget = this.player.position.clone();
      lookTarget.y += 1.25;
      this.camera.lookAt(lookTarget);
      this.player.arms.visible = false;
    }
    this.camera.updateMatrixWorld();
  }

  applyWeaponAnimation(dt, time) {
    const player = this.player;
    const gunHolder = player.gunHolder;
    if (!gunHolder || !player.weaponRestPos) return;

    // === 1. 重置到静止位姿 ===
    gunHolder.position.copy(player.weaponRestPos);
    gunHolder.rotation.copy(player.weaponRestRot);
    player.gunMagazine.position.copy(player.magazineRestPos);
    player.gunChargingHandle.position.copy(player.chargingHandleRestPos);
    player.gunMagazine.rotation.set(0, 0, 0);
    player.gunChargingHandle.rotation.set(0, 0, 0);

    // === 2. Idle sway（呼吸式微动） ===
    player.swayTime += dt;
    const swayX = Math.sin(player.swayTime * 0.85) * 0.0035;
    const swayY = Math.sin(player.swayTime * 1.05 + 1.3) * 0.0028;
    const swayRoll = Math.sin(player.swayTime * 0.7) * 0.0035;
    gunHolder.position.x += swayX;
    gunHolder.position.y += swayY;
    gunHolder.rotation.z += swayRoll;

    // === 3. 走路 / 跑步 bob ===
    if (player.moving && player.onGround) {
      const bobFreq = player.crouching ? 6.5 : (player.input.isWalking?.() ? 7.5 : 10.5);
      player.bobTime += dt * bobFreq;
      const phase = player.bobTime * 2 * Math.PI;
      const amplitudeY = player.crouching ? 0.006 : (player.input.isWalking?.() ? 0.008 : 0.015);
      const amplitudeX = player.crouching ? 0.003 : (player.input.isWalking?.() ? 0.004 : 0.007);
      gunHolder.position.y += Math.sin(phase) * amplitudeY;
      gunHolder.position.x += Math.cos(phase) * amplitudeX;
      // 侧倾
      gunHolder.rotation.z += Math.sin(phase) * 0.012;
    }

    // === 4. 后坐力（来自开火 impulse，每帧弹簧回弹） ===
    gunHolder.rotation.x += player.weaponKickPitch;
    gunHolder.rotation.y += player.weaponKickYaw;
    gunHolder.position.z += player.weaponKickZ;

    // === 5. 换弹动画（按 reloadProgress 分阶段） ===
    if (player.reloading) {
      const p = player.reloadProgress();
      // 换弹中 sway/bob 让位，让位姿过渡更稳定。
      const t = clamp(p, 0, 1);
      this.applyReloadAnimation(t);
    }
  }

  applyReloadAnimation(progress) {
    const player = this.player;
    const gunHolder = player.gunHolder;
    const magazine = player.gunMagazine;
    const chargingHandle = player.gunChargingHandle;

    // 0.00 - 0.18：武器向右下方倾斜（抬枪托，露出弹匣）
    // 0.18 - 0.32：弹匣从枪上掉落
    // 0.32 - 0.55：新弹匣插入
    // 0.55 - 0.70：拉机柄向后拉（同时枪开始回正）
    // 0.70 - 1.00：武器完全回到待击位

    const phaseTilt = 0.18;
    const phaseDrop = 0.32;
    const phaseInsert = 0.55;
    const phaseCharge = 0.70;

    // 倾斜角峰值（弧度）：抬枪托 + 向右翻转
    const tiltRollMax = 0.55;
    const tiltPitchMax = 0.32;
    const tiltDropY = -0.07;
    const tiltDropZ = 0.05;

    if (progress < phaseTilt) {
      const t = smooth(progress / phaseTilt);
      gunHolder.rotation.z = t * tiltRollMax;
      gunHolder.rotation.x = t * tiltPitchMax;
      gunHolder.position.y += t * tiltDropY;
      gunHolder.position.z += t * tiltDropZ;
    } else if (progress < phaseDrop) {
      const t = smooth((progress - phaseTilt) / (phaseDrop - phaseTilt));
      gunHolder.rotation.z = tiltRollMax;
      gunHolder.rotation.x = tiltPitchMax;
      gunHolder.position.y += tiltDropY;
      gunHolder.position.z += tiltDropZ;
      // 弹匣向下前方掉落
      magazine.position.y = player.magazineRestPos.y - t * 0.18;
      magazine.position.z = player.magazineRestPos.z + t * 0.08;
      magazine.rotation.x = t * 0.7;
      player.magazineDropped = true;
    } else if (progress < phaseInsert) {
      // 维持倾斜，新弹匣从下方升入
      gunHolder.rotation.z = tiltRollMax;
      gunHolder.rotation.x = tiltPitchMax;
      gunHolder.position.y += tiltDropY;
      gunHolder.position.z += tiltDropZ;
      const t = smooth((progress - phaseDrop) / (phaseInsert - phaseDrop));
      magazine.position.y = player.magazineRestPos.y - 0.18 + t * 0.18;
      magazine.position.z = player.magazineRestPos.z + 0.08 - t * 0.08;
      magazine.rotation.x = 0.7 - t * 0.7;
      player.magazineInserted = true;
    } else if (progress < phaseCharge) {
      // 拉机柄 + 武器开始回正
      const t = (progress - phaseInsert) / (phaseCharge - phaseInsert);
      const insertT = smooth(t);
      const ease = insertT < 0.5 ? 2 * insertT * insertT : 1 - Math.pow(-2 * insertT + 2, 2) / 2;
      gunHolder.rotation.z = tiltRollMax * (1 - ease);
      gunHolder.rotation.x = tiltPitchMax * (1 - ease);
      gunHolder.position.y += tiltDropY * (1 - ease);
      gunHolder.position.z += tiltDropZ * (1 - ease);
      // 拉机柄向后拉（向右，+X 方向，因为 chargingHandle 在右侧）
      chargingHandle.position.x = player.chargingHandleRestPos.x + ease * 0.045;
    } else {
      // 完全回正 + 拉机柄回弹
      const t = (progress - phaseCharge) / (1 - phaseCharge);
      const eased = smooth(t);
      gunHolder.rotation.z = 0;
      gunHolder.rotation.x = 0;
      gunHolder.position.y = player.weaponRestPos.y;
      gunHolder.position.z = player.weaponRestPos.z;
      // 拉机柄回弹
      const chargeT = clamp((progress - phaseInsert) / (phaseCharge - phaseInsert), 0, 1);
      const chargeEase = chargeT < 0.5 ? 2 * chargeT * chargeT : 1 - Math.pow(-2 * chargeT + 2, 2) / 2;
      const remaining = 1 - eased;
      chargingHandle.position.x = player.chargingHandleRestPos.x + chargeEase * 0.045 * remaining;
    }
  }

  updateCombat(dt) {
    if (!this.player.alive) return;

    if (this.input.isFiring()) {
      if (this.player.weapon === 'ak47') {
        if (this.player.reloading) return;
        if (this.player.fireCooldown <= 0 && this.player.ammo > 0) {
          this.fireGun();
        } else if (this.player.ammo <= 0 && !this.player.reloading) {
          if (this.player.fireCooldown <= 0) {
            this.player.fireCooldown = 0.18;
            this.audio.dryFire();
          }
        }
      } else if (this.player.weapon === 'headbutt' && this.player.headbuttCooldown <= 0) {
        this.headbutt();
      }
    }
  }

  fireGun() {
    const player = this.player;
    const weapon = WEAPONS.ak47;
    player.fireCooldown = weapon.fireInterval;

    const origin = this.camera.position.clone();
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    const moving = player.moving;
    const airborne = !player.onGround;
    let spread = weapon.baseSpread + player.recoilHeat;
    if (moving) spread += weapon.movingSpread;
    if (airborne) spread += weapon.airborneSpread;

    direction.x += (Math.random() * 2 - 1) * spread;
    direction.y += (Math.random() * 2 - 1) * spread;
    direction.z += (Math.random() * 2 - 1) * spread;
    direction.normalize();

    const hit = this.castRay(origin, direction);
    const hitPoint = hit?.point || origin.clone().addScaledVector(direction, 220);

    if (hit?.type === 'enemy') {
      const wasAlive = hit.enemy.alive;
      const damage = weapon.damage
        * (hit.headshot ? weapon.headshotMultiplier : 1)
        * this.settings.difficulty.playerDamageScale;
      hit.enemy.takeDamage(damage, hit.point);
      if (wasAlive && !hit.enemy.alive) this.kills += 1;
      this.audio.hit();
      this.spawnParticles(hit.point, hit.enemy instanceof Snake ? '#7fe07a' : '#b92d2d', 7);
      if (!hit.enemy.alive) this.audio.wolfHurt();
    } else if (hit?.type === 'world') {
      this.audio.hit();
      this.spawnParticles(hit.point, '#d8c58b', 4);
    }

    player.recoilHeat = clamp(player.recoilHeat + weapon.recoilPerShot, 0, weapon.maxRecoilSpread);
    player.recoilPitch = clamp(player.recoilPitch + weapon.recoilPerShot * 1.35, 0, 0.12);
    player.recoilYaw += (Math.random() - 0.5) * 0.008;
    // 给 viewmodel 枪身施加视觉后坐力冲量。
    player.applyFireKick(1);
    player.ammo -= 1;

    // 枪口位置优先取模型自带的 muzzlePoint，否则用旧算法（兜底）。
    let muzzle;
    if (player.gunMuzzlePoint) {
      player.arms.updateMatrixWorld(true);
      muzzle = player.gunMuzzlePoint.getWorldPosition(new THREE.Vector3());
    } else {
      muzzle = origin.clone().addScaledVector(direction, 0.55);
    }
    this.spawnTracer(muzzle, hitPoint);
    this.spawnMuzzleFlash(muzzle, direction);
    this.audio.gunshot();

    if (player.ammo <= 0 && player.reserve > 0 && !player.reloading) {
      this.ui.message.textContent = '弹匣已空，按 R 换弹';
      setTimeout(() => { this.ui.message.textContent = ''; }, 1600);
    }
  }

  headbutt() {
    const player = this.player;
    const weapon = WEAPONS.headbutt;
    player.headbuttCooldown = weapon.cooldown;
    const origin = new THREE.Vector3(player.position.x, player.position.y + 1.1, player.position.z);
    const forward = player.forward;
    let hitSomething = false;

    for (const enemy of this.allEnemies()) {
      if (!enemy.alive) continue;
      const center = new THREE.Vector3(enemy.position.x, enemy.position.y + 0.6, enemy.position.z);
      const toEnemy = center.clone().sub(origin);
      toEnemy.y = 0;
      const dist = toEnemy.length();
      if (dist > weapon.range) continue;
      const angle = forward.angleTo(toEnemy.normalize());
      if (angle > weapon.arc * 0.5) continue;

      const wasAlive = enemy.alive;
      const damage = weapon.damage * this.settings.difficulty.playerDamageScale;
      enemy.takeDamage(damage, center);
      if (wasAlive && !enemy.alive) this.kills += 1;
      const knockback = toEnemy.normalize().multiplyScalar(0.8);
      enemy.position.x += knockback.x;
      enemy.position.z += knockback.z;
      this.world.resolveCircleCollision(enemy.position, enemy.radius);
      hitSomething = true;
    }

    player.velocity.x += forward.x * weapon.lungeSpeed;
    player.velocity.z += forward.z * weapon.lungeSpeed;
    this.audio.headbutt();
    if (hitSomething) this.audio.hit();
  }

  castRay(origin, direction) {
    let nearest = Infinity;
    let result = null;

    for (const enemy of this.allEnemies()) {
      if (!enemy.alive) continue;
      const hit = enemy.rayHit(origin, direction);
      if (hit && hit.distance < nearest) {
        nearest = hit.distance;
        result = { type: 'enemy', enemy: hit.target, point: hit.point, distance: hit.distance, headshot: hit.headshot };
      }
    }

    for (const collider of this.world.colliders) {
      const t = raycastCylinder(origin, direction, collider);
      if (t < nearest) {
        nearest = t;
        result = {
          type: 'world',
          point: origin.clone().addScaledVector(direction, t),
          distance: t,
        };
      }
    }

    return result;
  }

  allEnemies() {
    return this.snake ? [...this.wolves, this.snake] : [...this.wolves];
  }

  updateEnemies(dt, time) {
    const healthBefore = this.player.health;
    const aliveWolves = [];
    for (const wolf of this.wolves) {
      wolf.update(dt, time);
      if (wolf.alive) aliveWolves.push(wolf);
    }
    this.wolves = aliveWolves;

    this.snake?.update(dt, time);
    if (this.snake && !this.snake.alive && this.snake.deathTimer > 1.2) {
      this.snake.dispose();
      this.snake = null;
    }

    if (this.player.alive && this.player.health < healthBefore) {
      this.audio.playerHurt();
    }

    // 简单的同类排斥，避免狼群完全叠在一起。
    for (let i = 0; i < this.wolves.length; i += 1) {
      const a = this.wolves[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < this.wolves.length; j += 1) {
        const b = this.wolves[j];
        if (!b.alive) continue;
        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const minDist = a.radius + b.radius + 0.35;
        const distSq = dx * dx + dz * dz;
        if (distSq >= minDist * minDist) continue;
        const dist = Math.sqrt(distSq) || 0.001;
        const push = (minDist - dist) / dist;
        const half = push * 0.5;
        a.position.x -= dx * half;
        a.position.z -= dz * half;
        b.position.x += dx * half;
        b.position.z += dz * half;
      }
    }
  }

  checkEndConditions() {
    if (this.state !== 'playing') return;
    if (!this.player.alive) {
      this.endGame(false, '黄牛倒在了森林里');
      return;
    }
    const dist = distance2D(this.player.position, this.world.goal);
    if (dist <= SPAWN.goalRadius) {
      this.endGame(true, '抵达集结点，冲出狼群！');
    }
  }

  endGame(won, title) {
    this.state = won ? 'won' : 'lost';
    if (this.input.locked) document.exitPointerLock?.();
    const totalEnemies = Math.max(1, this.totalSpawnedEnemies);
    const stats = [
      `用时 ${this.formatTime(this.elapsed)}`,
      `击杀怪物 ${this.kills} / ${totalEnemies}`,
      `剩余生命 ${Math.ceil(this.player.health)}`,
      `难度 ${this.settings.difficulty.label}`,
    ].join(' · ');

    this.ui.endTitle.textContent = won ? '胜利' : '失败';
    this.ui.endStats.textContent = won ? `${title} ${stats}` : stats;
    this.ui.endScreen.classList.remove('hidden');
    this.ui.hud.classList.add('hidden');
    if (won) this.audio.win();
    else this.audio.lose();
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  onGateChange(blocked) {
    if (blocked) {
      this.input.resetTouchState?.();
      if (this.state === 'playing' && !this._gatePaused) {
        this._gatePaused = true;
        this.pause();
      }
    } else if (this._gatePaused) {
      this._gatePaused = false;
      if (this.state === 'paused') this.resume();
    }
  }
  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.ui.pauseScreen.classList.remove('hidden');
    this.ui.hud.classList.add('hidden');
    if (this.input.locked) document.exitPointerLock?.();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.ui.pauseScreen.classList.add('hidden');
    this.ui.hud.classList.remove('hidden');
    this.timer.update();
    this.timer.getDelta();
    if (!this.input.isTouch) this.input.requestPointerLock();
  }

  togglePause() {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  spawnTracer(start, end) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({
      color: 0xffd27a,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    this.scene.add(line);
    this.tracers.push({ line, material, life: 0.07, maxLife: 0.07 });
  }

  spawnMuzzleFlash(position, direction) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(16, 16, 2, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,245,190,1)');
    gradient.addColorStop(0.25, 'rgba(255,180,70,0.9)');
    gradient.addColorStop(1, 'rgba(255,120,20,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.setScalar(0.45 + Math.random() * 0.2);
    this.scene.add(sprite);
    this.muzzleFlashes.push({ sprite, life: 0.055, maxLife: 0.055 });
  }

  spawnParticles(position, color, count) {
    const geometry = new THREE.SphereGeometry(0.055, 5, 5);
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    for (let i = 0; i < count; i += 1) {
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.position.copy(position);
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() * 2 - 1) * 3,
          Math.random() * 3.5 + 1,
          (Math.random() * 2 - 1) * 3,
        ),
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
        gravity: -9,
      });
    }
  }

  updateEffects(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i -= 1) {
      const tracer = this.tracers[i];
      tracer.life -= dt;
      tracer.material.opacity = Math.max(0, tracer.life / tracer.maxLife) * 0.9;
      if (tracer.life <= 0) {
        this.scene.remove(tracer.line);
        tracer.line.geometry.dispose();
        tracer.material.dispose();
        this.tracers.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      particle.life -= dt;
      particle.velocity.y += particle.gravity * dt;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      if (particle.mesh.position.y < 0) {
        particle.mesh.position.y = 0;
        particle.velocity.y *= -0.35;
        particle.velocity.x *= 0.6;
        particle.velocity.z *= 0.6;
      }
      particle.mesh.material.opacity = Math.max(0, particle.life / particle.maxLife);
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        particle.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.muzzleFlashes.length - 1; i >= 0; i -= 1) {
      const flash = this.muzzleFlashes[i];
      flash.life -= dt;
      flash.sprite.material.opacity = Math.max(0, flash.life / flash.maxLife);
      if (flash.life <= 0) {
        this.scene.remove(flash.sprite);
        flash.sprite.material.map?.dispose();
        flash.sprite.material.dispose();
        this.muzzleFlashes.splice(i, 1);
      }
    }
  }

  updateHud(time) {
    if (!this.player) return;
    const healthRatio = this.player.health / PLAYER.maxHealth;
    this.ui.healthFill.style.width = `${healthRatio * 100}%`;
    this.ui.healthText.textContent = `${Math.ceil(this.player.health)}`;
    this.ui.ammo.textContent = this.player.reloading
      ? '换弹中...'
      : `${this.player.ammo} / ${this.player.reserve}`;
    this.ui.weapon.textContent = WEAPONS[this.player.weapon].name;

    const dist = Math.round(distance2D(this.player.position, this.world.goal));
    this.ui.distance.textContent = `${dist}m`;
    this.ui.enemies.textContent = `${this.wolves.length + (this.snake ? 1 : 0)}`;
    this.ui.timer.textContent = this.formatTime(this.elapsed);
    this.ui.damage.style.opacity = `${this.player.hurtFlash * 0.8}`;

    const spread = (this.player.recoilHeat + (this.player.moving ? 0.03 : 0) + (!this.player.onGround ? 0.05 : 0)) * 420;
    this.ui.crosshair.style.setProperty('--spread', `${8 + spread}px`);

    this.drawMinimap();
  }

  drawMinimap() {
    const canvas = this.ui.minimap;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const scale = size / (WORLD.half * 2);
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(9, 20, 12, 0.68)';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.strokeRect(0, 0, size, size);

    const toMap = (position) => ({
      x: size / 2 + position.x * scale,
      y: size / 2 + position.z * scale,
    });

    const goal = toMap(this.world.goal);
    ctx.fillStyle = '#ff453a';
    ctx.beginPath();
    ctx.arc(goal.x, goal.y, 5, 0, Math.PI * 2);
    ctx.fill();

    for (const wolf of this.wolves) {
      if (!wolf.alive) continue;
      const point = toMap(wolf.position);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(point.x - 1, point.y - 1, 2, 2);
    }
    if (this.snake?.alive) {
      const point = toMap(this.snake.position);
      ctx.fillStyle = '#e7c53a';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const player = toMap(this.player.position);
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(-this.player.yaw + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 4);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  onResize() {
    if (!this.renderer) return;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
