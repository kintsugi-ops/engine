# Error Monitoring Integration — Module Context

## 역할

에러 모니터링 도구(Sentry 등)의 webhook payload를 받아 엔진이 이해하는 `ParsedError` 형식으로 변환하는 파싱 레이어.

## 인터페이스

```typescript
interface ErrorMonitoringProvider {
  parse(rawPayload: unknown): ParsedError
}
```

`rawPayload`는 `unknown` — 외부에서 들어오는 JSON이므로 반드시 런타임 검증(zod) 필요.

## 현재 구현체

### SentryProvider (`sentry.ts`)

- Sentry **Error webhook** (Issue webhook 아님) payload를 파싱
- `in_app: true`인 stack frame만 `affectedFiles`로 추출
- `affectedFiles`는 AI에게 주는 힌트 역할. 최종 파일 선택은 AI가 판단.
- zod 스키마로 payload 검증. 우리가 쓰는 필드만 정의 (Sentry payload는 훨씬 크지만 나머지는 무시).

## 새 에러 모니터링 도구 추가 방법

1. `{tool-name}.ts` 파일 생성
2. `ErrorMonitoringProvider` 인터페이스의 `parse()` 구현
3. 해당 도구의 webhook payload를 zod 스키마로 정의
4. `ParsedError` 형식으로 변환하여 리턴

## 주의사항

- `rawPayload`는 항상 `unknown`. 절대 `any`로 캐스팅하지 말 것.
- zod 스키마에 필요한 필드만 정의. 불필요한 필드까지 검증하면 도구 업데이트 시 깨질 수 있음.
- `level`은 `'fatal' | 'error'`만 허용. 다른 값은 `'error'`로 정규화.
