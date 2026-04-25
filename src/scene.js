/**
 * Three.js 3D 씬 관리
 * InstancedMesh를 사용한 복셀 렌더링
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 복셀 그리드 설정
const GRID_SIZE = 256;
const TOTAL_VOXELS = GRID_SIZE * GRID_SIZE;

class SceneManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.instancedMesh = null;
    this.depthAttribute = null;
    this.depthScale = 1.0;
    this.container = null;
    this.isInitialized = false;
    this.animationId = null;
    this.voxelHue = 140; // 기본 초록색 계열 (HSL 140)
  }

  /**
   * Three.js 씬을 초기화합니다.
   * @param {HTMLElement} container - 캔버스가 추가될 컨테이너
   */
  initScene(container) {
    if (this.isInitialized) return;

    this.container = container;

    // 씬 생성
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    // 카메라 설정
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 200);

    // 렌더러 설정
    this.renderer = new THREE.WebGLRenderer({
      canvas: container,
      antialias: false, // 성능 최적화
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // OrbitControls 설정
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.5;
    this.controls.enableZoom = true;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 500;

    // 조명 추가 (MeshBasicMaterial을 사용하므로 실제로는 필요 없지만, 추후 확장을 위해)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // 윈도우 리사이즈 이벤트
    window.addEventListener('resize', this.handleResize.bind(this));

    this.isInitialized = true;

    // 애니메이션 루프 시작
    this.animate();
  }

  /**
   * InstancedMesh로 복셀 그리드를 생성합니다.
   */
  createVoxelGrid() {
    // 기존 메시 제거
    if (this.instancedMesh) {
      this.scene.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      this.instancedMesh.material.dispose();
    }

    // 기하학: 1x1x1 큐브
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    // 재질: 조명 연산이 없는 MeshBasicMaterial
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });

    // InstancedMesh 생성: 65,536개 큐브를 단일 드로우 콜로 렌더링
    this.instancedMesh = new THREE.InstancedMesh(geometry, material, TOTAL_VOXELS);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // 깊이 속성 추가 (셰이더에서 사용)
    const depthArray = new Float32Array(TOTAL_VOXELS);
    this.depthAttribute = new THREE.InstancedBufferAttribute(depthArray, 1);
    this.instancedMesh.geometry.setAttribute('aDepth', this.depthAttribute);

    // 셰이더 커스터마이징
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        attribute float aDepth;
        uniform float uDepthScale;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        transformed.z += aDepth * uDepthScale;
        `
      );

      shader.uniforms.uDepthScale = { value: this.depthScale };
      material.userData.shader = shader;
    };

    // 초기 위치 설정 (중앙 정렬)
    const dummy = new THREE.Object3D();
    const offset = GRID_SIZE / 2;

    for (let i = 0; i < TOTAL_VOXELS; i++) {
      const x = (i % GRID_SIZE) - offset;
      const y = Math.floor(i / GRID_SIZE) - offset;
      const z = 0;

      dummy.position.set(x, -y, z);
      dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.instancedMesh);
  }

  /**
   * 복셀 데이터를 업데이트합니다.
   * @param {Uint8Array|Float32Array} colorData - RGB 색상 데이터
   * @param {Float32Array|number[]} depthData - 깊이 데이터 (0-1 범위)
   */
  updateVoxelData(colorData, depthData) {
    if (!this.instancedMesh) {
      this.createVoxelGrid();
    }

    if (depthData && depthData.length === TOTAL_VOXELS) {
      const color = new THREE.Color();
      // HSL을 사용하여 실시간으로 근접 색상 계산
      const nearColor = new THREE.Color().setHSL(this.voxelHue / 360, 0.8, 0.5); 
      const farColor = new THREE.Color('#051024');  // 먼 곳: 딥 블루

      for (let i = 0; i < TOTAL_VOXELS; i++) {
        // 1. Z축 깊이 이동
        this.depthAttribute.setX(i, depthData[i] * 50); 
        
        // 2. 뎁스 기반 컬러 스타일링 (웹캠 텍스처 대신 적용)
        // depthData[i] 값(0~1)에 따라 farColor와 nearColor 사이를 부드럽게 섞음
        color.lerpColors(farColor, nearColor, depthData[i]);
        this.instancedMesh.setColorAt(i, color);
      }
      this.depthAttribute.needsUpdate = true;
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * 깊이 스케일을 설정합니다.
   * @param {number} scale - 깊이 스케일 값
   */
  setDepthScale(scale) {
    this.depthScale = scale;

    if (this.instancedMesh && this.instancedMesh.material.userData.shader) {
      this.instancedMesh.material.userData.shader.uniforms.uDepthScale.value = scale;
    }
  }

  /**
   * 복셀 색상 테마(Hue)를 설정합니다.
   * @param {number} hue - HSL 색상값 (0-360)
   */
  setVoxelHue(hue) {
    this.voxelHue = hue;
  }

  /**
   * 렌더링 루프
   */
  animate() {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    if (this.controls) {
      this.controls.update();
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * 윈도우 리사이즈 처리
   */
  handleResize() {
    if (!this.container || !this.camera || !this.renderer) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  /**
   * 리소스를 정리합니다.
   */
  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.instancedMesh) {
      this.scene.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      this.instancedMesh.material.dispose();
    }

    if (this.controls) {
      this.controls.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    window.removeEventListener('resize', this.handleResize.bind(this));
    this.isInitialized = false;
  }
}

// 싱글톤 인스턴스
export const sceneManager = new SceneManager();
