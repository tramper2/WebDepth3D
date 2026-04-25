/**
 * Transformers.js 기반 AI 깊이 추론 모듈
 * Depth Anything V2 + WebGPU 백엔드
 */

import { pipeline, env, RawImage } from '@huggingface/transformers';

// Transformers.js 환경 설정
env.allowLocalModels = false;
env.useBrowserCache = true;

// 백엔드 설정
env.backends.onnx.wasm.numThreads = 1;

// WebGPU 백엔드 사용 시도
try {
  // Transformers.js에서 WebGPU 사용 설정
  // 브라우저가 WebGPU를 지원하면 자동으로 사용됨
  if (typeof navigator !== 'undefined' && navigator.gpu) {
    console.log('WebGPU is available in this browser');
  }
} catch (e) {
  console.log('WebGPU detection failed:', e);
}

class AIManager {
  constructor() {
    this.depthEstimator = null;
    this.isModelLoaded = false;
    this.isLoading = false;
    this.loadProgress = 0;
    this.onProgressCallback = null;
    this.useWebGPU = false;
  }

  /**
   * WebGPU 사용 가능 여부를 확인합니다.
   * @returns {Promise<boolean>}
   */
  async checkWebGPUSupport() {
    if (typeof navigator !== 'undefined' && navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) return true;
      } catch (e) {
        console.warn('WebGPU adapter request failed:', e);
      }
    }
    return false;
  }

  /**
   * 깊이 추정 모델을 로드합니다.
   * @param {Function} onProgress - 로딩 진행률 콜백
   * @returns {Promise<void>}
   */
  async loadModel(onProgress) {
    if (this.isModelLoaded) return;
    if (this.isLoading) return;

    this.isLoading = true;
    this.onProgressCallback = onProgress;

    // 기존 모델 정리 (메모리 해제)
    if (this.depthEstimator) {
      try {
        // Transformers.js v3+ 에서는 dispose() 등이 있을 수 있지만 
        // 여기서는 단순 참조 제거 및 가비지 컬렉션 유도
        this.depthEstimator = null;
      } catch (e) {
        console.warn('Error disposing old estimator:', e);
      }
    }

    try {
      // Depth Anything V2 Small 모델 로드 (Edge 보존력 우수)
      // WebGPU에서는 양자화(q8) 연산이 정상적으로 출력되지 않는 버그가 있을 수 있으므로 분기 처리
      const modelOptions = {
        device: this.useWebGPU ? 'webgpu' : 'wasm',
        dtype: this.useWebGPU ? 'fp16' : 'q8', // WebGPU는 fp16 사용, WASM은 q8(양자화) 사용
        progress_callback: (progress) => {
          if (progress.status === 'downloading' || progress.status === 'loading') {
            this.loadProgress = progress.progress || 0;
            if (this.onProgressCallback) {
              this.onProgressCallback(this.loadProgress);
            }
          }
        }
      };

      console.log(`○ Attempting to load model on device: ${modelOptions.device} (${modelOptions.dtype})`);

      this.depthEstimator = await pipeline(
        'depth-estimation',
        'onnx-community/depth-anything-v2-small',
        modelOptions
      );

      // 실제 할당된 장치 확인 (Transformers.js 내부 정보 확인)
      const actualDevice = this.depthEstimator.model.device || 'unknown';
      console.log(`✓ Depth Anything V2 Small model loaded on: ${actualDevice}`);
      
      if (modelOptions.device === 'webgpu' && actualDevice !== 'webgpu') {
        console.warn('⚠️ WebGPU requested but fallback to WASM occurred.');
      }

      this.isModelLoaded = true;
      this.isLoading = false;

      if (this.onProgressCallback) {
        this.onProgressCallback(100);
      }
    } catch (error) {
      this.isLoading = false;
      console.error('Model loading error:', error);
      throw new Error(`모델 로딩 실패: ${error.message}`);
    }
  }

  /**
   * 캔버스 이미지에서 깊이 맵을 추론합니다.
   * @param {HTMLCanvasElement} canvasElement
   * @param {number} resolution - 추론 시 사용할 해상도 (AI 연산 속도 조절용)
   * @returns {Promise<Float32Array>} 깊이 데이터 (0~1 범위, 256x256 해상도로 정규화됨)
   */
  async estimateDepth(canvasElement, resolution = 256) {
    if (!this.depthEstimator) {
      throw new Error('Depth estimator not loaded');
    }

    try {
      // 캔버스에서 이미지 데이터 추출
      const image = await RawImage.fromURL(canvasElement.toDataURL());

      // 깊이 추론 실행 (해상도 동적 적용으로 속도 조절)
      const result = await this.depthEstimator(image, { size: { width: resolution, height: resolution } });

      // result.depth는 RawImage 객체: { data: Uint8Array, width, height, channels }
      const depthMap = result.depth;
      const channels = depthMap.channels || 1; // 기본적으로 1채널이라고 가정

      // 씬 매니저가 기대하는 정확한 256x256 (65536) 크기로 고정 샘플링
      const expectedSize = 256;
      const depthArray = new Float32Array(expectedSize * expectedSize);

      for (let y = 0; y < expectedSize; y++) {
        for (let x = 0; x < expectedSize; x++) {
          const srcX = Math.floor((x / expectedSize) * depthMap.width);
          const srcY = Math.floor((y / expectedSize) * depthMap.height);
          const srcIndex = srcY * depthMap.width + srcX;
          
          const destIndex = y * expectedSize + x;
          depthArray[destIndex] = depthMap.data[srcIndex * channels] / 255.0;
        }
      }

      return depthArray;
    } catch (error) {
      console.error('Depth estimation error:', error);
      throw new Error(`깊이 추정 실패: ${error.message}`);
    }
  }

  /**
   * 모델이 로드되었는지 확인합니다.
   * @returns {boolean}
   */
  isModelReady() {
    return this.isModelLoaded;
  }

  /**
   * 모델 로딩 중인지 확인합니다.
   * @returns {boolean}
   */
  isModelLoading() {
    return this.isLoading;
  }

  /**
   * 실제로 모델이 구동 중인 장치 정보를 반환합니다.
   * @returns {string} 'webgpu', 'wasm' 등
   */
  getActualDevice() {
    if (!this.depthEstimator) return 'none';
    return this.depthEstimator.model.device || 'unknown';
  }

  /**
   * 사용할 연산 장치를 설정합니다.
   * @param {boolean} useGPU - true면 WebGPU, false면 WASM
   */
  setDevice(useGPU) {
    this.useWebGPU = useGPU;
    this.isModelLoaded = false; // 장치가 바뀌었으므로 다시 로드 필요
  }

  /**
   * 현재 로딩 진행률을 반환합니다.
   * @returns {number}
   */
  getLoadProgress() {
    return this.loadProgress;
  }
}

// 싱글톤 인스턴스
export const aiManager = new AIManager();
