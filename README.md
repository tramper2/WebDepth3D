# Web AI Voxelizer 🧊

Web AI Voxelizer는 브라우저 환경에서 온디바이스(On-device) AI를 활용하여 2D 이미지와 웹캠 영상을 실시간으로 3D 복셀(Voxel) 형태의 인터랙티브 씬으로 변환하는 웹 애플리케이션입니다.

서버 연산 없이 오직 사용자의 기기 리소스만으로 최첨단 AI 추론과 3D 렌더링을 수행하여 프라이버시가 보호되는 실감형 미디어 경험을 제공합니다.

---

## ✨ 핵심 기능 (Key Features)

- **📸 실시간 3D 웹캠 복셀화**
  - 웹캠 영상을 AI가 실시간으로 분석하여 얼굴과 배경의 깊이(Depth)를 추론하고, 이를 3D 큐브(Voxel) 입체 공간에 즉각적으로 구현합니다.
- **🖼️ 2D 이미지 입체 변환**
  - 사용자가 업로드한 2D 이미지를 분석하여 숨겨진 입체감을 찾아내 3D 씬으로 재구성합니다.
- **🧠 온디바이스 AI (On-Device AI)**
  - `Transformers.js`와 `Depth Anything V2 Small` 모델을 결합하여 외부 서버나 API 없이 브라우저 단에서 직접 깊이 추론(Depth Estimation)을 수행합니다.
- **🚀 렌더링 최적화 및 셰이더 프로그래밍**
  - 65,536개의 복셀 큐브를 단 1회의 드로우 콜(Draw Call)로 렌더링하는 `Three.js`의 `InstancedMesh` 기법을 적용했습니다.
  - 슬라이더 조작을 통한 Z축 깊이감(Depth Scale) 변화는 CPU 재연산 없이 Custom GPU Vertex Shader를 통해 프레임 드랍 없이 부드럽게 반영됩니다.
- **📊 PIP(Picture-in-Picture) 모니터링**
  - 화면 좌측 하단에 웹캠 원본과 AI가 생성한 흑백 뎁스 맵(Depth Map)을 실시간으로 비교하며 볼 수 있는 모니터링 패널을 제공합니다.

---

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend Core:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Build Tool:** Vite
- **AI Inference Engine:** `@huggingface/transformers` (v4.2.0, WASM Backend)
- **AI Model:** `onnx-community/depth-anything-v2-small`
- **3D Graphics Engine:** `Three.js` (WebGL)

> **※ Note:** 현재 Windows/Chrome WebGPU 환경에서 `Depth Anything V2` 모델의 특정 텐서(Tensor) 연산 오류로 인해 형상이 찌그러지는 현상이 있어, 100% 안정성을 보장하는 WebAssembly(WASM) 백엔드를 강제 활성화하도록 조치되어 있습니다.

---

## 💻 설치 및 실행 방법 (How to Run Locally)

본 프로젝트는 Node.js 환경에서 Vite 빌드 도구를 사용합니다.

1. **저장소 클론 (Clone the repository)**
   ```bash
   git clone https://github.com/tramper2/WebDepth3D.git
   cd WebDepth3D
   ```

2. **의존성 패키지 설치 (Install dependencies)**
   ```bash
   npm install
   ```

3. **개발 서버 실행 (Start development server)**
   ```bash
   npm run dev
   ```

4. **브라우저 접속 (Open in browser)**
   - 실행 후 터미널에 표시되는 로컬 호스트 주소(예: `http://localhost:3000/WebDepth3D/`)로 접속합니다.
   - 윈도우 환경에서 실행할 때 안정적인 네트워크 연결을 위해 `vite.config.js`에 WSL 관련 설정이 적용되어 있습니다.

---

## 📂 프로젝트 구조 (Project Structure)

```text
WebDepth3D/
├── index.html          # 메인 HTML 뷰어 및 UI 레이아웃
├── vite.config.js      # Vite 번들러 및 WSL 통신 설정
├── src/
│   ├── main.js         # 앱 메인 로직 (이벤트 바인딩 및 렌더 루프)
│   ├── ai.js           # Transformers.js 기반 깊이 추론 파이프라인
│   ├── scene.js        # Three.js 3D 씬 및 InstancedMesh 셰이더 관리
│   ├── ui.js           # UI 컨트롤 및 PIP 캔버스 렌더링
│   ├── utils.js        # 이미지 리사이징, 픽셀 데이터 파싱 등 유틸 모음
│   └── style.css       # 애플리케이션 반응형 스타일링
└── Doc/                # 기획 및 설계 문서 (PRD, TRD, UserFlow 등)
```

---

## 📄 라이선스 (License)

이 프로젝트는 [MIT License](LICENSE)를 따릅니다.
