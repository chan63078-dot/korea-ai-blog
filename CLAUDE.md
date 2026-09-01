# korea-ai-blog — 코리아AI아카데미대구 블로그

## 프로젝트 개요
키워드 하나로 리서치 → 팩트체크 → 구조설계 → 초안 → 검수 → 발행까지 6단계 자동 실행하는 블로그 전용 사이트.
견적 계산기 사이트(`korea-it-quote`)와는 완전히 분리된 독립 저장소이며, GitHub Pages로 무료 배포된다.

- 사이트 주소: https://chan63078-dot.github.io/korea-ai-blog/
- 발행된 글은 `blog-posts/`에 저장되고 **git push 즉시 사이트에 반영**된다.

## 디렉토리 구조
```
korea-ai-blog/
├── index.html, post.html, archive.html, about.html   ← 정적 사이트 (빌드 불필요)
├── assets/style.css, assets/script.js
├── blog-posts/
│   ├── index.json        ← 발행된 글 목록 (사이트가 이 파일을 읽음)
│   └── {slug}_{YYYYMMDD}.md
├── context/               ← 톤·가독성·SEO·금지표현
├── drafts/                ← 작업 중간 파일 (git 제외)
└── .claude/
    ├── agents/            ← 6개 서브에이전트
    └── skills/, commands/ ← blog-pipeline
```

## 핵심 규칙 (항상 적용)
1. `context/` 폴더의 4개 파일(tone·forbidden·readability·seo)을 **항상** 먼저 읽고 시작한다
2. 오늘 날짜 기준 최신 정보만 사용한다
3. 팩트체커가 REJECTED 처리한 내용은 글에 포함하지 않는다
4. 새 키워드를 고를 때 `blog-posts/index.json`과 `Desktop\블로그 작성기` 폴더의 기존 주제·포맷을 확인해 겹치지 않게 한다. 포맷은 튜토리얼형·지역밀착형·이슈해설형·학습법비교형·직군소개형 5가지를 순환시킨다
5. 최종본은 `blog-posts/{slug}.md` 저장 + `index.json` 갱신 + `git push`까지 마쳐야 발행 완료로 본다. 동시에 `C:\Users\IT-대구\Desktop\블로그 작성기` 폴더에 `{YYYY-MM-DD}_{제목}.txt`로 이중 백업한다
6. 이 블로그 작업 파이프라인은 사용자가 전권을 위임했으므로, 각 단계·최종 발행 전 사용자 확인을 받지 않고 끝까지 자동으로 진행한다

## 에이전트 파이프라인
```
키워드 입력
  → [researcher]   웹 리서치 (haiku, 저비용)
  → [fact-checker] 사실 검증 (sonnet)
  → [planner]      글 구조 설계 (sonnet)
  → [writer]       초안 작성 (sonnet)
  → [reviewer]     품질 검수 (sonnet)
  → [publisher]    blog-posts/ 저장 + index.json 갱신 + git push + 로컬 txt 백업
```

## 배경
2026-08-06 이전에는 `korea-it-quote` 저장소 안에서 같은 파이프라인이 돌았으나, 견적 계산기 부속 탭에 블로그가 얹혀 노출이 약했고 GitHub Pages 접속 이슈까지 겹쳐 한동안 git push를 중단하고 로컬 저장까지만 했다. 2026-09-01, 블로그 전용 신규 저장소(`korea-ai-blog`)로 완전히 분리하며 자동 발행을 재개했다. 과거 접속 이슈가 재발할 수 있어 로컬 txt 백업은 계속 병행한다.
