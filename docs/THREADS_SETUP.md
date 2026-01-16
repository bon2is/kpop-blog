# Threads API Setup Guide

Threads 자동 포스팅을 위한 설정 가이드입니다.

## Prerequisites

1. **Instagram Business/Creator 계정** (개인 계정은 불가)
2. **Meta Developer 계정**
3. **Facebook Page** (Instagram과 연결된)

---

## Step 1: Meta Developer App 생성

1. [Meta Developer Portal](https://developers.facebook.com/)에 접속
2. **My Apps** > **Create App** 클릭
3. **Other** > **Business** 선택
4. App 이름 입력 (예: "KPOP Daily Auto Post")
5. **Create app** 클릭

---

## Step 2: Threads API 추가

1. 생성된 App 대시보드에서 **Add Products** 클릭
2. **Threads** 찾아서 **Set up** 클릭
3. **Use cases** > **Threads API** 선택

---

## Step 3: Instagram Business 계정 연결

1. **App Settings** > **Basic** 이동
2. 아래로 스크롤하여 **Add Platform** > **Website** 추가
3. Site URL: `https://kpop.andxo.com`

### Instagram 연결:
1. **Threads** > **Settings** 이동
2. **Add Instagram accounts** 클릭
3. Instagram Business 계정으로 로그인
4. 권한 승인

---

## Step 4: Access Token 발급

### 4.1 Short-lived Token 발급
1. **Threads** > **Generate access tokens** 이동
2. 연결된 Instagram 계정 선택
3. **Generate token** 클릭
4. 토큰 복사 (1시간 유효)

### 4.2 Long-lived Token으로 변환 (중요!)

Short-lived 토큰을 Long-lived 토큰으로 변환해야 합니다 (60일 유효):

```bash
curl -X GET "https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret={APP_SECRET}&access_token={SHORT_LIVED_TOKEN}"
```

**APP_SECRET**는 App Dashboard > **Settings** > **Basic** > **App secret**에서 확인

응답:
```json
{
  "access_token": "LONG_LIVED_ACCESS_TOKEN",
  "token_type": "bearer",
  "expires_in": 5184000
}
```

### 4.3 토큰 자동 갱신

Long-lived 토큰은 60일 유효합니다. 만료 전에 갱신:

```bash
curl -X GET "https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token={LONG_LIVED_TOKEN}"
```

---

## Step 5: User ID 확인

토큰을 사용하여 User ID 조회:

```bash
curl -X GET "https://graph.threads.net/v1.0/me?fields=id,username&access_token={ACCESS_TOKEN}"
```

응답:
```json
{
  "id": "123456789",
  "username": "kpopdaily"
}
```

---

## Step 6: GitHub Secrets 설정

1. GitHub Repository로 이동
2. **Settings** > **Secrets and variables** > **Actions**
3. 다음 secrets 추가:

| Secret Name | Value |
|-------------|-------|
| `THREADS_USER_ID` | Step 5에서 얻은 `id` 값 |
| `THREADS_ACCESS_TOKEN` | Step 4.2에서 얻은 long-lived token |

---

## Step 7: 로컬 테스트

```bash
# .env 파일에 추가
THREADS_USER_ID=123456789
THREADS_ACCESS_TOKEN=your-long-lived-token

# 테스트 실행
npm run post-threads
```

---

## Troubleshooting

### 오류: "Invalid OAuth access token"
- 토큰이 만료되었습니다. Step 4.3으로 갱신하세요.

### 오류: "User does not have Threads account"
- Instagram 계정에 Threads가 활성화되어 있지 않습니다.
- Threads 앱에서 해당 Instagram 계정으로 로그인하세요.

### 오류: "Media container creation failed"
- 이미지 URL이 공개적으로 접근 가능해야 합니다.
- HTTPS URL만 지원됩니다.

### Rate Limits
- 하루 최대 250개 포스팅
- 요청 간 최소 3초 간격 권장

---

## API Reference

### Endpoints

| Action | Endpoint |
|--------|----------|
| Create container | `POST /{user_id}/threads` |
| Publish thread | `POST /{user_id}/threads_publish` |
| Get user info | `GET /me` |

### 지원 미디어 타입

- `TEXT`: 텍스트만
- `IMAGE`: 이미지 + 텍스트
- `VIDEO`: 비디오 + 텍스트 (최대 5분)
- `CAROUSEL`: 여러 이미지/비디오

---

## Token 갱신 자동화 (선택사항)

60일마다 토큰을 갱신하는 GitHub Actions 워크플로우:

```yaml
name: Refresh Threads Token

on:
  schedule:
    - cron: '0 0 1 */2 *'  # 2개월마다 1일에 실행

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Refresh token
        run: |
          RESPONSE=$(curl -s "https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${{ secrets.THREADS_ACCESS_TOKEN }}")
          echo "Token refreshed. Update THREADS_ACCESS_TOKEN secret manually."
          echo "$RESPONSE"
```

---

## 포스팅 형식

자동 포스팅되는 형식:

```
[기사 제목]

[요약 (최대 150자)]

Read more: https://kpop.andxo.com/article/[slug]

#KPOP #KPOPNews #[그룹명] #KPOPDaily
```

### 예시:
```
BLACKPINK Jennie's Stunning Red Carpet Appearance at the 40th Golden Disc Awards

Jennie from BLACKPINK captivated fans with her elegant appearance at the Golden Disc Awards, showcasing...

Read more: https://kpop.andxo.com/article/blackpink-jennies-stunning-red-carpet-6e20d40906da

#KPOP #KPOPFashion #BLACKPINK #BLINK #KPOPDaily
```

---

## 관련 문서

- [Threads API Documentation](https://developers.facebook.com/docs/threads)
- [Meta Developer Portal](https://developers.facebook.com/)
