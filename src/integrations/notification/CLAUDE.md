# Notification Integration — Module Context

## 역할

엔진 실행 결과(PR 생성 성공/실패)를 외부 알림 채널(Slack 등)로 전송하는 레이어.

## 인터페이스

```typescript
interface NotificationProvider {
  notify(result: EngineResult, error: ParsedError): Promise<void>
}
```

- `result`: 성공이면 PR 정보 (`CreatedPR`), 실패면 에러 메시지
- `error`: 원본 에러 정보. 알림 메시지에 에러 요약을 포함하기 위해 같이 전달.
- notification은 선택 사항 — `EngineConfig`에서 `notification?`으로 정의.

## 현재 구현체

아직 없음. `slack.ts` 구현 예정.

Slack은 webhook URL로 POST 요청만 보내면 되므로 별도 SDK 불필요 (`fetch` 사용).

## 새 알림 도구 추가 방법

1. `{tool-name}.ts` 파일 생성
2. `NotificationProvider` 인터페이스의 `notify()` 구현
3. 성공/실패에 따라 적절한 알림 메시지 포맷팅
4. 외부 서비스 호출 (webhook, API 등)

## 주의사항

- 알림 실패가 엔진 전체를 멈추면 안 됨. 알림은 best-effort.
- 민감 정보(API 키, 토큰 등)를 알림 메시지에 포함하지 말 것.
