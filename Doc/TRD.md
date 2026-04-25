# Technical Requirements Document (TRD)

## 1. 기술 스택 (Tech Stack)
- **Core:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Build Tool:** Vite (빠른 HMR 및 모듈 번들링)
- **AI 추론 엔진:** `@xenova/transformers` (v3 이상, WebGPU 백엔드 활용)
- **AI 모델:** `onnx-community/depth-anything-v2-small`
- **3D 렌더링 엔진:** `Three.js`

## 2. 시스템 아키텍처 및 구현 지침
### 2.1 AI 모델 파이프라인
- 페이지 로드 시 백그라운드에서 AI 모델을 비동기로 로드(프리패치).
- 브라우저 WebGPU 지원 여부를 체크하고, 가능한 경우 WebGPU 백엔드를 우선 적용하여 추론 속도 극대화 (`env.backends.onnx.wasm.numThreads` 등 최적화 설정 포함).

### 2.2 3D 렌더링 파이프라인 (필수 준수 사항)
- **InstancedMesh 사용:** 65,536개의 큐브를 개별 `Mesh`로 생성하는 것을 엄격히 금지. 단일 `THREE.InstancedMesh`를 사용하여 드로우 콜(Draw Call)을 1회로 제한.
- **Geometry & Material:** `THREE.BoxGeometry(1,1,1)` 및 조명 연산 비용이 없는 `THREE.MeshBasicMaterial` 사용.
- **Shader 최적화:** - 각 복셀의 고유 뎁스 값은 `InstancedBufferAttribute`를 통해 GPU 메모리에 한 번만 업로드 (`aDepth`).
  - 슬라이더 조작 값은 `uniform` 변수(`uDepthScale`)로 전달.
  - `material.onBeforeCompile`을 사용하여 Vertex Shader를 수정, `transformed.z += aDepth * uDepthScale;` 로직을 주입.

## 3. 예외 처리 (Error Handling)
- WebGPU/WebGL 미지원 브라우저 접속 시 사용자에게 안내 메시지 출력.
- 이미지 파일 크기 및 포맷 검증 (JPEG, PNG 지원).
- 모델 다운로드 및 로딩 중 네트워크 지연 시 UI/UX 대응 (스피너 등).