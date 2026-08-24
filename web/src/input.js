import { TOUCH } from './config.js';

export class InputManager {
  constructor() {
    this.isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 1;
    this.keys = new Set();
    this.mouseDown = false;
    this.lookDelta = { x: 0, y: 0 };
    this.locked = false;
    this.moveAxis = { x: 0, z: 0 };
    this.touchLook = { x: 0, y: 0 };
    this.fireHeld = false;
    this.jumpPressed = false;
    this.crouchHeld = false;
    this.reloadPressed = false;
    this.viewPressed = false;
    this._requestedWeapon = null;
    this._joystickId = null;
    this._lookId = null;
    this._lookLast = null;
  }

  attach() {
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      if (event.code === 'KeyR') this.reloadPressed = true;
      if (event.code === 'Digit1' || event.code === 'Numpad1') this.requestWeapon('ak47');
      if (event.code === 'Digit2' || event.code === 'Numpad2') this.requestWeapon('headbutt');
      if (event.code === 'KeyV') this.viewPressed = true;
      if (event.code === 'Space') {
        this.jumpPressed = true;
        event.preventDefault();
      }
    });

    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
      if (event.code === 'ControlLeft' || event.code === 'ControlRight' || event.code === 'KeyC') {
        this.crouchHeld = false;
      }
    });

    document.addEventListener('mousemove', (event) => {
      if (!this.locked) return;
      this.lookDelta.x += event.movementX || 0;
      this.lookDelta.y += event.movementY || 0;
    });

    document.addEventListener('mousedown', (event) => {
      if (event.button !== 0) return;
      this.mouseDown = true;
      if (!this.locked && !this.isTouch) this.requestPointerLock();
    });

    document.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.mouseDown = false;
    });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement != null;
    });

    if (this.isTouch) this.attachTouchControls();
  }

  requestPointerLock() {
    const el = document.getElementById('game-canvas');
    if (el && el.requestPointerLock) el.requestPointerLock();
  }

  requestWeapon(key) {
    this._requestedWeapon = key;
  }

  consumeWeaponRequest() {
    const key = this._requestedWeapon;
    this._requestedWeapon = null;
    return key;
  }

  attachTouchControls() {
    document.getElementById('touch-controls')?.classList.add('active');
    const moveZone = document.getElementById('move-zone');
    const stick = document.getElementById('move-joystick');
    const knob = document.getElementById('move-knob');
    const look = document.getElementById('look-area');

    const startJoystick = (event) => {
      if (this._joystickId !== null) return;
      this._joystickId = event.pointerId;
      moveZone.setPointerCapture?.(event.pointerId);
      const rect = moveZone.getBoundingClientRect();
      const radius = TOUCH.joystickRadius;
      const x = Math.min(Math.max(event.clientX - rect.left, radius), Math.max(radius, rect.width - radius));
      const y = Math.min(Math.max(event.clientY - rect.top, radius), Math.max(radius, rect.height - radius));
      stick.style.left = `${x}px`;
      stick.style.top = `${y}px`;
      stick.classList.remove('hidden');
      knob.style.transform = 'translate(-50%, -50%)';
      this._updateJoystick(event, stick, knob);
    };

    const moveJoystick = (event) => {
      if (event.pointerId !== this._joystickId) return;
      this._updateJoystick(event, stick, knob);
    };

    const endJoystick = (event) => {
      if (event.pointerId !== this._joystickId) return;
      this._joystickId = null;
      this.moveAxis.x = 0;
      this.moveAxis.z = 0;
      stick.classList.add('hidden');
      knob.style.transform = 'translate(-50%, -50%)';
    };

    moveZone.addEventListener('pointerdown', startJoystick);
    moveZone.addEventListener('pointermove', moveJoystick);
    moveZone.addEventListener('pointerup', endJoystick);
    moveZone.addEventListener('pointercancel', endJoystick);

    const startLook = (event) => {
      if (this._lookId !== null) return;
      this._lookId = event.pointerId;
      this._lookLast = { x: event.clientX, y: event.clientY };
      look.setPointerCapture?.(event.pointerId);
    };

    const moveLook = (event) => {
      if (event.pointerId !== this._lookId || !this._lookLast) return;
      this.touchLook.x = event.clientX - this._lookLast.x;
      this.touchLook.y = event.clientY - this._lookLast.y;
      this._lookLast = { x: event.clientX, y: event.clientY };
    };

    const endLook = (event) => {
      if (event.pointerId !== this._lookId) return;
      this._lookId = null;
      this._lookLast = null;
    };

    look.addEventListener('pointerdown', startLook);
    look.addEventListener('pointermove', moveLook);
    look.addEventListener('pointerup', endLook);
    look.addEventListener('pointercancel', endLook);

    const hold = (id, fn) => {
      const el = document.getElementById(id);
      el?.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        fn(true);
      });
      el?.addEventListener('pointerup', () => fn(false));
      el?.addEventListener('pointercancel', () => fn(false));
      el?.addEventListener('pointerleave', () => fn(false));
    };

    hold('btn-fire', (held) => { this.fireHeld = held; });
    hold('btn-jump', (held) => { if (held) this.jumpPressed = true; });
    hold('btn-crouch', (held) => { this.crouchHeld = held; });

    const tap = (id, fn) => {
      document.getElementById(id)?.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        fn();
      });
    };
    tap('btn-reload', () => { this.reloadPressed = true; });
    tap('btn-weapon', () => {
      this._requestedWeapon = this._requestedWeapon === 'ak47' ? 'headbutt' : 'ak47';
    });
    tap('btn-view', () => { this.viewPressed = true; });
  }
  _updateJoystick(event, stick, knob) {
    const rect = stick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const max = rect.width / 2;
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const length = Math.hypot(dx, dy);
    if (length > max) {
      dx = (dx / length) * max;
      dy = (dy / length) * max;
    }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const raw = Math.hypot(dx, dy) / max;
    const norm = raw <= TOUCH.joystickDeadZone ? 0 : Math.min(1, (raw - TOUCH.joystickDeadZone) / (1 - TOUCH.joystickDeadZone));
    const angle = Math.atan2(dx, -dy);
    this.moveAxis.x = Math.sin(angle) * norm;
    this.moveAxis.z = -Math.cos(angle) * norm;
  }

  consumeLook() {
    let x;
    let y;
    if (this.isTouch) {
      x = this.touchLook.x;
      y = this.touchLook.y;
      this.touchLook.x = 0;
      this.touchLook.y = 0;
    } else {
      x = this.lookDelta.x;
      y = this.lookDelta.y;
      this.lookDelta.x = 0;
      this.lookDelta.y = 0;
    }
    return { x, y };
  }

  consumeJump() {
    const value = this.jumpPressed;
    this.jumpPressed = false;
    return value;
  }

  consumeReload() {
    const value = this.reloadPressed;
    this.reloadPressed = false;
    return value;
  }

  consumeView() {
    const value = this.viewPressed;
    this.viewPressed = false;
    return value;
  }

  isDown(code) {
    return this.keys.has(code);
  }

  movementForCamera() {
    if (this.isTouch) {
      return {
        forward: -this.moveAxis.z,
        right: this.moveAxis.x,
      };
    }
    let forward = 0;
    let right = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) forward += 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) forward -= 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) right -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) right += 1;
    return { forward, right };
  }

  isCrouching() {
    if (this.isTouch) return this.crouchHeld;
    return this.isDown('ControlLeft') || this.isDown('ControlRight') || this.isDown('KeyC') || this.crouchHeld;
  }

  isWalking() {
    return this.isTouch ? false : this.isDown('ShiftLeft') || this.isDown('ShiftRight');
  }

  isFiring() {
    return this.isTouch ? this.fireHeld : this.mouseDown;
  }

  resetTouchState() {
    this.fireHeld = false;
    this.jumpPressed = false;
    this.crouchHeld = false;
    this.reloadPressed = false;
    this.viewPressed = false;
    this.moveAxis.x = 0;
    this.moveAxis.z = 0;
    this.touchLook.x = 0;
    this.touchLook.y = 0;
    this._joystickId = null;
    this._lookId = null;
    this._lookLast = null;
  }
}
