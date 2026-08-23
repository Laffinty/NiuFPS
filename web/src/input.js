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
    const stick = document.getElementById('move-joystick');
    const knob = document.getElementById('move-knob');
    const look = document.getElementById('look-area');

    const startJoystick = (event) => {
      if (this._joystickId !== null) return;
      this._joystickId = event.pointerId;
      stick.setPointerCapture?.(event.pointerId);
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
      knob.style.transform = 'translate(-50%, -50%)';
    };

    stick.addEventListener('pointerdown', startJoystick);
    stick.addEventListener('pointermove', moveJoystick);
    stick.addEventListener('pointerup', endJoystick);
    stick.addEventListener('pointercancel', endJoystick);

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

    const fullscreen = document.getElementById('fullscreen-prompt');
    if (fullscreen) {
      fullscreen.addEventListener('click', () => {
        const root = document.documentElement;
        if (root.requestFullscreen) root.requestFullscreen();
        else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
        fullscreen.classList.add('hidden');
      });
    }
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
    const norm = Math.min(1, Math.hypot(dx, dy) / max);
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

  showFullscreenPromptIfNeeded() {
    if (!this.isTouch) return;
    const full = document.fullscreenElement || document.webkitFullscreenElement;
    if (!full) document.getElementById('fullscreen-prompt')?.classList.remove('hidden');
  }
}
