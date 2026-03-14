# AI Integration — Module Context

## 역할

에러 정보를 받아 원인을 분석하고 수정 코드를 생성하는 AI provider 레이어.

## 2단계 AI 호출 구조

모든 AI provider는 2개의 메서드를 구현해야 한다:

1. **`analyzeError(error, fileTree)`** → 읽어야 할 파일 경로 목록 리턴
   - 에러 정보 + 레포 파일 트리(경로만, 내용 없음)를 보내서 어떤 파일을 봐야 하는지 AI가 판단
   - 스택 트레이스가 가리키는 파일이 아닌 다른 파일이 진짜 원인일 수 있기 때문

2. **`generateFix(error, sourceFiles)`** → FixProposal 리턴
   - 에러 정보 + 실제 소스코드를 보내서 수정안 생성

## 파일 구조

| 파일 | 역할 |
|------|------|
| `provider.interface.ts` | AIProvider 인터페이스 정의 |
| `prompts.ts` | 시스템/유저 프롬프트 템플릿. **3개 어댑터가 공유.** 프롬프트 수정 시 여기만 수정. |
| `response-parser.ts` | AI 응답 JSON 파싱 + zod 검증. **3개 어댑터가 공유.** |
| `claude.ts` | Anthropic SDK 호출 |
| `openai.ts` | OpenAI SDK 호출 |
| `gemini.ts` | Google GenAI SDK 호출 |

## 새 AI provider 추가 방법

1. `{provider-name}.ts` 파일 생성
2. `AIProvider` 인터페이스의 `analyzeError()`, `generateFix()` 구현
3. 공유 `prompts.ts`와 `response-parser.ts`를 import해서 사용
4. SDK 호출 부분만 새로 작성하면 됨

## 주의사항

- 프롬프트를 어댑터 파일에 직접 작성하지 말 것. 반드시 `prompts.ts`에서 관리.
- AI 응답 파싱은 반드시 `response-parser.ts`를 통할 것. zod 검증이 빠지면 런타임 에러 위험.
- AI SDK는 `peerDependencies` (optional). 사용자가 해당 SDK를 설치하지 않으면 import 시 에러 발생함을 인지할 것.
