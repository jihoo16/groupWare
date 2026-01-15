# 한글 폰트 설정 가이드

PDF 생성 시 한글 표시를 위해 폰트 파일이 필요합니다.

## 폰트 다운로드

### 방법 1: Noto Sans KR (권장)

1. Google Fonts에서 다운로드: https://fonts.google.com/noto/specimen/Noto+Sans+KR
2. "Download family" 버튼 클릭
3. 압축 해제 후 `NotoSansKR-Regular.ttf` 파일을 이 디렉토리에 복사

### 방법 2: Nanum Gothic

1. 네이버에서 다운로드: https://hangeul.naver.com/font
2. 나눔고딕 다운로드 후 압축 해제
3. `NanumGothic.ttf` 파일을 이 디렉토리에 복사

### 방법 3: Windows 맑은 고딕 사용

1. Windows의 `C:\Windows\Fonts\malgun.ttf` 파일을 복사
2. 이 디렉토리에 `malgun.ttf`로 저장

## 최종 파일 구조

```
src/main/resources/fonts/
├── README.md (이 파일)
└── NotoSansKR-Regular.ttf (또는 NanumGothic.ttf, malgun.ttf 중 하나)
```

## 라이선스 정보

- **Noto Sans KR**: OFL (Open Font License) - 상업적 사용 가능
- **Nanum Gothic**: OFL (Open Font License) - 상업적 사용 가능
- **맑은 고딕**: Microsoft 폰트 - 라이선스 확인 필요

## 주의사항

폰트 파일은 Git에 커밋하지 마세요. `.gitignore`에 `*.ttf` 패턴을 추가하는 것을 권장합니다.
