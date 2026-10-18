# SIHYEON STUDIO — Cloudflare 배포 가이드

확인일: 2026-10-19 (KST). 현재 앱은 Vue 3 + Vite 정적 웹앱입니다. 현재 운영 주소는 [Workers Static Assets 배포본](https://tenta-scheduler.ryan9320.workers.dev)이며, 아래 Pages 절차는 다른 배포 방식을 선택할 때의 안내입니다.

현재 Workers Git 연결 설정은 build=`npm run build`, deploy=`npx wrangler deploy --assets ./dist --name tenta-scheduler --compatibility-date 2026-10-19`, Root directory=저장소 루트, production branch=`main`입니다. 배포 후 기존 작업을 옮기는 상세 절차는 [백업·복원 가이드](backup-restore.md)를 참고하세요.

## 1. 준비된 저장소

[gamsung0388/tenta_scheduler](https://github.com/gamsung0388/tenta_scheduler)

프로젝트 파일은 저장소 루트에 있습니다. `outputs/sihyeon-studio` 같은 하위 경로를 Root directory로 지정하지 않습니다. Node 버전은 `.node-version`과 `.nvmrc`의 `24.11.1`로 고정했습니다.

## 2. Cloudflare에서 프로젝트 연결

1. [Cloudflare 대시보드](https://dash.cloudflare.com/)에 로그인합니다.
2. **Workers & Pages → Create application → Pages**로 이동합니다.
3. **Connect to Git / Import an existing Git repository**를 선택합니다. UI 언어에 따라 문구가 다를 수 있습니다.
4. GitHub 연결을 승인하고 `gamsung0388/tenta_scheduler` 저장소를 선택합니다. 저장소가 목록에 없다면 GitHub의 Cloudflare 앱 권한에 이 저장소를 추가합니다.
5. Begin setup에서 아래 값을 지정합니다.

| 설정 | 입력 값 |
| --- | --- |
| Project name | `tenta-scheduler` 권장; 사용 가능한 이름 선택 |
| Production branch | `main` |
| Framework preset | `Vue` 또는 `None` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 비워 두기: 저장소 루트 |
| 환경 변수 | 필요 시 `NODE_VERSION` = `24.11.1` |
| 앱 비밀키 / API 토큰 | 현재 버전에는 없음 |

6. **Save and Deploy**를 선택합니다. 의존성 설치 → Vite 빌드 → dist 업로드가 끝나면 Cloudflare가 실제 접속 URL을 제공합니다. 표시된 URL을 사용하세요.

이 절차와 Vue 빌드 설정은 [Cloudflare Git 연결 안내](https://developers.cloudflare.com/pages/get-started/git-integration/) 및 [Vue 배포 안내](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vue-site/)를 기준으로 정리했습니다. Node 버전 설정은 [Build image 문서](https://developers.cloudflare.com/pages/configuration/build-image/)를 참고하세요.

## 3. 기존 로컬 작업 옮기기

1. 기존 로컬 주소에서 프로젝트별 `.tssproj` 백업을 내려받습니다.
2. 배포된 주소를 엽니다.
3. 상단 프로젝트 메뉴 → **프로젝트 복원**에서 백업을 선택합니다.
4. 새 사본으로 복원한 뒤 일정·이미지·배치를 확인합니다.

로컬 주소, 배포 주소, 임시 미리보기 주소는 서로 다른 브라우저 저장 공간입니다. 로컬에서 입력한 일정이 배포 주소로 자동 이동하지 않습니다. 주로 사용할 주소를 정한 뒤 그 주소에서 작업하는 것이 좋습니다.

## 4. 배포 후 확인

- 일정 작성과 수정 후 저장 완료 표시, 새로고침 복원
- 이미지 추가·이동·자르기·교체 및 재접속 유지
- 1920×1080 PNG 다운로드와 출력 전 점검
- 이미지 포함 `.tssproj` 백업·복원
- 최근 저장 사본 복구와 여러 탭 충돌 안내

## 5. 다음 수정부터 반영하는 방법

개발 원본은 `E:\tenta`를 사용합니다. PowerShell 예시:

```powershell
cd E:\tenta
npm.cmd test
npm.cmd run build
git status
git add src docs tests package.json package-lock.json
git commit -m "Improve schedule editor"
git push origin main
```

수정한 파일만 확인해 추가합니다. 연결 후에는 main에 push할 때 Cloudflare가 새 배포를 실행합니다. 저장소의 GitHub Actions는 테스트와 빌드를 확인하며, Cloudflare 배포 자체는 Cloudflare Git 연결이 담당합니다. [자동 배포 동작](https://developers.cloudflare.com/pages/get-started/git-integration/)

## 6. 자주 막히는 부분

| 증상 | 확인할 내용 |
| --- | --- |
| 저장소가 보이지 않음 | Cloudflare GitHub 앱의 저장소 접근 권한 |
| Production branch가 비어 있음 | main에 첫 커밋이 push되었는지 확인 |
| npm 또는 Vite 빌드 오류 | Node 24.11.1, package-lock.json, 저장소 루트 설정과 빌드 로그 |
| dist를 찾을 수 없음 | Build command=`npm run build`, output=`dist` 확인 |
| 화면이나 이미지가 로딩되지 않음 | 빌드 로그 및 배포 파일의 references 폴더; 강력 새로고침 후 확인 |
| 로컬에서 쓰던 일정이 보이지 않음 | 기존 주소에서 `.tssproj` 백업을 받아 새 주소에서 복원 |
| 저장 실패 배너 | 브라우저 저장 공간·시크릿 모드 여부 확인, 우선 백업 내려받기 |

대시보드가 Workers 생성 화면을 먼저 보여주면 **Pages** 항목으로 돌아가 위 절차를 사용합니다. 이 정적 배포 방식에는 Wrangler 배포 명령, Workers 런타임, D1, R2 바인딩이 필요하지 않습니다.

## 7. 온라인 저장과의 차이

이 배포로 얻는 것은 인터넷 주소와 자동 업데이트입니다. 현재 자동 저장은 계속 **사용 중인 브라우저의 IndexedDB**에 기록됩니다. GitHub나 Cloudflare에 개인 프로젝트가 자동 업로드되는 기능은 아직 없습니다.

여러 PC 사이의 자동 동기화는 별도 단계로 Workers API, 데이터·이미지 저장, 사용자 접근 범위를 구현해야 합니다. 그 전까지는 `.tssproj`로 프로젝트를 옮깁니다. 직접 업로드한 이미지와 일정은 브라우저에 남고, 앱에 기본 포함한 참고 이미지 2장은 정적 배포 파일에 포함됩니다.

전용 도메인은 Pages 프로젝트의 **Custom domains**에서 추가할 수 있습니다. 먼저 기본 배포 주소에서 정상 동작을 확인한 후 연결하면 됩니다. [공식 사용자 도메인 안내](https://developers.cloudflare.com/pages/configuration/custom-domains/)
