/**
 * Three.js 3D 씬 관리
 * InstancedMesh를 사용한 복셀 렌더링
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 복셀 그리드 기본 설정 (클래스 인스턴스 프로퍼티로 이동)

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
    
    this.gridSize = 256;
    this.TOTAL_VOXELS = this.gridSize * this.gridSize;
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

    // InstancedMesh 생성: TOTAL_VOXELS 큐브를 단일 드로우 콜로 렌더링
    this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.TOTAL_VOXELS);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // 깊이 속성 추가 (셰이더에서 사용)
    const depthArray = new Float32Array(this.TOTAL_VOXELS);
    this.depthAttribute = new THREE.InstancedBufferAttribute(depthArray, 1);
    this.instancedMesh.geometry.setAttribute('aDepth', this.depthAttribute);

    // 셰이더 커스터마이징 (가장 중요한 GPU 최적화 부분)
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        attribute float aDepth;
        uniform float uDepthScale;
        varying float vDepth;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vDepth = aDepth / 50.0; // 0.0 ~ 1.0 범위 정규화 (updateVoxelData에서 * 50 하므로)
        transformed.z += aDepth * uDepthScale;
        `
      );

      shader.fragmentShader = `
        uniform vec3 uNearColor;
        uniform vec3 uFarColor;
        varying float vDepth;
        ${shader.fragmentShader}
      `;
      
      shader.fragmentShader = shader.fragmentShader.replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `
        vec3 finalColor = mix(uFarColor, uNearColor, vDepth);
        vec4 diffuseColor = vec4( finalColor, opacity );
        `
      );

      shader.uniforms.uDepthScale = { value: this.depthScale };
      shader.uniforms.uNearColor = { value: new THREE.Color().setHSL(this.voxelHue / 360, 0.8, 0.5) };
      shader.uniforms.uFarColor = { value: new THREE.Color('#051024') };
      material.userData.shader = shader;
    };

    // 초기 위치 설정 (중앙 정렬)
    const dummy = new THREE.Object3D();
    const offset = this.gridSize / 2;

    for (let i = 0; i < this.TOTAL_VOXELS; i++) {
      const x = (i % this.gridSize) - offset;
      const y = Math.floor(i / this.gridSize) - offset;
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

    if (depthData && depthData.length === this.TOTAL_VOXELS) {
      for (let i = 0; i < this.TOTAL_VOXELS; i++) {
        // Z축 깊이 이동만 JS에서 처리. (색상 혼합은 GPU 셰이더가 처리)
        this.depthAttribute.setX(i, depthData[i] * 50); 
      }
      this.depthAttribute.needsUpdate = true;
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
    if (this.instancedMesh && this.instancedMesh.material.userData.shader) {
      const nearColor = new THREE.Color().setHSL(hue / 360, 0.8, 0.5);
      this.instancedMesh.material.userData.shader.uniforms.uNearColor.value = nearColor;
    }
  }

  /**
   * 그리드 사이즈를 변경합니다.
   * @param {number} size - 그리드 해상도 (예: 128, 256)
   */
  setGridSize(size) {
    if (this.gridSize === size) return;
    this.gridSize = size;
    this.TOTAL_VOXELS = size * size;
    // 그리드 변경 시 씬 재생성
    this.createVoxelGrid();
  }

  /**
   * 복셀의 회전값을 설정합니다.
   * @param {number} degrees - 회전 각도 (-180 ~ 180)
   */
  setVoxelRotation(degrees) {
    if (this.instancedMesh) {
      // Y축 기준으로 회전 (라디안 변환)
      this.instancedMesh.rotation.y = (degrees * Math.PI) / 180;
    }
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
