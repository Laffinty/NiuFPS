import * as THREE from '../vendor/three/three.module.js';
import { createCowModel } from './models.js';

/**
 * 主菜单牛主角 hero 立绘场景。
 * 独立的 WebGLRenderer / Scene / Camera 循环，与主游戏完全隔离；
 * 仅在主菜单可见时启动，进入游戏后调用 stop() 释放 GPU。
 */
export class HeroScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.cow = null;
    this.clock = null;
    this.running = false;
    this.resizeHandler = () => this.resize();
    this.resizeObserver = null;
    this._rafId = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.init();
    this.resize();
    window.addEventListener('resize', this.resizeHandler);
    // 监听 canvas 自身尺寸变化（flex / aspect-ratio 在初次布局后才稳定）
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas);
    }
    this.clock = new THREE.Clock();
    this.loop();
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    window.removeEventListener('resize', this.resizeHandler);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this.renderer) {
      // 主动放弃 WebGL 上下文，释放 GPU 资源
      try {
        const lose = this.renderer.getContext().getExtension('WEBGL_lose_context');
        lose?.loseContext?.();
      } catch (error) {
        // best-effort：忽略释放失败
      }
      this.renderer.dispose();
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
    this.cow = null;
    this.clock = null;
  }

  init() {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = null;
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 50);
    camera.position.set(0, 1.55, 4.0);
    camera.lookAt(0, 1.45, 0);
    this.camera = camera;

    // 半球光（环境）+ 前上方主光 + 后侧轮廓光，营造立体感
    const hemi = new THREE.HemisphereLight(0x6fd285, 0x1a0e08, 0.55);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff1d6, 1.4);
    key.position.set(1.5, 3.2, 3.4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x88c8ff, 0.55);
    rim.position.set(-2.0, 1.6, -2.0);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0x4a3826, 0.4);
    fill.position.set(0, -1.0, 2.5);
    scene.add(fill);

    // 牛模型（hero pose：双臂胸前抱 AK、头微抬）
    const cow = createCowModel({ pose: 'hero' });
    cow.position.set(0, 0, 0);
    cow.rotation.y = 0; // 正对相机
    scene.add(cow);
    this.cow = cow;

    // 脚下光环：扁平圆盘 + 自发光（hero 地面感）
    const ringGeo = new THREE.RingGeometry(0.95, 1.4, 64, 1);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf0b642,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.005;
    scene.add(ring);
    this.ring = ring;
  }

  resize() {
    if (!this.renderer || !this.camera || !this.canvas) return;
    const { clientWidth, clientHeight } = this.canvas;
    if (!clientWidth || !clientHeight) return;
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
  }

  loop() {
    if (!this.running) return;
    const dt = Math.min(this.clock?.getDelta() ?? 0.016, 0.05);
    if (this.cow) {
      const t = (this.clock?.elapsedTime ?? 0);
      // 微摆 yaw + 呼吸式 y 浮动，立绘更鲜活
      this.cow.rotation.y = Math.sin(t * 0.55) * 0.06;
      this.cow.position.y = Math.sin(t * 1.05) * 0.025;
      // 枪口方向随身体轻微旋转
      if (this.cow.userData?.gun) {
        this.cow.userData.gun.rotation.y = -0.32 + Math.sin(t * 0.55) * 0.04;
      }
    }
    if (this.ring) {
      const t = (this.clock?.elapsedTime ?? 0);
      const breathe = 1 + Math.sin(t * 1.3) * 0.04;
      this.ring.scale.set(breathe, breathe, breathe);
      this.ring.material.opacity = 0.14 + (Math.sin(t * 1.3) + 1) * 0.06;
    }
    this.renderer.render(this.scene, this.camera);
    this._rafId = requestAnimationFrame(() => this.loop());
  }
}