---
name: roto-dead-code
description: 미사용 export, 미참조 파일, 순환 의존성 등 dead code를 탐지합니다. "dead code", "미사용 코드", "사용하지 않는 코드", "unused exports", "순환 의존성" 등을 요청하면 이 스킬을 사용하세요.
user-invocable: true
---

# Dead Code 탐지

프로젝트에서 미사용 export, 미참조 파일, 순환 의존성 등을 탐지합니다.

## 사용 방법

```text
/roto-dead-code                    # 전체 탐지
/roto-dead-code [디렉토리]          # 특정 디렉토리만 분석
/roto-dead-code --exports          # 미사용 export만 확인
/roto-dead-code --files            # 미참조 파일만 확인
/roto-dead-code --circular         # 순환 의존성만 확인
```

## 워크플로우

### Step 1: 프로젝트 구조 파악

```bash
# TypeScript/JavaScript 소스 파일 수집 (node_modules, dist, .next 등 제외)
find src -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next
```

tsconfig.json의 paths, baseUrl 등 alias 설정도 확인합니다.

### Step 2: 미사용 Export 탐지

각 파일의 export를 추출하고 다른 파일에서 import되는지 확인합니다:

1. 모든 파일에서 `export` 문 추출 (named export, default export)
2. 모든 파일에서 `import` 문 추출
3. export되었지만 어디에서도 import되지 않는 심볼 식별

**제외 대상**:
- `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` 등 Next.js 컨벤션 파일의 default export
- `*.stories.tsx`의 export (Storybook이 동적으로 로드)
- `*.test.*`의 export
- `route.ts`의 HTTP 메서드 export (GET, POST 등)
- barrel export 파일 (`index.ts`)

### Step 3: 미참조 파일 탐지

어떤 파일에서도 import되지 않는 소스 파일을 식별합니다.

**제외 대상**:
- 엔트리 포인트 (page, layout, route, middleware 등)
- 설정 파일 (config, env 등)
- 테스트/스토리북 파일
- 타입 선언 파일 (`*.d.ts`)

### Step 4: 순환 의존성 탐지

import 그래프를 구축하고 cycle을 탐지합니다:

```
A → B → C → A  (순환!)
```

각 순환 경로를 보고합니다.

### Step 5: 보고서 생성

```markdown
## Dead Code 분석 보고서

### 📊 요약
- 분석 파일: N개
- 미사용 export: N개
- 미참조 파일: N개
- 순환 의존성: N개

### 🔴 미사용 Export
| 파일 | Export | 타입 | 마지막 사용 커밋 |
|------|--------|------|----------------|

### 🟠 미참조 파일
| 파일 | 크기 | 생성일 | 비고 |
|------|------|--------|------|

### 🟡 순환 의존성
| 순환 경로 | 깊이 |
|-----------|------|
| A → B → C → A | 3 |

### 권장 조치
- 삭제 가능: N개 (확신도 높음)
- 확인 필요: N개 (동적 import 가능성)
```

## 주의사항

- 동적 import (`import()`, `require()`)는 정적 분석으로 탐지 불가 — false positive 가능
- Storybook, Jest 등에서 glob 패턴으로 로드하는 파일도 false positive 가능
- `git log`로 마지막 사용 시점을 확인하여 삭제 판단 보조
