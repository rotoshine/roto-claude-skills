---
name: roto-dep-audit
description: 프로젝트의 outdated/vulnerable 의존성을 탐지하고 업그레이드 방안을 제시합니다. "의존성 점검", "dependency audit", "outdated 패키지", "보안 취약점 확인" 등을 요청하면 이 스킬을 사용하세요.
user-invocable: true
---

# 의존성 감사 (Dependency Audit)

프로젝트의 outdated, deprecated, vulnerable 의존성을 탐지하고 업그레이드 방안을 제시합니다.

## 사용 방법

```text
/roto-dep-audit                # 전체 감사
/roto-dep-audit --security     # 보안 취약점만 확인
/roto-dep-audit --major        # major 업데이트만 확인
/roto-dep-audit [패키지명]      # 특정 패키지만 확인
```

## 워크플로우

### Step 1: 패키지 매니저 탐지

프로젝트의 패키지 매니저를 자동 탐지합니다:

- `yarn.lock` → yarn
- `pnpm-lock.yaml` → pnpm
- `package-lock.json` → npm
- 모노레포 여부 확인 (`workspaces`, `pnpm-workspace.yaml`)

### Step 2: Outdated 패키지 확인

```bash
# yarn
yarn outdated --json

# npm
npm outdated --json

# pnpm
pnpm outdated --json
```

### Step 3: 보안 취약점 확인

```bash
# npm audit
npm audit --json

# yarn
yarn audit --json
```

### Step 4: Deprecated 패키지 확인

각 의존성의 npm registry 상태를 확인하여 deprecated된 패키지를 탐지합니다.

### Step 5: 분석 보고서 생성

```markdown
## 의존성 감사 보고서

### 🔴 보안 취약점
| 패키지 | 현재 | 심각도 | CVE | 수정 버전 |
|--------|------|--------|-----|-----------|

### 🟠 Major 업데이트 가능
| 패키지 | 현재 | 최신 | Breaking Changes |
|--------|------|------|------------------|

### 🟡 Minor/Patch 업데이트
| 패키지 | 현재 | 최신 | 변경 내용 |
|--------|------|------|-----------|

### ⚫ Deprecated 패키지
| 패키지 | 대체 패키지 | 마이그레이션 가이드 |
|--------|------------|-------------------|

### 요약
- 총 의존성: N개
- outdated: N개
- 취약점: N개
- deprecated: N개
```

### Step 6: 업그레이드 제안

각 항목에 대해:
- 업그레이드 명령 제시
- Breaking changes 요약 (major 업데이트 시)
- 마이그레이션 가이드 링크
- 위험도 평가 (low/medium/high)
