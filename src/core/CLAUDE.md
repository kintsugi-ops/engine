# Core Engine — Module Context

## 역할

모든 provider를 조합하여 에러 → PR 생성까지의 전체 흐름을 오케스트레이션하는 핵심 로직.

## 오케스트레이션 흐름

```
engine.run(rawPayload)
  1. errorMonitoring.parse(rawPayload)  → ParsedError
  2. github.getFileTree()               → string[] (레포 파일 목록)
  3. ai.analyzeError(error, fileTree)   → string[] (읽어야 할 파일 경로)
  4. github.getFileContents(filePaths)  → FileContent[] (소스코드)
  5. ai.generateFix(error, sourceFiles) → FixProposal (수정안)
  6. github.createBranch(branchName)
     github.updateFile(...)              → 브랜치에 수정 적용
     github.createPullRequest(...)       → PR 생성
  7. notification?.notify(result, error) → 알림 전송 (선택)
```

## EngineConfig

`engine.ts`에서 정의. 엔진 초기화 시 필요한 설정:

```typescript
interface EngineConfig {
  ai: AIProvider
  errorMonitoring: ErrorMonitoringProvider
  notification?: NotificationProvider   // 선택
  github: GitHubClientConfig
}
```

## 핵심 규칙

- **인터페이스에만 의존.** Claude, Sentry, Slack 같은 구현체를 직접 import 금지.
- **에러 처리는 EngineResult 타입.** throw 대신 `{ success: true, pr }` 또는 `{ success: false, error }` 리턴.
- **알림 실패는 엔진을 멈추지 않음.** notification은 best-effort. try-catch로 감싸서 실패해도 EngineResult는 성공으로 처리.
- **진입점(cli/action)에서 구현체를 조립하여 engine에 주입.** engine 내부에서 provider 선택 로직 없음.
