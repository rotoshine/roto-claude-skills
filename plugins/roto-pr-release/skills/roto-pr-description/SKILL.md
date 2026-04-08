---
name: roto-pr-description
description: 커밋 히스토리와 diff를 분석하여 PR title과 body를 자동 생성합니다. "PR 설명 생성", "PR body 만들어줘", "pr description" 등을 요청하면 이 스킬을 사용하세요.
user-invocable: true
---

# PR Description 자동 생성

현재 브랜치의 커밋 히스토리와 diff를 분석하여 PR title과 body를 자동 생성합니다.

## 사용 방법

```text
/roto-pr-description              # PR이 없으면 생성, 있으면 업데이트
/roto-pr-description --update     # 기존 PR body만 업데이트
/roto-pr-description --dry-run    # 생성만 하고 적용하지 않음 (미리보기)
```

## 워크플로우

### Step 1: 브랜치 상태 확인

```bash
git fetch origin
BRANCH=$(git branch --show-current)
BASE=$(gh pr view --json baseRefName --jq .baseRefName 2>/dev/null || echo "main")
```

- 현재 브랜치와 base 브랜치 확인
- 기존 PR 존재 여부 확인

### Step 2: 변경사항 수집

```bash
# 커밋 히스토리
git log origin/${BASE}..HEAD --oneline --no-merges

# 전체 diff 통계
git diff origin/${BASE}...HEAD --stat

# 변경 파일 목록
git diff origin/${BASE}...HEAD --name-status
```

### Step 3: Diff 분석

변경 파일을 카테고리별로 분류합니다:

| 카테고리 | 패턴 |
|----------|------|
| 컴포넌트 | `*.tsx` (components, app 디렉토리) |
| 스타일 | `*.css`, `*.scss` |
| 로직/유틸 | `*.ts` (lib, utils, actions) |
| 테스트 | `*.test.*`, `*.spec.*` |
| 설정 | `*.json`, `*.config.*`, `*.md` |
| i18n | `messages/*.json` |
| API | `api/**`, `route.ts` |

### Step 4: PR Title 생성

커밋 메시지와 변경 내용을 분석하여 제목을 생성합니다:

- 70자 이내
- conventional commit 형식 (`feat:`, `fix:`, `refactor:` 등)
- 변경의 핵심을 한 문장으로 요약

### Step 5: PR Body 생성

```markdown
## Summary
- 핵심 변경사항 1~3개 bullet point

## Changes
### 새 기능 / 수정 / 리팩터링
- 변경 내용 설명 (diff 분석 기반)

## 📸 UI 스크린샷
(UI 변경이 있고 스크린샷 파일이 존재하면 자동 포함)

## Test plan
- [ ] 테스트 항목 (변경 내용 기반으로 자동 생성)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### Step 6: PR 생성 또는 업데이트

- **PR이 없는 경우**: `gh pr create --title "..." --body "..."`
- **PR이 있는 경우**: `gh pr edit --body "..."`
- **`--dry-run`**: 생성된 내용을 출력만 하고 적용하지 않음

### Step 7: 결과 출력

PR URL과 생성/업데이트 여부를 출력합니다.

## 스크린샷 자동 포함

프로젝트에 `.screenshots/` 디렉토리가 있고 light/dark 스크린샷이 존재하면,
PR body에 스크린샷 테이블을 자동으로 포함합니다:

```markdown
## 📸 UI 스크린샷

### {컴포넌트명}
| Light | Dark |
|-------|------|
| ![light](...-light.png?raw=true) | ![dark](...-dark.png?raw=true) |
```
