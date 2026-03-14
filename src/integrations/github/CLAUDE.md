# GitHub Integration — Module Context

## 역할

Octokit(GitHub 공식 SDK)을 래핑하여 엔진이 사용하는 GitHub 작업을 도메인 언어로 제공.

## GitHubClient 메서드

| 메서드 | 하는 일 | 엔진 흐름에서의 위치 |
|--------|--------|---------------------|
| `getFileTree()` | 레포 소스파일 목록 (트리) | 2단계: AI에게 파일 트리 전달 |
| `getFileContent(path)` | 파일 내용 + sha 읽기 | 4단계: AI가 선택한 파일 읽기 |
| `getFileContents(paths)` | 여러 파일 병렬 읽기 | 4단계: 위와 같음, 병렬 처리 |
| `createBranch(name)` | baseBranch에서 새 브랜치 | 6단계: PR용 브랜치 생성 |
| `updateFile(...)` | 브랜치에 파일 수정 커밋 | 6단계: 수정안 적용 |
| `createPullRequest(...)` | PR 생성 | 6단계: 최종 PR 오픈 |

## 파일 트리 필터링

`getFileTree()`는 `isSourceFile()`로 소스코드만 필터링:
- 포함: `.ts`, `.java`, `.py`, `.go`, `.rs` 등 소스코드 확장자
- 제외: `node_modules/`, `dist/`, `.min.` 파일

## 주의사항

- `getFileContent()`가 리턴하는 `sha`는 `updateFile()`에 반드시 필요. 없으면 GitHub API 에러.
- `updateFile()`의 `content`는 base64로 인코딩하여 전송 (내부에서 처리됨).
- GitHub API rate limit 주의. `getFileContents()`는 `Promise.all`로 병렬 요청하므로 파일이 많으면 rate limit에 걸릴 수 있음.
