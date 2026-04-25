/**
 * Web AI Voxelizer 메인 애플리케이션
 */

import { sceneManager } from './scene.js';
import { aiManager } from './ai.js';
import { uiManager } from './ui.js';
import {
  resizeImage,
  canvasToColorArray,
  fileToImage,
  isValidImageFile,
  loadImageFromUrl
} from './utils.js';

class App {
  constructor() {
    this.isInitialized = false;
    this.currentImage = null;
    this.webcamVideo = null;
    this.webcamStream = null;
    this.isWebcamActive = false;

    // Inference Lock 관련
    this.isProcessing = false; // 추론 중 플래그
    this.consecutiveErrors = 0; // 연속 에러 카운트 (무한 루프 방지)
    this.aiResolution = 256; // AI 연산 해상도 (기본 256)
    this.voxelGridSize = 256; // 복셀 그리드 해상도 (기본 256)

    // 프레임 처리 최적화를 위한 캔버스 (재사용)
    this.processingCanvas = null;
    this.processingCtx = null;
    this.targetCanvasSize = 256; // AI 모델 입력 크기

    // FPS 카운팅
    this.inferenceFps = 0;
    this.inferenceFrameCount = 0;
    this.inferenceFpsUpdateTime = 0;
  }

  /**
   * 애플리케이션을 초기화합니다.
   */
  async init() {
    if (this.isInitialized) return;

    // UI 초기화
    uiManager.init();

    // Three.js 씬 초기화
    const canvas = document.getElementById('voxel-canvas');
    sceneManager.initScene(canvas);

    // 이벤트 리스너 설정
    this.setupEventListeners();

    // AI 모델 로드
    await this.loadAIModel();

    this.isInitialized = true;
  }

  /**
   * 이벤트 리스너를 설정합니다.
   */
  setupEventListeners() {
    // 깊이 슬라이더
    uiManager.onDepthSliderChange((value) => {
      sceneManager.setDepthScale(value);
    });

    // 파일 업로드 (원래 주석이지만 해상도 슬라이더 이벤트임)
    uiManager.onResSliderChange((value) => {
      this.aiResolution = value;
      // PIP UI에 해상도 업데이트
      const stats = document.querySelector('.pip-stats');
      if (stats) {
        stats.innerHTML = `<span>W ${value}</span><span>H ${value}</span><span id="fps-counter">0 FPS</span>`;
        // fpsCounter 엘리먼트 참조 갱신
        uiManager.fpsCounter = document.getElementById('fps-counter');
      }
    });

    uiManager.onGridSliderChange((value) => {
      this.voxelGridSize = value;
      sceneManager.setGridSize(value);
    });

    uiManager.onColorSliderChange((hue) => {
      sceneManager.setVoxelHue(hue);
    });

    uiManager.onRotationSliderChange((degrees) => {
      sceneManager.setVoxelRotation(degrees);
    });

    // GPU 토글 핸들러
    uiManager.onGpuToggleChange(async (useGPU) => {
      const isSupported = await aiManager.checkWebGPUSupport();
      
      if (useGPU && !isSupported) {
        uiManager.showError('WebGPU is not supported on this browser/hardware.');
        uiManager.gpuToggle.checked = false;
        return;
      }

      // 1. 웹캠/프로세싱 중단
      const wasWebcamActive = this.isWebcamActive;
      if (wasWebcamActive) {
        await this.stopWebcam();
      }

      // 2. AI 장치 설정 및 재로드
      aiManager.setDevice(useGPU);
      await this.loadAIModel();

      // 3. 실제 로드된 장치 확인 (WebGPU 요청 시 체크)
      if (useGPU && aiManager.getActualDevice() !== 'webgpu') {
        uiManager.showError('WebGPU 가속 활성화에 실패하여 WASM(CPU) 모드로 전환되었습니다.');
        uiManager.gpuToggle.checked = false;
        aiManager.setDevice(false);
      }

      // 4. 웹캠 재시작 (필요한 경우)
      if (wasWebcamActive) {
        await this.startWebcam();
      }
    });

    uiManager.onFileInputChange(async (file) => {
      // 웹캠이 실행 중이면 중단
      if (this.isWebcamActive) {
        await this.stopWebcam();
      }
      await this.handleImageUpload(file);
    });

    // 샘플 버튼
    uiManager.onSampleButtonClick(async () => {
      // 웹캠이 실행 중이면 중단
      if (this.isWebcamActive) {
        await this.stopWebcam();
      }
      await this.loadSampleImage();
    });

    // 웹캠 토글 버튼
    uiManager.onWebcamToggle(async () => {
      await this.toggleWebcam();
    });
  }

  /**
   * AI 모델을 로드합니다.
   */
  async loadAIModel() {
    uiManager.showLoading('AI 모델 다운로드 중...');

    try {
      await aiManager.loadModel((progress) => {
        uiManager.updateLoadingProgress(progress);
      });

      uiManager.hideLoading();
    } catch (error) {
      uiManager.hideLoading();
      uiManager.showError(error.message);
    }
  }

  /**
   * 이미지 업로드를 처리합니다.
   * @param {File} file - 업로드된 파일
   */
  async handleImageUpload(file) {
    // 파일 유효성 검사
    if (!isValidImageFile(file)) {
      uiManager.showError('지원하지 않는 파일 형식입니다. JPEG 또는 PNG 이미지를 업로드해주세요.');
      uiManager.resetFileInput();
      return;
    }

    uiManager.showLoading('이미지 로딩 중...');

    try {
      // 파일을 이미지로 변환
      const image = await fileToImage(file);
      this.currentImage = image;

      // 이미지 처리
      await this.processImage(image);

      uiManager.hideLoading();
    } catch (error) {
      uiManager.hideLoading();
      uiManager.showError(`이미지 로딩 실패: ${error.message}`);
      uiManager.resetFileInput();
    }
  }

  /**
   * 샘플 이미지를 로드합니다.
   */
  async loadSampleImage() {
    uiManager.showLoading('샘플 이미지 로딩 중...');

    try {
      // 샘플 이미지 URL (Picsum 사용)
      const sampleUrl = 'https://picsum.photos/512/512';
      const image = await loadImageFromUrl(sampleUrl);
      this.currentImage = image;

      await this.processImage(image);

      uiManager.hideLoading();
    } catch (error) {
      uiManager.hideLoading();
      uiManager.showError(`샘플 이미지 로딩 실패: ${error.message}`);
    }
  }

  /**
   * 이미지를 처리하여 3D 복셀로 변환합니다.
   * @param {HTMLImageElement} image - 처리할 이미지
   */
  async processImage(image) {
    uiManager.showLoading('깊이 분석 중...');

    try {
      // 이미지를 256x256으로 리사이징 (AI 해상도에 맞춤, 여기서는 단순 처리)
      const resizedCanvas = resizeImage(image, 256, 256);

      // AI 깊이 추론
      const depthData = await aiManager.estimateDepth(resizedCanvas, this.aiResolution, this.voxelGridSize);

      // 복셀 데이터 업데이트
      sceneManager.createVoxelGrid();
      sceneManager.updateVoxelData(null, depthData);

      // 슬라이더 초기화
      uiManager.setDepthSliderValue(1.0);
      sceneManager.setDepthScale(1.0);

      uiManager.hideLoading();
    } catch (error) {
      uiManager.hideLoading();
      uiManager.showError(`이미지 처리 실패: ${error.message}`);
    }
  }

  /**
   * 웹캠을 토글합니다.
   */
  async toggleWebcam() {
    if (this.isWebcamActive) {
      await this.stopWebcam();
    } else {
      await this.startWebcam();
    }
  }

  /**
   * 웹캠을 시작합니다.
   */
  async startWebcam() {
    try {
      // 웹캠 비디오 엘리먼트 참조
      if (!this.webcamVideo) {
        this.webcamVideo = document.getElementById('webcam-video');
      }

      // 미디어 스트림 요청 (낮은 해상도로 요청하여 GPU 부하 감소)
      this.webcamStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },  // 낮은 해상도 요청
          height: { ideal: 240 },
          facingMode: 'user'
        }
      });

      // 비디오 엘리먼트에 스트림 연결
      this.webcamVideo.srcObject = this.webcamStream;
      await new Promise((resolve) => {
        this.webcamVideo.onloadedmetadata = () => {
          this.webcamVideo.play().then(resolve).catch(resolve);
        };
      });

      this.isWebcamActive = true;
      this.isProcessing = false;
      this.consecutiveErrors = 0;  // 에러 카운트 초기화

      uiManager.setWebcamButtonActive(true);
      uiManager.showPip(true);

      // 복셀 그리드 생성
      sceneManager.createVoxelGrid();

      // 처리용 캔버스 초기화 (재사용을 위해 미리 생성)
      this.processingCanvas = document.createElement('canvas');
      this.processingCanvas.width = this.targetCanvasSize;
      this.processingCanvas.height = this.targetCanvasSize;
      this.processingCtx = this.processingCanvas.getContext('2d', {
        willReadFrequently: true  // 성능 최적화
      });

      // FPS 카운터 초기화
      this.inferenceFrameCount = 0;
      this.inferenceFpsUpdateTime = performance.now();

      // 실시간 처리 시작 (분리된 루프)
      this.startRenderLoop();
      this.startInferenceLoop();

    } catch (error) {
      uiManager.showError(`웹캠 시작 실패: ${error.message}`);
      console.error('Webcam error:', error);
    }
  }

  /**
   * 웹캠을 중단합니다.
   */
  async stopWebcam() {
    this.isWebcamActive = false;
    this.consecutiveErrors = 0;

    // 미디어 스트림 정지
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach(track => track.stop());
      this.webcamStream = null;
    }

    // 비디오 엘리먼트 초기화
    if (this.webcamVideo) {
      this.webcamVideo.srcObject = null;
    }

    // 캔버스 정리
    if (this.processingCanvas) {
      this.processingCanvas = null;
      this.processingCtx = null;
    }

    uiManager.setWebcamButtonActive(false);
    uiManager.showPip(false);
  }

  /**
   * Three.js 렌더링 루프 (60fps로 독립 실행)
   * GPU 과부하 방지를 위해 AI 추론과 분리
   */
  startRenderLoop() {
    if (!this.isWebcamActive) return;

    // Three.js는 자체적으로 animate() 루프를 가지고 있으므로
    // 별도의 렌더링 루프가 필요 없습니다.
    // sceneManager.animate()가 이미 60fps로 실행 중입니다.
  }

  /**
   * AI 추론 루프 (10-15fps로 실행, Inference Lock 적용)
   * GPU 과부하 방지를 위해 Three.js 렌더링과 분리
   */
  async startInferenceLoop() {
    // 웹캠 비활성화 시 루프 중단
    if (!this.isWebcamActive) return;

    // 연속 에러 발생 시 루프 중단 방지
    if (this.consecutiveErrors > 5) {
      console.error('Too many consecutive errors, stopping inference loop');
      this.stopWebcam();
      uiManager.showError('연속 에러 발생으로 웹캠이 중단되었습니다.');
      return;
    }

    // Inference Lock: 이미 추론 중이면 스킵
    if (this.isProcessing) {
      // 다음 프레임을 요청하지 않고 종료 (과부하 방지)
      return;
    }

    this.isProcessing = true;

    try {
      // FPS 계산
      this.inferenceFrameCount++;
      const currentTime = performance.now();
      if (currentTime - this.inferenceFpsUpdateTime >= 1000) {
        this.inferenceFps = this.inferenceFrameCount;
        this.inferenceFrameCount = 0;
        this.inferenceFpsUpdateTime = currentTime;
        uiManager.updateFpsCounter(this.inferenceFps);
      }

      // 1. 프레임 캡처 (즉시 256x256으로 리사이징)
      const frameCanvas = await this.captureResizedFrame();

      // 2. AI 깊이 추론 (가장 무거운 연산, 해상도 파라미터 전달)
      const depthData = await aiManager.estimateDepth(frameCanvas, this.aiResolution, this.voxelGridSize);

      // 3. 복셀 데이터 업데이트 (Three.js)
      sceneManager.updateVoxelData(null, depthData);

      // 5. PIP 깊이 맵 업데이트
      this.updatePipDepthMap(depthData);
      
      // 6. PIP 웹캠 원본 업데이트
      uiManager.updatePipWebcam(frameCanvas);

      // 에러 카운트 리셋 (성공 시)
      this.consecutiveErrors = 0;

    } catch (error) {
      console.error('Inference error:', error);
      this.consecutiveErrors = (this.consecutiveErrors || 0) + 1;

      // 에러 발생 시 UI에 알림 (3번 연속 에러 시)
      if (this.consecutiveErrors === 3) {
        uiManager.showError(`추론 오류 발생 (${this.consecutiveErrors}회): ${error.message}`);
      }
    } finally {
      // Inference Lock 해제
      this.isProcessing = false;
    }

    // 다음 추론 요청
    if (this.isWebcamActive) {
      requestAnimationFrame(() => this.startInferenceLoop());
    }
  }

  /**
   * 웹캠 프레임을 캡처하고 즉시 256x256으로 리사이징합니다.
   * GPU 메모리 과부하 방지를 위해 원본 해상도로 처리하지 않습니다.
   * @returns {Promise<HTMLCanvasElement>} 256x256 크기의 캔버스
   */
  async captureResizedFrame() {
    if (!this.webcamVideo || !this.processingCanvas || !this.processingCtx) {
      throw new Error('Webcam or processing canvas not initialized');
    }

    const videoWidth = this.webcamVideo.videoWidth;
    const videoHeight = this.webcamVideo.videoHeight;

    // 중앙 크롭 영역 계산
    const size = Math.min(videoWidth, videoHeight);
    const offsetX = (videoWidth - size) / 2;
    const offsetY = (videoHeight - size) / 2;

    // 즉시 256x256으로 리사이징 (한 단계로 처리)
    // GPU 부하를 줄이기 위해 중간 캔버스를 사용하지 않음
    this.processingCtx.drawImage(
      this.webcamVideo,
      offsetX, offsetY, size, size,  // 소스: 중앙 크롭
      0, 0, this.targetCanvasSize, this.targetCanvasSize  // 대상: 256x256
    );

    return this.processingCanvas;
  }

  /**
   * PIP 깊이 맵을 업데이트합니다.
   * @param {Float32Array} depthData - 깊이 데이터
   */
  updatePipDepthMap(depthData) {
    const pipCanvas = uiManager.getPipCanvas();
    const pipCtx = uiManager.getPipContext();

    if (!pipCanvas || !pipCtx) return;

    const width = pipCanvas.width;
    const height = pipCanvas.height;

    // ImageData 생성
    const imageData = pipCtx.createImageData(width, height);
    const data = imageData.data;

    // 깊이 데이터를 그레이스케일로 변환 (정확한 2D 좌표 변환 사용)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // PIP 캔버스 좌표를 gridSize x gridSize 좌표로 변환
        const srcX = Math.floor((x / width) * this.voxelGridSize);
        const srcY = Math.floor((y / height) * this.voxelGridSize);
        const depthIndex = srcY * this.voxelGridSize + srcX;
        
        const i = y * width + x;
        const depthValue = Math.floor(depthData[depthIndex] * 255);

        data[i * 4] = depthValue;     // R
        data[i * 4 + 1] = depthValue; // G
        data[i * 4 + 2] = depthValue; // B
        data[i * 4 + 3] = 255;        // A
      }
    }

    pipCtx.putImageData(imageData, 0, 0);
  }
}

// 앱 실행
const app = new App();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
