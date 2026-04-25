# Project TODO & Bug Tracking

## 🐛 Known Issues

### 1. WebGPU 가로줄 무늬/아티팩트 버그 (Critical)
- **현상**: GPU 가속(WebGPU) 활성화 시 뎁스 맵 결과물에 일정한 간격의 가로줄 무늬나 노이즈가 섞여 나오는 현상.
- **영향 범위**: Windows 환경의 Chrome/Edge 브라우저 + Nvidia GPU (특히 RTX 30시리즈) 사용자.
- **재현 방법**: 'GPU ACCELERATION' 토글 활성화 후 웹캠 추론 실행.
- **추정 원인**:
    - ONNX Runtime WebGPU 백엔드의 특정 연산(특히 Dinov2의 Attention layer) 처리 시 정밀도(fp16) 이슈.
    - 브라우저 WebGPU API와 GPU 드라이버 간의 셰이더 컴파일 버그.
- **임시 해결책**: 
    - 기본 백엔드를 WASM(CPU)으로 설정.
    - 인퍼런스 해상도를 낮추어 CPU 부하를 최소화.
- **추후 시도해볼 것**:
    - `dtype: 'fp32'` 강제 설정을 통한 정밀도 복구 테스트 (속도는 저하될 수 있음).
    - `onnxruntime-web` 라이브러리 업데이트 모니터링.
    - Chrome Canary 등 최신 브라우저 엔진에서의 동작 확인.

## 🚀 Feature Roadmap

### UI/UX 개선
- [ ] 모바일 환경에서 가로/세로 모드 전환 시 UI 레이아웃 자동 조정 보강.
- [ ] 복셀 포인트 밀도(Density) 조절 기능 추가.
- [ ] 캡처된 3D 복셀 데이터를 `.obj`나 `.ply` 파일로 내보내는 기능 (Export).

### 성능 최적화
- [ ] WebWorker를 사용하여 메인 스레드와 AI 추론 스레드를 완전히 분리 (UI 프리징 방지).
- [ ] 뎁스 맵 스무딩(Smoothing) 필터 적용으로 복셀 노이즈 제거.
- [ ] 정적 이미지 처리 시 고해상도 모델(Depth Anything V2 Large) 선택 옵션 제공.

### 기타
- [ ] 다국어 지원 (한국어/영어).
- [ ] 배포용 README.md 상세화 및 시연 영상 추가.
