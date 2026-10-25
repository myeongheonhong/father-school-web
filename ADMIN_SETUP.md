# 비밀번호 관리자 연결

현재 공개 서비스는 GitHub Pages입니다. 사용자 승인 후 Vercel 관리 서버와 GitHub 전용 권한을 연결하고 운영 배포했습니다. 관리자 비밀번호 로그인 → GitHub 저장 → Pages 자동 배포 → 기존 QR 사이트 반영을 확인했습니다.

## 구조

- 참가자: `https://myeongheonhong.github.io/father-school-web/` 유지
- 관리자: https://father-school-admin.vercel.app/admin/
- API: 같은 도메인의 `/api/admin` (Node.js). 외부 사이트의 POST 차단, HttpOnly / Secure / SameSite=Strict 쿠키로 12시간 인증
- 변경 가능한 파일: `myeongheonhong/father-school-web` 저장소의 `main:public/content-b3.json`으로 서버에서 고정
- 원본 파일 SHA가 달라지면 저장 거부. 이름·연락처·형식·크기를 서버에서도 검증
- 저장은 GitHub 커밋, 실제 게시 완료는 `pages.yml` 실행 결과로 확인

## 연결 순서와 진행 상태

1. Vercel `father-school-admin` 프로젝트 생성과 작업공간 접근 승인 완료. ID는 `prj_uE6yTnfN7SKmV6UmQ2jeLYXdPCQi`, 작업공간은 `myeongheonhongs-projects`입니다. Git 연동 없이 소스 업로드로 관리 서버를 배포합니다. 관리자 코드 변경은 별도 Vercel 배포가 필요하며, 안내 저장은 기존 GitHub Pages 배포로 처리합니다.
2. 사용자가 GitHub에서 **해당 저장소 하나**에만 접근 가능한 fine-grained token 발급 완료. 권한은 **Contents: Read and write**, **Actions: Read-only**, 기본 Metadata: Read입니다. 기본 만료기간은 30일(2026-11-24)입니다. 만료 전에 새 전용 키를 발급해 `ADMIN_GITHUB_TOKEN`을 교체하고 재배포해야 합니다. 기존 CLI/개인 토큰을 추출해 전용 토큰 대신 사용하지 않습니다. 최종 키 발급은 사용자가 수행합니다.
3. `node --import tsx scripts/create-admin-secrets.ts`를 한 번 실행합니다. `.env.admin-secrets.local`에 해시와 서명 키, `.env.admin-login.local`에 초기 비밀번호가 생성됩니다. 두 파일은 gitignored, 0600이며 덮어쓰지 않습니다. 비밀번호는 192비트 난수입니다.
4. Vercel production 환경에 아래 값을 설정합니다. 비밀 값은 **Sensitive**로 저장하고 클라이언트 공개 변수에 넣지 않습니다.

| 변수 | 값 |
| --- | --- |
| `ADMIN_GITHUB_TOKEN` | 위 전용 토큰 |
| `ADMIN_PASSWORD_HASH` | 로컬 생성한 해시 |
| `ADMIN_SESSION_SECRET` | 로컬 생성한 서명 키 |
| `ADMIN_ORIGIN` | 실제 관리 서버의 HTTPS origin (끝의 `/` 제외) |
| `NEXT_PUBLIC_ADMIN_SERVER` | `1` |
| `NEXT_PUBLIC_BASE_PATH` | 빈 문자열 |

5. `vercel.json`의 framework `null`, `npm run build`, output `out`와 `api/admin.ts`의 Web Handler를 사용해 배포합니다. Node 런타임용 `package.json`의 `type: module`과 서버 import의 `.js` 확장자가 필요합니다. 운영 배포에서 화면과 API 응답을 검증했으며 프로젝트 기본 보호 설정은 유지했습니다.
6. 관리자 서비스 확인 후 GitHub Pages 빌드에 `NEXT_PUBLIC_ADMIN_ORIGIN`을 설정합니다. 기존 `/admin/`과 `/B3/admin/`만 새 관리자로 이동합니다. 관리자 서비스 빌드에는 이 값을 넣을 필요가 없습니다.
7. 실제 관리자에서 로그인, 최신 내용 읽기, 저장, GitHub Actions 완료, 기존 QR에서 결과 확인을 수행했습니다. 나눔 질문 끝에 줄바꿈 하나를 저장해 게시 경로를 검증하고 바로 원문으로 복원 저장했습니다. 명단·연락처는 변경하지 않았습니다.

관리자 비밀번호와 전용 토큰은 브라우저 localStorage/IndexedDB에 보관하지 않습니다. 초안에는 안내 내용과 원본 revision만 저장합니다. 초기 비밀번호는 개인 비밀 파일로 전달하고 채팅·저장소에 적지 않습니다. 비밀번호 해시 또는 서명 키를 교체하면 기존 세션이 만료됩니다. 직접 정한 짧은 비밀번호로 바꾸려면 영구적인 IP별 로그인 속도 제한을 먼저 연결해야 합니다. 현재 프로세스별 실패 제한은 서버리스 전체를 공유하는 제한이 아닙니다.

## 검증

```sh
npm run check
npm run build
NEXT_PUBLIC_BASE_PATH='' NEXT_PUBLIC_ADMIN_SERVER=1 npm run build
node --import tsx scripts/admin-preview.ts
```

마지막 명령은 **127.0.0.1에만** 여는 로컬 테스트 서버입니다. `http://localhost:4188/admin/`, 시험 비밀번호 `local-test-only`. 테스트 전용 명단을 메모리에 저장하며 GitHub나 실제 참가자 데이터는 수정하지 않습니다. 서버를 끄면 시험 데이터가 사라집니다. 이 시험 비밀번호를 실제 환경에 사용하지 않습니다.

로컬 검증: 이름 변경 시 연락처 유지, 조원 추가/삭제/취소, 질문 추가/삭제, 로그인, 저장 후 다시 읽기, 미리보기, 최신 revision 충돌 거부, 잘못된 인증과 다른 origin의 요청 차단, 320px/390px 화면 가로 넘침 없음.

운영 검증: 관리자 로그인, 최신 파일 읽기, 변경 없는 저장, 실제 GitHub 커밋 생성, Pages 자동 배포 성공, 공개 사이트 JSON의 변경 확인. 로그인하지 않은 읽기는 401, 다른 origin의 저장은 403으로 차단됨을 확인했습니다. 실기기 Safari/Chrome 키보드 동작은 아직 검증하지 않았습니다.
