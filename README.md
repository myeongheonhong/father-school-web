# 2026 옥인교회 아버지기도학교

Next.js + React로 구현한 모바일 안내 웹입니다. GitHub Pages에서 정적 파일로 배포하며 별도 서버나 유료 서비스가 필요하지 않습니다.

- 비교 화면: https://myeongheonhong.github.io/father-school-web/
- A안: https://myeongheonhong.github.io/father-school-web/A/
- B안: https://myeongheonhong.github.io/father-school-web/B/
- C안: https://myeongheonhong.github.io/father-school-web/C/
- 관리자: https://myeongheonhong.github.io/father-school-web/admin/
- 디자인별 관리자: `/A/admin/`, `/B/admin/`, `/C/admin/`

## 참가자 화면

1–3주차 이미지, 고정 상단 탭, 원본 비율 이미지 확대, 큰 글씨 읽기, 조편성 안내, 이름 검색, 내 조 기억하기를 제공합니다. 조 명단은 아직 비어 있으며 준비 중으로 표시합니다. 날짜·강사·예배 순서·나눔 질문은 제공받은 원본 이미지에 맞춰 입력했습니다.

A는 이미지 중심, B는 말씀 제목 중심, C는 주보 스타일입니다. 모든 디자인이 `public/content.json`을 함께 사용합니다.

## 관리자 사용 방법

1. 관리자에서 주차 이미지·본문 또는 조편성을 수정합니다.
2. **이 기기에 임시 저장**을 누르면 해당 브라우저의 IndexedDB에 저장합니다. 이 단계에서는 다른 참가자 화면이 바뀌지 않습니다.
3. **미리보기**를 누르면 임시 저장한 내용으로 선택한 디자인을 확인합니다. 상단에 초안임을 표시합니다.
4. **배포 파일 만들기**를 눌러 `content.json`을 내려받습니다. 변경한 이미지는 파일 안에 포함됩니다.
5. **GitHub 업로드 열기**로 이동해서 `public/content.json`을 같은 이름으로 덮어쓰고 **Commit changes**를 누릅니다. 브라우저가 이름에 `(1)`을 붙였다면 먼저 `content.json`으로 바꿔주세요.
6. 저장소 Actions의 **Deploy website to GitHub Pages**가 성공하면 배포 완료입니다. 참가자 화면을 새로고침합니다.

공개된 관리 페이지는 개인 기기의 초안만 편집합니다. 실제 게시에는 GitHub 저장소 쓰기 권한이 필요합니다. 사이트에 GitHub 토큰이나 비밀번호는 저장하지 않습니다. 저장소 파일과 배포한 안내는 공개됩니다. 브라우저 데이터 삭제 시 임시 저장도 사라지므로 내려받은 파일을 백업하세요.

이미지: JPG/PNG/WEBP, 파일당 최대 10MB. 브라우저에서 긴 변 최대 2200px JPEG로 조정합니다. 전체 안내 파일은 최대 15MB입니다. 이미지를 교체한 뒤 **글자로 읽기 내용 수정**도 확인하세요.

## 선택한 디자인을 메인으로 연결

관리자의 **메인 주소에서 열릴 디자인**에서 A/B/C를 선택한 다음 위 배포 과정을 진행합니다. `public/content.json`의 `defaultVariant`가 `null`이면 비교 화면, `"A"`, `"B"`, `"C"`이면 그 참가자 화면을 메인에 직접 표시합니다. 기존 QR 주소와 A/B/C 경로는 유지됩니다.

## 로컬 개발·검증

Node.js 20.9 이상(권장 22).

```sh
npm ci
npm run dev
# http://localhost:3000/father-school-web/
npm run check
npm run build
```

`out/` 폴더가 정적 배포 결과입니다. GitHub Actions가 main 브랜치의 커밋마다 타입 검사, 데이터 검증 테스트, 빌드, Pages 배포를 수행합니다. GitHub 저장소 Settings → Pages → Source는 **GitHub Actions**입니다.

관리자에서 내보낸 파일을 터미널로 반영할 수도 있습니다.

```sh
npm run import-content -- /절대/경로/content.json
npm run check
npm run build
# 변경 검토 후 git commit 및 push
```

다른 도메인 루트로 옮기려면 빌드 시 `NEXT_PUBLIC_BASE_PATH=''`를 설정하세요. 현재 Pages 배포 경로는 `/father-school-web`입니다. API route, server action, 런타임 서버, 외부 폰트·분석 스크립트를 사용하지 않습니다.

## 배포 복구

GitHub에서 문제가 된 콘텐츠 커밋을 Revert하면 자동으로 이전 내용이 재배포됩니다. 원본 주차 포스터는 `public/posters/`에 보관합니다.


## B2 — 조편성 개선 버전 (2026-10-23)

- 참가자: https://myeongheonhong.github.io/father-school-web/B2/
- 조편성 바로가기: https://myeongheonhong.github.io/father-school-web/B2/?tab=groups
- 관리자: https://myeongheonhong.github.io/father-school-web/B2/admin/

B2는 기존 B를 보존하는 별도 경로입니다. 원본 조편성에서 조장·조원 이름만 입력했으며 전화번호와 명단 원본 이미지는 저장소에 포함하지 않았습니다. 10개 조 / 60명을 전체 명단으로 먼저 보여줍니다. 필요할 때 ‘이름으로 찾기’를 펼쳐 부분 이름 검색과 결과 강조를 사용할 수 있습니다. B2에는 내 조 기억하기나 개인 선택 정보 저장 기능이 없습니다.

B2의 안내는 `public/content-b2.json`, 관리자 초안은 별도 IndexedDB 키 `b2`를 사용합니다. B2 관리자에서 내려받는 파일 이름도 `content-b2.json`입니다. 이 파일을 GitHub의 `public/` 폴더에 올리면 B2만 갱신됩니다. 기존 A/B/C의 안내와 초안을 덮어쓰지 않습니다.

```sh
npm run import-content -- /절대/경로/content-b2.json B2
```

기존 `/B/`는 초기 비교안으로 유지합니다. 후속 디자인은 `/B3/`처럼 별도 경로와 데이터 파일로 추가하며, 메인 전환은 선택이 확정된 후 진행합니다.
