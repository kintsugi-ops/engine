# Kintsugi Ops Engine — Claude Context

## 프로젝트 정체

서버에서 에러가 발생하면 AI가 자동으로 원인을 분석하고 수정 PR을 올려주는 **자가 치유 엔진**.

**오픈소스 라이브러리**다. 개인 툴이 아님. 사용자가 자신의 AI, 에러 모니터링 도구, 코드 레포를 연결해서 쓰는 구조.

핵심 원칙:
- **Human-in-the-loop**: AI는 PR만 생성. 머지는 개발자가 결정.
- **Zero-server**: 사용자 GitHub Actions에서 실행. 중앙 서버 없음.
- **Provider-agnostic**: AI, 에러 모니터링, 알림 모두 플러그인 가능.

---

## 배포 형태 (2가지)

이 라이브러리는 두 가지 방법으로 사용 가능해야 한다. 코드는 같고 진입점만 다름.

### 1. GitHub Actions Marketplace action (주 사용 방식)

사용자가 자기 레포에 workflow 파일 하나 추가하면 끝.

```yaml
# 사용자 레포의 .github/workflows/kintsugi.yml
on:
  repository_dispatch:
    types: [sentry-error]

jobs:
  fix:
    runs-on: ubuntu-latest
    steps:
      - uses: kintsugi-ops/engine@v1
        with:
          ai-provider: claude
          ai-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          slack-webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 2. npm 패키지 (프로그래밍 방식, 고급 사용자)

```typescript
import { KintsugiEngine, ClaudeProvider, SentryParser, SlackNotifier } from 'kintsugi-ops'

const engine = new KintsugiEngine({
  ai: new ClaudeProvider({ apiKey: process.env.ANTHROPIC_API_KEY }),
  errorMonitoring: new SentryParser(),
  notification: new SlackNotifier({ webhookUrl: process.env.SLACK_WEBHOOK_URL }),
  github: { token: process.env.GITHUB_TOKEN, owner: 'myorg', repo: 'myrepo' }
})

engine.run(sentryPayload)
```

---

## 실행 흐름

```
서버 (EC2 등)
  └─ 500 에러 발생
       └─ Sentry 감지
            └─ Sentry Webhook → GitHub API (repository_dispatch)
                 └─ GitHub Actions 트리거
                      └─ 엔진 실행
                           ├─ Sentry payload 파싱
                           ├─ GitHub에서 에러 발생 파일 소스코드 읽기
                           ├─ AI에게 에러 + 소스코드 전달 → 수정 코드 생성
                           ├─ 새 브랜치 생성 + PR 오픈
                           └─ Slack 알림 전송
```

---

## 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| 언어 | TypeScript | 인터페이스가 곧 사용자와의 계약. 오픈소스 라이브러리에서 필수. |
| 빌드 | tsup | 설정 최소화, ESM 번들 + 타입 정의 자동 생성 |
| 개발 실행 | tsx | ts-node 대체, 빠른 TypeScript 직접 실행 |
| GitHub 연동 | Octokit | GitHub 공식 SDK |
| AI | Claude / GPT-4o / Gemini | provider 선택 가능, 모두 공식 TS SDK 있음 |
| CLI 인자 파싱 | commander | 경량 CLI 유틸리티 |
| 런타임 검증 | zod | 환경변수 & Sentry payload 런타임 타입 보장 |
| 에러 모니터링 | Sentry Webhook (확장 가능) | 스펙 기반으로 파싱, 다른 도구도 추가 가능 |
| 알림 | Slack Webhook (확장 가능) | fetch로 충분, 별도 SDK 불필요 |
| 환경 변수 | dotenv | 로컬 개발용 |

웹 프레임워크 없음 — HTTP 서버를 띄우지 않으므로 불필요.

---

## 아키텍처 설계

### Provider-Agnostic 구조

`core/`는 인터페이스에만 의존. 구현체(Claude, Sentry, Slack 등)를 직접 import하지 않음.
사용자는 인터페이스를 구현하면 어떤 도구든 연결 가능.

```
AIProvider (interface)
  ├── ClaudeProvider
  ├── OpenAIProvider
  └── GeminiProvider

ErrorMonitoringProvider (interface)
  └── SentryProvider

NotificationProvider (interface)
  └── SlackProvider
```

### 의존성 방향

```
cli / github-actions
      ↓
   core/engine          ← 인터페이스만 알고 있음
      ↓
integrations/*          ← 인터페이스 구현체
      ↓
   types/               ← 모든 레이어가 공유
```

---

## 디렉토리 구조

```
kintsugi-ops/
├── src/
│   ├── types/                        # 공유 타입 (ParsedError, FixProposal, EngineConfig 등)
│   ├── integrations/
│   │   ├── ai/
│   │   │   ├── provider.interface.ts # AIProvider 인터페이스
│   │   │   ├── claude.ts
│   │   │   ├── openai.ts
│   │   │   └── gemini.ts
│   │   ├── error-monitoring/
│   │   │   ├── provider.interface.ts # ErrorMonitoringProvider 인터페이스
│   │   │   └── sentry.ts
│   │   ├── notification/
│   │   │   ├── provider.interface.ts # NotificationProvider 인터페이스
│   │   │   └── slack.ts
│   │   └── github/
│   │       └── client.ts             # Octokit 래퍼 (파일 읽기, 브랜치/PR 생성)
│   ├── core/
│   │   └── engine.ts                 # 오케스트레이션 로직
│   ├── cli/
│   │   └── index.ts                  # CLI 진입점 (commander)
│   └── index.ts                      # npm 패키지 공개 진입점 (export 모음)
├── .github/
│   └── workflows/
│       └── kintsugi.yml              # GitHub Actions (Marketplace action 진입점)
├── examples/                         # 사용자용 설정 예시
├── .gitignore
├── CLAUDE.md
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

---

## 개발 컨벤션

- `core/`는 인터페이스에만 의존. 구현체를 직접 import 금지.
- 타입은 `src/types/`에서 중앙 관리.
- 외부 서비스 연동은 모두 `src/integrations/` 아래 인터페이스 + 어댑터 패턴.
- 런타임에 들어오는 외부 데이터(env, webhook payload)는 반드시 zod로 검증 후 사용.
- 에러 처리는 throw 대신 명시적 Result 타입 또는 `{ data, error }` 패턴 지향.

---

## CLAUDE.md 컨벤션

컨텍스트 엔지니어링을 위해 모듈별 CLAUDE.md를 운영한다. Claude는 작업 디렉토리 기준으로 상위 경로의 모든 CLAUDE.md를 계층적으로 읽음.

| 파일 | 역할 |
|------|------|
| `/CLAUDE.md` (이 파일) | 프로젝트 전체 개요, 아키텍처, 컨벤션 |
| `src/integrations/ai/CLAUDE.md` | AIProvider 인터페이스 규칙, 새 AI provider 추가 방법 |
| `src/integrations/error-monitoring/CLAUDE.md` | ErrorMonitoringProvider 규칙, 새 에러 모니터링 도구 추가 방법 |
| `src/integrations/notification/CLAUDE.md` | NotificationProvider 규칙, 새 알림 도구 추가 방법 |
| `src/core/CLAUDE.md` | 오케스트레이션 로직 규칙, engine.ts 수정 시 주의사항 |

각 하위 CLAUDE.md는 해당 모듈 코드 작성 시점에 함께 생성한다.

---

## 개발 순서 (Phase 1)

1. ✅ 프로젝트 초기 세팅 — `package.json`, `tsconfig.json`, 디렉토리 구조
2. 타입 정의 — `src/types/`
3. 인터페이스 정의 — ai, error-monitoring, notification
4. Sentry 어댑터 — `src/integrations/error-monitoring/sentry.ts`
5. GitHub client — `src/integrations/github/client.ts`
6. AI 어댑터 3개 — Claude → OpenAI → Gemini
7. 핵심 오케스트레이션 — `src/core/engine.ts`
8. GitHub Actions workflow — `.github/workflows/kintsugi.yml`
9. CLI 진입점 — `src/cli/index.ts`

---

## Phase 로드맵

- **Phase 1** (현재): AI 분석 + PR 생성 + Slack 알림
- **Phase 2**: Auto-Rollback — 에러 급증 시 이전 버전 즉시 롤백
- **Phase 3**: Fully Autonomous — Staging 검증 후 자동 운영 배포
