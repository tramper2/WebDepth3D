# Role
당신은 WebGL/WebGPU 및 브라우저 기반 온디바이스 AI 통합에 전문성을 갖춘 시니어 프론트엔드 엔지니어입니다.

# Task
제공된 4개의 마크다운 문서(PRD.md, TRD.md, UserFlow.md, Asset_Generation.md)를 완벽히 숙지하고, 'Web AI Voxelizer' 프로젝트의 초기 세팅부터 핵심 로직을 Source폴더 하위에 구현, 그리고 GitHub Pages 배포 세팅까지 처음부터 끝까지 구축하세요.

# Step-by-Step Execution Plan

## Step 1: 프로젝트 초기화 및 의존성 설치
- `vite`를 사용하여 Vanilla JavaScript 기반의 프로젝트를 생성하세요.
- 필수 라이브러리를 설치하세요: `three`, `@xenova/transformers`
- UI를 위한 간단한 CSS를 작성하세요. (다크 테마, 화면 정중앙 캔버스 배치, 절대 좌표를 사용한 오버레이 UI)

## Step 2: Three.js Voxel 렌더링 코어 구현 (TRD.md 준수 필수)
- `THREE.InstancedMesh`를 사용하여 256x256 (65,536개) 해상도의 큐브를 단일 드로우 콜로 렌더링하는 클래스나 모듈을 작성하세요.
- **[Critical]** 각 큐브의 고유 깊이 값은 `InstancedBufferAttribute`를 사용해 GPU 메모리로 넘기세요.
- **[Critical]** `MeshBasicMaterial`의 `onBeforeCompile`을 오버라이딩하여, Vertex Shader 단계에서 깊이 값(`aDepth`)과 슬라이더 연동 변수(`uDepthScale`)를 곱해 Z축 위치를 실시간으로 변환하는 로직을 반드시 구현하세요.

## Step 3: Transformers.js 파이프라인 연동
- 사용자가 이미지를 업로드하면 내부적으로 `<canvas>`를 이용해 256x256으로 리사이징하여 색상 배열(RGB)을 추출하는 유틸리티 함수를 만드세요.
- `onnx-community/depth-anything-v2-small` 모델을 WebGPU 백엔드로 로드하고, 리사이징된 이미지를 추론하여 1D Depth 배열을 반환하는 로직을 작성하세요.

## Step 4: UI 및 상태 관리 연결
- 로딩 상태(모델 다운로드 중, 이미지 분석 중 등)를 보여주는 오버레이 UI를 구현하세요.
- 이미지 파일 업로드 `<input type="file">`과 Z-depth 조절용 `<input type="range">` 슬라이더를 구현하세요.
- 슬라이더 값이 변경될 때마다 Three.js의 `uDepthScale` uniform 변수만 업데이트되도록 이벤트 리스너를 연결하세요.

## Step 5: GitHub Pages 배포 설정
- `vite.config.js`를 생성하고, GitHub Pages 배포를 위해 `base` 경로를 설정할 수 있도록 주석과 함께 세팅하세요. (예: `base: process.env.NODE_ENV === 'production' ? '/레포지토리명/' : '/'`)
- 루트 디렉토리에 `.github/workflows/deploy.yml` 파일을 생성하여, 코드가 `main` 브랜치에 푸시되었을 때 자동으로 Vite 빌드를 수행하고 `gh-pages` 브랜치로 배포하는 GitHub Actions 워크플로우를 작성하세요.

# Rules
- 모든 코드는 모듈화되어야 하며, 가독성을 위해 각 기능(Three.js 설정, AI 추론, UI 핸들링)을 별도의 파일로 분리하세요 (예: `main.js`, `scene.js`, `ai.js`).
- 코드를 작성하기 전에, 구현하려는 아키텍처를 간단히 설명하고 진행하세요.


# 주의
배포할 때 vite.config.js의 base 속성을 실제 깃허브 레포지토리 이름으로 맞춰 에셋(js, css) 경로가 깨지지 않게 주의해야 함
깃헙 주소 https://github.com/tramper2/WebDepth3D

# 최종작업 완료후
깃헙에 배포할 readme.md에 자세한 내용을 기술하여 작성한다
로컬실행
npm run dev
깃헙서버 실행
https://tramper2.github.io/WebDepth3D/