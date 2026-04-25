# Asset Generation & Management Guide

## 1. 이미지 에셋 (Input Images)
- **샘플 이미지 (Sample Images):**
  - 초기 진입 시 보여줄 1~3장의 기본 이미지 준비.
  - 권장 속성: 전경과 배경의 구분이 명확하고, 명암 대비가 뚜렷하며, 피사체의 거리감이 확실한 사진 (예: 터널, 풍경 사진, 접사 인물 사진 등)
  - 저장 경로: `/public/assets/samples/`

## 2. AI 모델 자산 (Model Assets)
- **Hugging Face CDN 연동:** - 기본적으로 `Transformers.js`가 구동 시 Hugging Face Hub에서 `onnx-community/depth-anything-v2-small` 모델 파일을 동적으로 다운로드하여 브라우저의 Cache API에 저장함.
  - **오프라인/폐쇄망 환경 대비 (선택 사항):** 필요시 `.onnx` 파일과 `tokenizer.json`, `config.json` 등을 미리 다운로드하여 `/public/models/` 경로에 서빙하고, 파이프라인 초기화 시 로컬 경로를 바라보도록 설정.

## 3. UI/UX 디자인 자산
- **CSS 스타일링:** 별도의 무거운 CSS 프레임워크(Tailwind 등) 없이, Vite의 기본 CSS나 SCSS 모듈을 사용하여 모던하고 미니멀한 UI(다크 모드 권장) 구성.
- **아이콘:** 업로드 버튼, 로딩 스피너 등은 경량화된 SVG 아이콘 사용.
