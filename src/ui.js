/**
 * UI 컴포넌트 및 상태 관리
 */

class UIManager {
  constructor() {
    this.loadingOverlay = null;
    this.loadingText = null;
    this.loadingProgress = null;
    this.errorOverlay = null;
    this.errorText = null;
    this.depthSlider = null;
    this.depthValue = null;
    this.resSlider = null;
    this.resValue = null;
    this.colorSlider = null;
    this.colorValue = null;
    this.fileInput = null;
    this.sampleBtn = null;
    this.webcamToggleBtn = null;
    this.webcamBtnText = null;
    this.pipContainer = null;
    this.pipCanvas = null;
    this.pipCtx = null;
    this.webcamPipCanvas = null;
    this.webcamPipCtx = null;
    this.fpsCounter = null;
    this.isInitialized = false;
  }

  /**
   * UI를 초기화합니다.
   */
  init() {
    if (this.isInitialized) return;

    // 로딩 오버레이
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.loadingText = document.getElementById('loading-text');
    this.loadingProgress = document.getElementById('loading-progress');

    // 에러 오버레이
    this.errorOverlay = document.getElementById('error-overlay');
    this.errorText = document.getElementById('error-text');
    const errorClose = document.getElementById('error-close');

    errorClose.addEventListener('click', () => {
      this.hideError();
    });

    // 컨트롤
    this.depthSlider = document.getElementById('depth-slider');
    this.depthValue = document.getElementById('depth-value');
    
    this.resSlider = document.getElementById('res-slider');
    this.resValue = document.getElementById('res-value');

    this.colorSlider = document.getElementById('color-slider');
    this.colorValue = document.getElementById('color-value');

    this.fileInput = document.getElementById('file-input');
    this.sampleBtn = document.getElementById('sample-btn');
    this.webcamToggleBtn = document.getElementById('webcam-toggle-btn');
    this.webcamBtnText = document.getElementById('webcam-btn-text');

    // PIP 컴포넌트
    this.pipContainer = document.getElementById('pip-container');
    this.pipCanvas = document.getElementById('depth-pip');
    this.pipCtx = this.pipCanvas?.getContext('2d');
    
    this.webcamPipCanvas = document.getElementById('webcam-pip');
    this.webcamPipCtx = this.webcamPipCanvas?.getContext('2d');
    
    this.fpsCounter = document.getElementById('fps-counter');

    this.isInitialized = true;
  }

  /**
   * 로딩 오버레이를 표시합니다.
   * @param {string} message - 로딩 메시지
   */
  showLoading(message = '로딩 중...') {
    if (this.loadingText) {
      this.loadingText.textContent = message;
    }
    if (this.loadingProgress) {
      this.loadingProgress.textContent = '0%';
    }
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.remove('hidden');
    }
  }

  /**
   * 로딩 오버레이를 숨깁니다.
   */
  hideLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.add('hidden');
    }
  }

  /**
   * 로딩 진행률을 업데이트합니다.
   * @param {number} progress - 진행률 (0-100)
   */
  updateLoadingProgress(progress) {
    if (this.loadingProgress) {
      this.loadingProgress.textContent = `${Math.round(progress)}%`;
    }
  }

  /**
   * 에러 메시지를 표시합니다.
   * @param {string} message - 에러 메시지
   */
  showError(message) {
    if (this.errorText) {
      this.errorText.textContent = message;
    }
    if (this.errorOverlay) {
      this.errorOverlay.classList.remove('hidden');
    }
  }

  /**
   * 에러 오버레이를 숨깁니다.
   */
  hideError() {
    if (this.errorOverlay) {
      this.errorOverlay.classList.add('hidden');
    }
  }

  /**
   * 깊이 슬라이더 값을 설정합니다.
   * @param {number} value - 슬라이더 값
   */
  setDepthSliderValue(value) {
    if (this.depthSlider) {
      this.depthSlider.value = value;
    }
    if (this.depthValue) {
      this.depthValue.textContent = value.toFixed(1);
    }
  }

  /**
   * 깊이 슬라이더 변경 이벤트 리스너를 추가합니다.
   * @param {Function} callback - 변경 시 호출할 함수
   */
  onDepthSliderChange(callback) {
    if (this.depthSlider) {
      this.depthSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (this.depthValue) {
          this.depthValue.textContent = value.toFixed(1);
        }
        callback(value);
      });
    }
  }

  /**
   * 해상도 슬라이더 변경 이벤트 리스너를 추가합니다.
   * @param {Function} callback - 변경 시 호출할 함수
   */
  onResSliderChange(callback) {
    if (this.resSlider) {
      this.resSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (this.resValue) {
          this.resValue.textContent = value;
        }
        callback(value);
      });
    }
  }

  /**
   * 컬러 슬라이더 변경 이벤트 리스너를 추가합니다.
   * @param {Function} callback - 변경 시 호출할 함수
   */
  onColorSliderChange(callback) {
    if (this.colorSlider) {
      this.colorSlider.addEventListener('input', (e) => {
        const hue = parseInt(e.target.value);
        if (this.colorValue) {
          let colorName = "Color";
          if (hue < 30 || hue >= 330) colorName = "Red";
          else if (hue < 90) colorName = "Yellow";
          else if (hue < 160) colorName = "Green";
          else if (hue < 200) colorName = "Cyan";
          else if (hue < 260) colorName = "Blue";
          else colorName = "Purple";
          this.colorValue.textContent = colorName;
        }
        callback(hue);
      });
    }
  }

  /**
   * 파일 입력 변경 이벤트 리스너를 추가합니다.
   * @param {Function} callback - 파일 선택 시 호출할 함수
   */
  onFileInputChange(callback) {
    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          callback(file);
        }
      });
    }
  }

  /**
   * 샘플 버튼 클릭 이벤트 리스너를 추가합니다.
   * @param {Function} callback - 클릭 시 호출할 함수
   */
  onSampleButtonClick(callback) {
    if (this.sampleBtn) {
      this.sampleBtn.addEventListener('click', callback);
    }
  }

  /**
   * 파일 입력을 초기화합니다.
   */
  resetFileInput() {
    if (this.fileInput) {
      this.fileInput.value = '';
    }
  }

  /**
   * 웹캠 토글 버튼 클릭 이벤트 리스너를 추가합니다.
   * @param {Function} callback - 클릭 시 호출할 함수
   */
  onWebcamToggle(callback) {
    if (this.webcamToggleBtn) {
      this.webcamToggleBtn.addEventListener('click', callback);
    }
  }

  /**
   * 웹캠 버튼 상태를 설정합니다.
   * @param {boolean} isActive - 활성화 상태
   */
  setWebcamButtonActive(isActive) {
    if (this.webcamToggleBtn) {
      if (isActive) {
        this.webcamToggleBtn.classList.add('active');
        if (this.webcamBtnText) {
          this.webcamBtnText.textContent = 'Stop Webcam';
        }
      } else {
        this.webcamToggleBtn.classList.remove('active');
        if (this.webcamBtnText) {
          this.webcamBtnText.textContent = 'Start Webcam';
        }
      }
    }
  }

  /**
   * PIP 컨테이너를 표시하거나 숨깁니다.
   * @param {boolean} visible - 표시 여부
   */
  showPip(visible) {
    if (this.pipContainer) {
      if (visible) {
        this.pipContainer.classList.remove('hidden');
      } else {
        this.pipContainer.classList.add('hidden');
      }
    }
  }

  /**
   * PIP 캔버스에 깊이 맵을 그립니다.
   * @param {ImageData|HTMLCanvasElement|HTMLImageElement} depthData - 깊이 데이터
   */
  updatePipDepthMap(depthData) {
    if (!this.pipCanvas || !this.pipCtx) return;

    // 캔버스 크기에 맞게 조정
    const width = this.pipCanvas.width;
    const height = this.pipCanvas.height;

    if (depthData instanceof ImageData) {
      this.pipCtx.putImageData(depthData, 0, 0);
    } else if (depthData instanceof HTMLCanvasElement) {
      this.pipCtx.drawImage(depthData, 0, 0, width, height);
    } else if (depthData instanceof HTMLImageElement || depthData instanceof ImageBitmap) {
      this.pipCtx.drawImage(depthData, 0, 0, width, height);
    }
  }

  /**
   * PIP 캔버스에 웹캠 원본을 그립니다.
   * @param {HTMLCanvasElement|HTMLVideoElement} videoData - 비디오 데이터
   */
  updatePipWebcam(videoData) {
    if (!this.webcamPipCanvas || !this.webcamPipCtx) return;
    
    const width = this.webcamPipCanvas.width;
    const height = this.webcamPipCanvas.height;
    
    this.webcamPipCtx.drawImage(videoData, 0, 0, width, height);
  }

  /**
   * FPS 카운터를 업데이트합니다.
   * @param {number} fps - FPS 값
   */
  updateFpsCounter(fps) {
    if (this.fpsCounter) {
      this.fpsCounter.textContent = `${fps} FPS`;
    }
  }

  /**
   * PIP 캔버스 컨텍스트를 반환합니다.
   * @returns {CanvasRenderingContext2D|null}
   */
  getPipContext() {
    return this.pipCtx;
  }

  /**
   * PIP 캔버스를 반환합니다.
   * @returns {HTMLCanvasElement|null}
   */
  getPipCanvas() {
    return this.pipCanvas;
  }
}

// 싱글톤 인스턴스
export const uiManager = new UIManager();
