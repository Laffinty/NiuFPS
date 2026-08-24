export class OrientationGate {
  constructor(onChange) {
    this.onChange = onChange || (() => {});
    this.blocked = false;
    this.isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 1;
    this.el = document.getElementById('fullscreen-gate');
    this.btn = document.getElementById('fullscreen-btn');
    this.msg = document.getElementById('fullscreen-msg');
    this.sub = document.getElementById('fullscreen-sub');
    this.canFullscreen = Boolean(
      document.documentElement.requestFullscreen ||
      document.documentElement.webkitRequestFullscreen,
    );
    this._allowLandscapeContinue = false;
  }

  attach() {
    if (!this.isTouch || !this.el) return;
    this.btn.addEventListener('click', () => this.onPrimaryClick());
    window.addEventListener('fullscreenchange', () => this.evaluate());
    document.addEventListener('webkitfullscreenchange', () => this.evaluate());
    window.addEventListener('orientationchange', () => this.evaluate());
    window.addEventListener('resize', () => this.evaluate());
    screen.orientation?.addEventListener?.('change', () => this.evaluate());
    this.evaluate();
  }

  isFullscreen() {
    return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  }

  isLandscape() {
    return window.innerWidth > window.innerHeight;
  }

  isReady() {
    return this.isFullscreen() && this.isLandscape();
  }

  onPrimaryClick() {
    if (this._allowLandscapeContinue && this.isLandscape() && !this.canFullscreen) {
      this.setBlocked(false);
      return;
    }
    this.requestLandscape();
  }

  async requestLandscape() {
    const root = document.documentElement;
    try {
      if (root.requestFullscreen) {
        await root.requestFullscreen();
      } else if (root.webkitRequestFullscreen) {
        await new Promise((resolve, reject) => {
          const done = () => {
            cleanup();
            resolve();
          };
          const failed = () => {
            cleanup();
            reject(new Error('webkit fullscreen rejected'));
          };
          const cleanup = () => {
            document.removeEventListener('webkitfullscreenchange', done);
            document.removeEventListener('webkitfullscreenerror', failed);
          };
          document.addEventListener('webkitfullscreenchange', done);
          document.addEventListener('webkitfullscreenerror', failed);
          root.webkitRequestFullscreen();
        });
      }
    } catch (error) {
      // 全屏请求被拒绝：保持阻断状态
    }
    try {
      if (screen.orientation?.lock) {
        await screen.orientation.lock('landscape');
      }
    } catch (error) {
      // 方向锁定为 best-effort，失败不阻塞流程
    }
    this.evaluate();
  }

  evaluate() {
    if (!this.isTouch || !this.el) return;
    if (this.isReady()) {
      this._allowLandscapeContinue = false;
      this.setBlocked(false);
      return;
    }

    if (this.canFullscreen) {
      if (this.isFullscreen()) {
        this.btn.textContent = '旋转至横屏';
        this.msg.textContent = '已进入全屏，请将手机旋转至横屏';
      } else {
        this.btn.textContent = '⛶ 全屏';
        this.msg.textContent = '为获得最佳体验，请使用横屏全屏模式';
      }
      this.sub.textContent = '';
    } else if (this.isLandscape()) {
      this.btn.textContent = '继续游戏';
      this.msg.textContent = '已横屏，点击继续';
      this.sub.textContent = '提示：添加到主屏幕可获得真全屏（PWA）';
      this._allowLandscapeContinue = true;
    } else {
      this.btn.textContent = '旋转至横屏';
      this.msg.textContent = '请将手机旋转至横屏';
      this.sub.textContent = '提示：添加到主屏幕可获得真全屏（PWA）';
      this._allowLandscapeContinue = false;
    }
    this.setBlocked(true);
  }

  setBlocked(blocked) {
    if (this.blocked === blocked) return;
    this.blocked = blocked;
    this.el.classList.toggle('hidden', !blocked);
    document.getElementById('touch-controls')?.classList.toggle('blocked', blocked);
    this.onChange(blocked);
  }
}