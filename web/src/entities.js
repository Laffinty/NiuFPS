import * as THREE from '../vendor/three/three.module.js';
import {
  PLAYER,
  WEAPONS,
  WOLF,
  SNAKE,
} from './config.js';
import {
  clamp,
  lerp,
  angleLerp,
  raycastSphere,
} from './utils.js';
import {
  createCowModel,
  createFirstPersonArms,
  createWolfModel,
  createSnakeModel,
} from './models.js';

function createHealthBarSprite(color = '#d33c3c') {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 10;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.1, 0.18, 1);
  sprite.renderOrder = 999;
  sprite.visible = false;
  return { sprite, canvas, ctx, texture, color };
}

function drawHealthBar(bar, ratio) {
  const { ctx, canvas, color } = bar;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.fillRect(1, 1, Math.max(0, Math.min(1, ratio)) * (canvas.width - 2), canvas.height - 2);
  bar.texture.needsUpdate = true;
}

export class Player {
  constructor(scene, world, input) {
    this.scene = scene;
    this.world = world;
    this.input = input;
    this.model = createCowModel();
    this.arms = createFirstPersonArms();
    this.object = new THREE.Group();
    this.object.add(this.model);
    this.arms.visible = false;
    this.scene.add(this.object);
    this.scene.add(this.arms);

    this.position = this.object.position;
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.health = PLAYER.maxHealth;
    this.alive = true;
    this.crouching = false;
    this.onGround = true;
    this.moving = false;
    this.speed = 0;
    this.viewMode = 'first';
    this.weapon = 'ak47';
    this.ammo = WEAPONS.ak47.magazine;
    this.reserve = WEAPONS.ak47.reserve;
    this.reloading = false;
    this.reloadTimer = 0;
    this.fireCooldown = 0;
    this.headbuttCooldown = 0;
    this.recoilHeat = 0;
    this.animationTime = 0;
    this.hurtFlash = 0;
  }

  spawn(position, yaw = Math.PI) {
    this.position.copy(position);
    this.yaw = yaw;
    this.pitch = 0;
    this.velocity.set(0, 0, 0);
    this.health = PLAYER.maxHealth;
    this.alive = true;
    this.reloading = false;
    this.ammo = WEAPONS.ak47.magazine;
    this.reserve = WEAPONS.ak47.reserve;
    this.weapon = 'ak47';
    this.updateModelVisibility();
  }

  get forward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  get right() {
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  get eyeHeight() {
    return this.crouching ? PLAYER.crouchHeight : PLAYER.eyeHeight;
  }

  getEyePosition() {
    return new THREE.Vector3(this.position.x, this.position.y + this.eyeHeight, this.position.z);
  }

  isMoving() {
    return this.moving;
  }

  switchWeapon(key) {
    if (!WEAPONS[key]) return;
    this.weapon = key;
    if (key === 'headbutt') {
      this.reloading = false;
      this.reloadTimer = 0;
    }
  }

  updateModelVisibility() {
    const firstPerson = this.viewMode === 'first';
    this.model.visible = !firstPerson;
    this.arms.visible = firstPerson;
  }

  setViewMode(mode) {
    this.viewMode = mode === 'third' ? 'third' : 'first';
    this.updateModelVisibility();
  }

  update(dt, time) {
    if (!this.alive) {
      this.model.visible = true;
      this.arms.visible = false;
      this.object.rotation.x = lerp(this.object.rotation.x, -Math.PI / 2, dt * 2.2);
      return;
    }

    const look = this.input.consumeLook();
    const sensitivity = PLAYER.mouseSensitivity * (this.input.isTouch ? 1.35 : 1);
    this.yaw -= look.x * sensitivity;
    this.pitch -= look.y * sensitivity;
    this.pitch = clamp(this.pitch, -1.25, 1.25);

    this.crouching = this.input.isCrouching();
    const move = this.input.movementForCamera();
    const length = Math.hypot(move.forward, move.right);
    let speed = this.crouching ? PLAYER.crouchSpeed : (this.input.isWalking() ? PLAYER.walkSpeed : PLAYER.runSpeed);
    if (this.world.isInWater(this.position)) speed *= PLAYER.waterSpeedScale;

    let desired = new THREE.Vector3();
    if (length > 0.001) {
      const f = this.forward.multiplyScalar(move.forward);
      const r = this.right.multiplyScalar(move.right);
      desired.addVectors(f, r);
      if (desired.lengthSq() > 0) desired.normalize().multiplyScalar(speed);
    }

    this.moving = desired.lengthSq() > 0.01;
    const acceleration = this.onGround ? 14 : 5;
    this.velocity.x = lerp(this.velocity.x, desired.x, dt * acceleration);
    this.velocity.z = lerp(this.velocity.z, desired.z, dt * acceleration);

    if (this.input.consumeJump() && this.onGround) {
      this.velocity.y = PLAYER.jumpSpeed;
      this.onGround = false;
    }

    this.velocity.y += PLAYER.gravity * dt;
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y += this.velocity.y * dt;

    const groundY = this.world.heightAt(this.position.x, this.position.z);
    if (this.position.y <= groundY) {
      this.position.y = groundY;
      this.velocity.y = 0;
      this.onGround = true;
    }

    this.world.resolveCircleCollision(this.position, PLAYER.radius);
    if (this.onGround) this.position.y = this.world.heightAt(this.position.x, this.position.z);

    this.object.position.copy(this.position);
    // 相机/玩家的前进方向在 yaw=0 时为 -Z，而模型头部默认朝 +Z。
    this.object.rotation.y = this.yaw + Math.PI;

    if (this.moving && this.onGround) {
      this.animationTime += dt * (speed / PLAYER.runSpeed) * 8;
      const limbSwing = Math.sin(this.animationTime) * 0.55;
      const { leftArm, rightArm, legs } = this.model.userData;
      leftArm.rotation.x = limbSwing;
      rightArm.rotation.x = -limbSwing;
      legs[0].rotation.x = limbSwing;
      legs[1].rotation.x = -limbSwing;
      legs[2].rotation.x = -limbSwing;
      legs[3].rotation.x = limbSwing;
    } else if (this.model.visible) {
      const { leftArm, rightArm, legs } = this.model.userData;
      leftArm.rotation.x = lerp(leftArm.rotation.x, 0, dt * 10);
      rightArm.rotation.x = lerp(rightArm.rotation.x, 0, dt * 10);
      legs.forEach((leg) => { leg.rotation.x = lerp(leg.rotation.x, 0, dt * 10); });
    }

    this.updateWeapon(dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.4);
  }

  updateWeapon(dt) {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.headbuttCooldown = Math.max(0, this.headbuttCooldown - dt);
    this.recoilHeat = Math.max(0, this.recoilHeat - dt * WEAPONS.ak47.recoilRecovery);
    this.recoilPitch = lerp(this.recoilPitch, 0, dt * 8);
    this.recoilYaw = lerp(this.recoilYaw, 0, dt * 8);

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const config = WEAPONS.ak47;
        const needed = config.magazine - this.ammo;
        const take = Math.min(needed, this.reserve);
        this.ammo += take;
        this.reserve -= take;
        this.reloading = false;
      }
    }
  }

  startReload() {
    if (this.weapon !== 'ak47' || this.reloading) return false;
    if (this.ammo >= WEAPONS.ak47.magazine || this.reserve <= 0) return false;
    this.reloading = true;
    this.reloadTimer = WEAPONS.ak47.reloadTime;
    return true;
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.health = Math.max(0, this.health - amount);
    this.hurtFlash = 1;
    if (this.health <= 0) {
      this.alive = false;
    }
  }
}

export class Wolf {
  constructor(scene, world, player, config, index, random) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.index = index;
    this.random = random;
    this.model = createWolfModel();
    this.scene.add(this.model);
    this.group = this.model;
    this.health = config.maxHealth;
    this.maxHealth = config.maxHealth;
    this.alive = true;
    this.state = 'roam';
    this.speed = config.speed;
    this.chaseSpeed = config.chaseSpeed;
    this.aggroRange = config.aggroRange;
    this.attackRange = config.attackRange;
    this.attackCooldown = 0;
    this.attackInterval = config.attackCooldown;
    this.damage = config.damage;
    this.radius = config.radius;
    this.waypoint = new THREE.Vector3();
    this.wanderTimer = 0;
    this.attackAnim = 0;
    this.hurtFlash = 0;
    this.deathTimer = 0;
    this.bar = createHealthBarSprite('#d43a3a');
    this.scene.add(this.bar.sprite);
  }

  get position() {
    return this.group.position;
  }

  chooseWaypoint() {
    const range = 200;
    for (let i = 0; i < 8; i += 1) {
      const x = (this.random() * 2 - 1) * range;
      const z = (this.random() * 2 - 1) * range;
      this.waypoint.set(x, this.world.heightAt(x, z), z);
      if (!this.world.isOutOfBounds(this.waypoint, this.radius)) return;
    }
    this.waypoint.set(
      clamp(this.position.x + (this.random() * 2 - 1) * 18, -range, range),
      this.position.y,
      clamp(this.position.z + (this.random() * 2 - 1) * 18, -range, range),
    );
  }

  update(dt, time) {
    if (!this.alive) {
      this.deathTimer += dt;
      this.group.visible = false;
      this.bar.sprite.visible = false;
      return;
    }

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 4);
    this.attackAnim = Math.max(0, this.attackAnim - dt * 4);

    const playerPos = this.player.position;
    const dist = this.position.distanceTo(playerPos);
    let move = new THREE.Vector3();

    if (dist < this.aggroRange && this.player.alive) {
      this.state = 'chase';
      move.subVectors(playerPos, this.position);
      move.y = 0;
      if (move.lengthSq() > 0.001) move.normalize();
      if (dist < this.attackRange) {
        this.state = 'attack';
        move.set(0, 0, 0);
        if (this.attackCooldown <= 0) {
          this.attackCooldown = this.attackInterval;
          this.attackAnim = 1;
          this.player.takeDamage(this.damage);
          return;
        }
      }
    } else {
      this.state = 'roam';
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0 || this.position.distanceTo(this.waypoint) < 1.5) {
        this.chooseWaypoint();
        this.wanderTimer = 3 + this.random() * 5;
      }
      move.subVectors(this.waypoint, this.position);
      move.y = 0;
      if (move.lengthSq() > 0.001) move.normalize();
    }

    const speed = this.state === 'chase' ? this.chaseSpeed : this.speed;
    this.position.x += move.x * speed * dt;
    this.position.z += move.z * speed * dt;
    this.position.y = this.world.heightAt(this.position.x, this.position.z);
    this.world.resolveCircleCollision(this.position, this.radius);
    this.position.y = this.world.heightAt(this.position.x, this.position.z);

    if (move.lengthSq() > 0.001) {
      const targetYaw = Math.atan2(move.x, move.z);
      this.group.rotation.y = angleLerp(this.group.rotation.y, targetYaw, dt * 6);
      const limb = Math.sin(time * 11 + this.index) * 0.45;
      this.model.userData.legs.forEach((leg, i) => {
        leg.rotation.x = (i % 2 ? -limb : limb);
      });
    }

    this.updateHealthBar();
  }

  getHitTargets() {
    const forward = this.group.rotation.y;
    const headX = Math.sin(forward) * 0.72;
    const headZ = Math.cos(forward) * 0.72;
    return [
      { center: new THREE.Vector3(this.position.x + headX, this.position.y + 0.78, this.position.z + headZ), radius: 0.32, headshot: true },
      { center: new THREE.Vector3(this.position.x, this.position.y + 0.58, this.position.z), radius: 0.58, headshot: false },
    ];
  }

  rayHit(origin, direction) {
    let nearest = Infinity;
    let hit = null;
    for (const target of this.getHitTargets()) {
      const t = raycastSphere(origin, direction, target.center, target.radius);
      if (t < nearest) {
        nearest = t;
        hit = {
          distance: t,
          point: origin.clone().addScaledVector(direction, t),
          target: this,
          headshot: target.headshot,
        };
      }
    }
    return hit;
  }

  takeDamage(amount, point) {
    if (!this.alive) return;
    this.health = Math.max(0, this.health - amount);
    this.hurtFlash = 1;
    if (this.health <= 0) {
      this.alive = false;
      this.deathTimer = 0;
    }
    this.updateHealthBar();
  }

  updateHealthBar() {
    if (!this.alive) return;
    this.bar.sprite.position.set(this.position.x, this.position.y + 1.45, this.position.z);
    this.bar.sprite.visible = this.health < this.maxHealth;
    if (this.bar.sprite.visible) drawHealthBar(this.bar, this.health / this.maxHealth);
  }

  dispose() {
    this.scene.remove(this.model);
    this.scene.remove(this.bar.sprite);
  }
}

export class Snake {
  constructor(scene, world, player, config, random) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.random = random;
    this.model = createSnakeModel(config.segmentCount);
    this.scene.add(this.model);
    this.group = this.model;
    this.health = config.maxHealth;
    this.maxHealth = config.maxHealth;
    this.alive = true;
    this.state = 'roam';
    this.speed = config.speed;
    this.chaseSpeed = config.chaseSpeed;
    this.aggroRange = config.aggroRange;
    this.attackRange = config.attackRange;
    this.attackCooldown = 0;
    this.attackInterval = config.attackCooldown;
    this.damage = config.biteDamage;
    this.radius = config.radius;
    this.waypoint = new THREE.Vector3();
    this.wanderTimer = 0;
    this.hurtFlash = 0;
    this.deathTimer = 0;
    this.slither = 0;
    this.bar = createHealthBarSprite('#d4b22f');
    this.scene.add(this.bar.sprite);
  }

  get position() {
    return this.group.position;
  }

  chooseWaypoint() {
    const range = 200;
    for (let i = 0; i < 8; i += 1) {
      const x = (this.random() * 2 - 1) * range;
      const z = (this.random() * 2 - 1) * range;
      this.waypoint.set(x, this.world.heightAt(x, z), z);
      if (!this.world.isOutOfBounds(this.waypoint, this.radius)) return;
    }
  }

  update(dt, time) {
    if (!this.alive) {
      this.deathTimer += dt;
      this.group.visible = false;
      this.bar.sprite.visible = false;
      return;
    }

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 4);
    this.slither += dt * 7;

    const playerPos = this.player.position;
    const dist = this.position.distanceTo(playerPos);
    let move = new THREE.Vector3();

    if (dist < this.aggroRange && this.player.alive) {
      this.state = 'chase';
      move.subVectors(playerPos, this.position);
      move.y = 0;
      if (move.lengthSq() > 0.001) move.normalize();
      if (dist < this.attackRange && this.attackCooldown <= 0) {
        this.attackCooldown = this.attackInterval;
        this.player.takeDamage(this.damage);
        this.model.userData.head.rotation.x = Math.sin(time * 12) * 0.7;
      }
    } else {
      this.state = 'roam';
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0 || this.position.distanceTo(this.waypoint) < 1.5) {
        this.chooseWaypoint();
        this.wanderTimer = 3 + this.random() * 5;
      }
      move.subVectors(this.waypoint, this.position);
      move.y = 0;
      if (move.lengthSq() > 0.001) move.normalize();
    }

    const speed = this.state === 'chase' ? this.chaseSpeed : this.speed;
    this.position.x += move.x * speed * dt;
    this.position.z += move.z * speed * dt;
    this.position.y = this.world.heightAt(this.position.x, this.position.z);
    this.world.resolveCircleCollision(this.position, this.radius);
    this.position.y = this.world.heightAt(this.position.x, this.position.z);

    if (move.lengthSq() > 0.001) {
      const targetYaw = Math.atan2(move.x, move.z);
      this.group.rotation.y = angleLerp(this.group.rotation.y, targetYaw, dt * 4);
    }
    const segments = this.model.userData.segments;
    segments.forEach((segment, i) => {
      segment.position.y = 0.14 + Math.sin(this.slither + i * 0.7) * 0.04;
      segment.rotation.x = Math.sin(this.slither + i * 0.6) * 0.08;
    });

    this.updateHealthBar();
  }

  getHitTargets() {
    const targets = [];
    const headWorld = new THREE.Vector3();
    this.model.userData.head.getWorldPosition(headWorld);
    targets.push({ center: headWorld, radius: 0.3, headshot: true });
    this.model.userData.segments.forEach((segment) => {
      const center = new THREE.Vector3();
      segment.getWorldPosition(center);
      targets.push({ center, radius: 0.19, headshot: false });
    });
    return targets;
  }

  rayHit(origin, direction) {
    let nearest = Infinity;
    let hit = null;
    for (const target of this.getHitTargets()) {
      const t = raycastSphere(origin, direction, target.center, target.radius);
      if (t < nearest) {
        nearest = t;
        hit = {
          distance: t,
          point: origin.clone().addScaledVector(direction, t),
          target: this,
          headshot: target.headshot,
        };
      }
    }
    return hit;
  }

  takeDamage(amount, point) {
    if (!this.alive) return;
    this.health = Math.max(0, this.health - amount);
    this.hurtFlash = 1;
    if (this.health <= 0) {
      this.alive = false;
      this.deathTimer = 0;
    }
    this.updateHealthBar();
  }

  updateHealthBar() {
    if (!this.alive) return;
    this.bar.sprite.position.set(this.position.x, this.position.y + 0.95, this.position.z);
    this.bar.sprite.visible = this.health < this.maxHealth;
    if (this.bar.sprite.visible) drawHealthBar(this.bar, this.health / this.maxHealth);
  }

  dispose() {
    this.scene.remove(this.model);
    this.scene.remove(this.bar.sprite);
  }
}
