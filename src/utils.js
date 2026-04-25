/**
 * 유틸리티 함수 모음
 * 이미지 리사이징, WebGPU 지원 확인 등
 */

/**
 * 이미지를 지정된 크기로 리사이징합니다.
 * @param {HTMLImageElement} imageElement - 리사이징할 이미지 엘리먼트
 * @param {number} width - 목표 너비
 * @param {number} height - 목표 높이
 * @returns {HTMLCanvasElement} - 리사이징된 이미지가 그려진 캔버스
 */
export function resizeImage(imageElement, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageElement, 0, 0, width, height);

  return canvas;
}

/**
 * 이미지 엘리먼트에서 RGB 픽셀 데이터를 추출합니다.
 * @param {HTMLImageElement|HTMLCanvasElement} imageElement - 이미지 소스
 * @returns {Uint8Array} - RGB 픽셀 데이터 (R, G, B 순서)
 */
export function imageToRGBArray(imageElement) {
  const canvas = imageElement instanceof HTMLCanvasElement
    ? imageElement
    : resizeImage(imageElement, imageElement.width, imageElement.height);

  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // RGBA를 RGB로 변환 (255 값 정규화)
  const rgbArray = new Uint8Array((imageData.data.length / 4) * 3);
  let rgbIndex = 0;

  for (let i = 0; i < imageData.data.length; i += 4) {
    rgbArray[rgbIndex++] = imageData.data[i];     // R
    rgbArray[rgbIndex++] = imageData.data[i + 1]; // G
    rgbArray[rgbIndex++] = imageData.data[i + 2]; // B
  }

  return rgbArray;
}

/**
 * 깊이 배열을 Three.js InstancedMesh 형식으로 변환합니다.
 * @param {number[]} depthArray - 깊이 값 배열 (0-255)
 * @param {number} gridSize - 그리드 크기 (기본값: 256)
 * @returns {Float32Array} - 인스턴스 위치 배열
 */
export function depthToPositionArray(depthArray, gridSize = 256) {
  const positions = new Float32Array(depthArray.length * 3);

  for (let i = 0; i < depthArray.length; i++) {
    const x = (i % gridSize) - gridSize / 2;
    const y = Math.floor(i / gridSize) - gridSize / 2;
    const z = depthArray[i] / 255; // 0-1 범위로 정규화

    positions[i * 3] = x;
    positions[i * 3 + 1] = -y; // Y축 반전
    positions[i * 3 + 2] = z;
  }

  return positions;
}

/**
 * WebGPU 지원 여부를 확인합니다.
 * @returns {Promise<boolean>} - WebGPU 지원 여부
 */
export async function detectWebGPUSupport() {
  if (!navigator.gpu) {
    return false;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

/**
 * File 객체를 Image 엘리먼트로 변환합니다.
 * @param {File} file - 이미지 파일
 * @returns {Promise<HTMLImageElement>} - 로드된 이미지 엘리먼트
 */
export function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 유효한 이미지 파일 형식인지 확인합니다.
 * @param {File} file - 확인할 파일
 * @returns {boolean} - 유효 여부
 */
export function isValidImageFile(file) {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  return validTypes.includes(file.type);
}

/**
 * URL에서 이미지를 로드합니다.
 * @param {string} url - 이미지 URL
 * @returns {Promise<HTMLImageElement>} - 로드된 이미지 엘리먼트
 */
export function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * 캔버스에서 RGB 데이터를 추출하여 Float32Array로 변환합니다.
 * @param {HTMLCanvasElement} canvas - 소스 캔버스
 * @returns {Float32Array} - RGB 색상 데이터 (0-1 범위)
 */
export function canvasToColorArray(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const numPixels = canvas.width * canvas.height;
  const colorArray = new Float32Array(numPixels * 3);

  for (let i = 0; i < numPixels; i++) {
    colorArray[i * 3] = imageData.data[i * 4] / 255;         // R
    colorArray[i * 3 + 1] = imageData.data[i * 4 + 1] / 255; // G
    colorArray[i * 3 + 2] = imageData.data[i * 4 + 2] / 255; // B
  }

  return colorArray;
}
