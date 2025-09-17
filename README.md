# ☁️ CloudIoTBE (Serverless 버전)

> AWS Lambda 기반의 헬스케어 IoT 백엔드  
> Fitbit, 운동 기록, Raspberry Pi 데이터 처리를 각기 독립된 Lambda 함수로 분산 배치한 Serverless 아키텍처입니다.

---

## 🧩 프로젝트 개요

이 프로젝트는 기존 EC2 기반 Node.js 백엔드를 AWS Lambda 기반 Serverless 구조로 전환한 형태입니다.  
Fitbit 연동, 운동 시작/종료 처리, 목표 설정/조회 등 각각의 기능을 독립된 Lambda 함수로 구성하고,  
`AWS SAM`을 통해 정의하고 배포됩니다.

---

## 📁 주요 디렉토리 구조

```
Serverless/
├── src/api/                # 실제 Lambda 함수 코드
│   ├── users/             # 사용자 관련 API
│   ├── exercise/          # 운동 기록 관련 API
│   ├── fitbit/            # Fitbit 연동 API
│   └── common/            # 공통 유틸/토큰 처리
├── layers/                # 공통 의존성 레이어
│   └── api-handler-basic-layer/
├── template.yaml          # SAM 템플릿 (함수 선언/리소스 명세)
├── samconfig.toml         # SAM 설정 파일
├── package.json           # 의존성
├── jest.config.ts         # 테스트 설정
├── tsconfig.json          # TypeScript 설정
```

---

## 🔌 주요 기능

| 기능 | 설명 |
|------|------|
| 사용자 인증 | JWT 기반 로그인, 사용자 등록 |
| Fitbit 연동 | OAuth2 인증, 사용자 활동 데이터 수집 |
| 운동 기록 | 운동 시작/종료 트리거, 칼로리 및 시간 저장 |
| 목표 설정 | 주간 목표 칼로리 설정 및 비교 |
| Raspberry Pi 연동 | IoTCore 또는 MQTT 기반 연동 (예정) |

---

## 📄 template.yaml 예시

SAM 템플릿 파일 `template.yaml`에는 각 함수의 위치와 API Gateway 경로가 정의되어 있습니다.

```yaml
Resources:
  GetUserFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/api/users/
      Handler: index.handler
      Runtime: nodejs18.x
      Events:
        GetUser:
          Type: Api
          Properties:
            Path: /user/{id}
            Method: get
```

---

## ☁️ Serverless 특성

- AWS Lambda 기반 무상태 아키텍처
- API Gateway로 외부 트래픽 수신
- SAM CLI를 활용한 로컬 개발 및 배포 자동화
- Layers 폴더를 통해 공통 의존성 관리

---

## ✅ 기술 스택

| 항목 | 기술 |
|------|------|
| 런타임 | Node.js 18 (TypeScript 혼용) |
| 아키텍처 | AWS Lambda + API Gateway |
| IaC | AWS SAM (Serverless Application Model) |
| 인증 | JWT |
| 테스팅 | Jest |
| 의존성 관리 | package.json + SAM layer
