---
name: roto-release-notes
description: 마지막 태그 이후 머지된 PR을 수집하여 릴리즈 노트를 자동 생성합니다. "릴리즈 노트", "release notes", "변경 이력", "배포 노트" 등을 요청하면 이 스킬을 사용하세요.
user-invocable: true
---

# 릴리즈 노트 자동 생성

마지막 태그(또는 지정 기준) 이후 머지된 PR을 수집하여 릴리즈 노트를 생성합니다.

## 사용 방법

```text
/roto-release-notes                    # 마지막 태그 이후 변경사항
/roto-release-notes --since v1.2.0     # 특정 태그 이후
/roto-release-notes --since 2026-01-01 # 특정 날짜 이후
/roto-release-notes --version v1.3.0   # 버전명 지정
```

## 워크플로우

### Step 1: 기준점 결정

```bash
# 마지막 태그
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null)

# 태그가 없으면 첫 커밋부터
if [ -z "$LAST_TAG" ]; then
  LAST_TAG=$(git rev-list --max-parents=0 HEAD)
fi
```

### Step 2: 머지된 PR 수집

```bash
# 마지막 태그 이후 머지된 PR 목록
gh pr list --state merged --base main --json number,title,labels,author,mergedAt \
  --jq "[.[] | select(.mergedAt > \"${SINCE_DATE}\")]"
```

### Step 3: PR 분류

PR 제목의 conventional commit prefix와 라벨을 기반으로 분류합니다:

| 카테고리 | prefix / 라벨 |
|----------|--------------|
| 새 기능 | `feat:`, `feature` |
| 버그 수정 | `fix:`, `bug` |
| 성능 개선 | `perf:` |
| 리팩터링 | `refactor:` |
| 문서 | `docs:` |
| 테스트 | `test:` |
| 인프라/설정 | `chore:`, `ci:`, `build:` |
| Breaking Changes | `BREAKING CHANGE`, `!` suffix |

### Step 4: 릴리즈 노트 생성

```markdown
# Release {version} — {YYYY-MM-DD}

## Highlights
{주요 변경사항 1~3문장 요약}

## 🚀 New Features
- {PR 제목} ([#{번호}](PR URL)) by @{author}

## 🐛 Bug Fixes
- {PR 제목} ([#{번호}](PR URL)) by @{author}

## ⚡ Performance
- ...

## 🔧 Improvements
- ...

## 📝 Documentation
- ...

## ⚠️ Breaking Changes
- ...

---

**Full Changelog**: [{이전태그}...{현재}](compare URL)
**Contributors**: @author1, @author2, ...
```

### Step 5: 출력 및 적용

- 터미널에 릴리즈 노트 출력
- `--publish` 플래그 시 `gh release create`로 GitHub Release 생성
- 파일로 저장할 경로를 지정할 수도 있음
