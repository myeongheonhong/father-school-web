# 2026 옥인교회 아버지기도학교

Next.js + React로 구현한 모바일 안내 웹입니다. GitHub Pages에서 정적 파일로 배포하며 별도 서버나 유료 서비스가 필요하지 않습니다.

- 메인 (B3 · 기존 QR 주소): https://myeongheonhong.github.io/father-school-web/
- 비교 화면: https://myeongheonhong.github.io/father-school-web/designs/
- A안: https://myeongheonhong.github.io/father-school-web/A/
- B안: https://myeongheonhong.github.io/father-school-web/B/
- C안: https://myeongheonhong.github.io/father-school-web/C/
- 관리자: https://myeongheonhong.github.io/father-school-web/admin/
- 디자인별 관리자: `/A/admin/`, `/B/admin/`, `/C/admin/`

## 참가자 화면

메인 주소에 접속하면 B3의 1주차 안내가 글자로 즉시 표시됩니다. 1–3주차 모두 **글자로 읽기**가 기본이며, 주차를 바꾸거나 뒤로 가기로 돌아와도 글 안내부터 보여줍니다. **이미지로 보기** 버튼을 누르면 원본 이미지를 볼 수 있고, 이미지 화면에서 **크게 보기**로 확대할 수 있습니다. 고정 상단 탭, 큰 글씨 읽기, 10개 조 전체 명단과 선택적인 이름 검색을 제공합니다. 날짜·강사·예배 순서는 제공받은 원본 이미지를 따르며, 글 안내의 나눔 질문은 최신 전달 문구를 반영합니다.

A는 이미지 중심, B는 말씀 제목 중심, C는 주보 스타일입니다. A/B/C는 `public/content.json`을 함께 사용하고, B2는 `public/content-b2.json`, 메인과 B3는 `public/content-b3.json`을 사용합니다.

## 관리자 사용 방법

1. 관리자에서 주차 이미지·본문 또는 조편성을 수정합니다.
2. **이 기기에 임시 저장**을 누르면 해당 브라우저의 IndexedDB에 저장합니다. 이 단계에서는 다른 참가자 화면이 바뀌지 않습니다.
3. **미리보기**를 누르면 임시 저장한 내용으로 선택한 디자인을 확인합니다. 상단에 초안임을 표시합니다.
4. **배포 파일 만들기**를 눌러 `content-b3.json`을 내려받습니다. 변경한 이미지는 파일 안에 포함됩니다.
5. **GitHub 업로드 열기**로 이동해서 `public/content-b3.json`을 같은 이름으로 덮어쓰고 **Commit changes**를 누릅니다. 브라우저가 이름에 `(1)`을 붙였다면 먼저 `content-b3.json`으로 바꿔주세요.
6. 저장소 Actions의 **Deploy website to GitHub Pages**가 성공하면 배포 완료입니다. 참가자 화면을 새로고침합니다.

공개된 관리 페이지는 개인 기기의 초안만 편집합니다. 실제 게시에는 GitHub 저장소 쓰기 권한이 필요합니다. 사이트에 GitHub 토큰이나 비밀번호는 저장하지 않습니다. 저장소 파일과 배포한 안내는 공개됩니다. 브라우저 데이터 삭제 시 임시 저장도 사라지므로 내려받은 파일을 백업하세요.

이미지: JPG/PNG/WEBP, 파일당 최대 10MB. 브라우저에서 긴 변 최대 2200px JPEG로 조정합니다. 전체 안내 파일은 최대 15MB입니다. 이미지를 교체한 뒤 **글자로 읽기 내용 수정**도 확인하세요.

## 메인 화면과 기존 QR

메인 `/`는 B3 참가자 화면을 직접 렌더링합니다. 비교 화면이나 리다이렉트를 거치지 않으며, 쿼리가 없는 기존 QR 주소는 항상 1주차로 열립니다. `/admin/`과 `/B3/admin/`은 같은 B3 데이터와 초안을 편집합니다. 기존 `/B2/`, `/B3/`, `/A/`, `/B/`, `/C/` 경로는 유지하고 비교 화면은 `/designs/`에 보관합니다. 기존 QR을 다시 만들거나 인쇄할 필요가 없습니다. 이전 콘텐츠의 `defaultVariant` 필드는 파일 호환성을 위해 유지하지만 메인 화면 선택에는 사용하지 않습니다.

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
npm run import-content -- /절대/경로/content-b3.json B3
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

B2의 안내는 `public/content-b2.json`, 관리자 초안은 별도 IndexedDB 키 `b2`를 사용합니다. B2 관리자에서 내려받는 파일 이름도 `content-b2.json`입니다. 이 파일을 GitHub의 `public/` 폴더에 올리면 B2가 갱신됩니다. 기존 A/B/C의 안내와 초안을 덮어쓰지 않습니다.

```sh
npm run import-content -- /절대/경로/content-b2.json B2
```

기존 `/B/`는 초기 비교안으로 유지합니다. 현재 메인은 B3입니다. 후속 디자인은 `/B3/`처럼 별도 경로와 데이터 파일로 추가합니다.

## B3 — 연락처와 메뉴 이동 개선

- 참가자: https://myeongheonhong.github.io/father-school-web/B3/
- 조편성: https://myeongheonhong.github.io/father-school-web/B3/?tab=groups
- 관리자: https://myeongheonhong.github.io/father-school-web/B3/admin/

B3는 전체 명단을 먼저 보여주며, 상단의 전체 / 1–10조 버튼으로 조를 선택할 수 있습니다. 조 선택 버튼은 본문과 함께 스크롤되어 화면 위로 사라지고, 주차 메뉴만 고정됩니다. 이름 검색은 선택한 조와 관계없이 전체에서 찾습니다. 기본 카드는 조장·조원 이름을 보여주며, 연락처 기능을 알아볼 수 있도록 처음에는 **1조 연락처만 펼쳐둡니다**. 다른 조는 카드별 **연락처 보기 / 접기** 버튼으로 직접 열고 닫습니다. 스크롤·조 선택·이름 검색으로 연락처가 자동으로 열리거나 닫히지 않으며, 조 선택 시 스크롤 위치를 강제로 이동하지 않습니다. 직접 선택한 펼침 상태는 조 선택과 검색을 오가도 현재 조편성 화면을 보는 동안 유지됩니다. 닫힌 연락처는 키보드 탐색과 스크린리더에서도 제외합니다. 펼친 번호에는 `tel:` 링크가 있습니다. 현재 64명의 연락처는 `public/content-b3.json`의 조별 `contacts`에 저장합니다.

조편성 탭은 금색으로 구분합니다. 주차와 조편성 사이를 움직이는 선택 배경, 방향에 따른 본문 진입, 조 선택 시 결과 전환, 버튼 누름 효과와 부드러운 스크롤을 제공합니다. 기기의 동작 줄이기 설정을 따르면 전환 효과와 스크롤 애니메이션을 생략합니다.

B3 관리자에서는 이름과 연결된 전화번호를 수정할 수 있습니다. 초안 키는 `b3`, 배포 파일은 `content-b3.json`입니다. 메인은 B3이며 `/admin/`과 `/B3/admin/`은 동일한 B3 데이터와 초안을 사용합니다. 연락처를 수정한 뒤 아래 명령 또는 관리자에서 내려받은 파일을 GitHub의 `public/`에 올려 배포합니다.

```sh
npm run import-content -- /절대/경로/content-b3.json B3
```

명단 대조 (2026-10-24): 노윤식 → 노운식 (2조 조장), 최용조 → 최웅조 (8조), 정태홍 → 정태흥 (10조). 이름과 전화번호 60쌍을 원본 이미지와 대조했습니다. 이전 디자인의 데이터에도 같은 이름 정정을 반영했습니다. 예배 순서의 노운식·장래천 표기도 원본에 맞췄습니다.
