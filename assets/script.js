// 코리아AI아카데미 블로그 — 공용 스크립트 (프레임워크/빌드 없음)

const POSTS_URL = 'blog-posts/index.json';

async function fetchPosts() {
  const res = await fetch(POSTS_URL);
  if (!res.ok) throw new Error('index.json 로드 실패: ' + res.status);
  const data = await res.json();
  return (data.posts || []).slice().sort((a, b) => b.date.localeCompare(a.date));
}

function formatDate(d) {
  const [y, m, day] = d.split('-');
  return `${y}.${m}.${day}`;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function tagsHTML(tags) {
  return (tags || []).map(t => `<span class="tag">${escapeHTML(t)}</span>`).join('');
}

// ---- "다른 곳에 옮겨 씀" 체크 상태 (이 브라우저에만 저장됨) ----
const MOVED_KEY = 'korea-ai-blog:moved';

function loadMoved() {
  try {
    return new Set(JSON.parse(localStorage.getItem(MOVED_KEY) || '[]'));
  } catch (e) {
    return new Set();
  }
}

function saveMoved(set) {
  try {
    localStorage.setItem(MOVED_KEY, JSON.stringify([...set]));
  } catch (e) { /* 저장 불가 환경(시크릿 모드 등) — 조용히 무시 */ }
}

function postCardHTML(post, moved) {
  const isMoved = moved && moved.has(post.file);
  return `
    <div class="post-card${isMoved ? ' is-moved' : ''}" data-slug="${escapeHTML(post.file)}">
      <div class="card-actions">
        <button type="button" class="copy-btn" data-slug="${escapeHTML(post.file)}" title="다른 블로그에 붙여넣을 텍스트 복사">복사</button>
        <label class="move-check" title="다른 곳에 옮겨 작성함">
          <input type="checkbox" data-slug="${escapeHTML(post.file)}" ${isMoved ? 'checked' : ''} aria-label="다른 곳에 옮겨 작성함">
          <span class="box"></span>
        </label>
      </div>
      <a class="card-link" href="post.html?slug=${encodeURIComponent(post.file)}">
        <div class="tags">${tagsHTML(post.tags)}</div>
        <h3>${escapeHTML(post.title)}</h3>
        <p class="excerpt">${escapeHTML(post.preview || '')}</p>
        <div class="meta"><span>${formatDate(post.date)}</span><span>${post.chars ? post.chars + '자' : ''}</span></div>
      </a>
    </div>`;
}

// ---- 마크다운 → 다른 블로그(네이버 등)에 붙여넣기 좋은 평문 변환 ----
function markdownToPlainText(md) {
  return md
    .replace(/^#{1,6}\s*/gm, '')          // ## 제목 -> 제목
    .replace(/\*\*(.+?)\*\*/g, '$1')      // **굵게** -> 굵게
    .replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, '$1') // *기울임* -> 기울임
    .replace(/^>\s?/gm, '')               // > 인용 -> 인용
    .replace(/^-{3,}$/gm, '')             // 구분선 제거
    .replace(/\n{3,}/g, '\n\n')           // 빈 줄 3개 이상 -> 2개
    .trim();
}

async function copyPostBySlug(slug, posts) {
  const post = posts.find(p => p.file === slug);
  if (!post) return false;
  const res = await fetch('blog-posts/' + post.file);
  const raw = await res.text();
  const body = markdownToPlainText(stripFrontmatter(raw));
  const text = `${post.title}\n\n${body}`;
  await copyToClipboard(text);
  return true;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // 클립보드 API 불가 환경 대비 fallback
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch (e2) {
      return false;
    }
  }
}

function flashButton(btn, label) {
  const original = btn.textContent;
  btn.textContent = label;
  btn.classList.add('copied');
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('copied');
  }, 1400);
}

// 그리드 컨테이너 하나에 복사 버튼 위임 연결
function wireCopyButtons(container, postsPromiseOrArray) {
  container.addEventListener('click', async e => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    e.preventDefault();
    const slug = btn.dataset.slug;
    const posts = typeof postsPromiseOrArray.then === 'function' ? await postsPromiseOrArray : postsPromiseOrArray;
    btn.disabled = true;
    const ok = await copyPostBySlug(slug, posts).catch(() => false);
    btn.disabled = false;
    flashButton(btn, ok ? '복사됨' : '실패');
  });
}

function renderGrid(container, posts, moved) {
  if (!posts.length) {
    container.innerHTML = '<p class="empty-note">아직 발행된 글이 없습니다.</p>';
    return;
  }
  container.innerHTML = posts.map(p => postCardHTML(p, moved)).join('');
}

// 그리드 컨테이너 하나에 체크박스 토글을 위임 연결
function wireMoveChecks(container, moved, onChange) {
  container.addEventListener('change', e => {
    const input = e.target.closest('input[type="checkbox"][data-slug]');
    if (!input) return;
    const slug = input.dataset.slug;
    if (input.checked) moved.add(slug); else moved.delete(slug);
    saveMoved(moved);
    input.closest('.post-card').classList.toggle('is-moved', input.checked);
    if (onChange) onChange();
  });
}

// ---- home ----
async function initHome() {
  const grid = document.getElementById('latest-grid');
  if (!grid) return;
  const moved = loadMoved();
  try {
    const posts = await fetchPosts();
    renderGrid(grid, posts.slice(0, 6), moved);
    wireMoveChecks(grid, moved);
    wireCopyButtons(grid, posts);
  } catch (e) {
    grid.innerHTML = '<p class="empty-note">글 목록을 불러오지 못했습니다.</p>';
    console.error(e);
  }
}

// ---- archive ----
async function initArchive() {
  const grid = document.getElementById('archive-grid');
  if (!grid) return;
  const filterBar = document.getElementById('tag-filters');
  const searchInput = document.getElementById('search-input');
  const countEl = document.getElementById('result-count');
  const moveFilter = document.getElementById('move-filter');
  const moved = loadMoved();

  let posts = [];
  let activeTag = null;

  function applyFilters() {
    const q = (searchInput.value || '').trim().toLowerCase();
    const moveMode = moveFilter.value; // 'all' | 'pending' | 'moved'
    const filtered = posts.filter(p => {
      const tagOk = !activeTag || (p.tags || []).includes(activeTag);
      const qOk = !q || p.title.toLowerCase().includes(q) || (p.preview || '').toLowerCase().includes(q);
      const isMoved = moved.has(p.file);
      const moveOk = moveMode === 'all' || (moveMode === 'moved' ? isMoved : !isMoved);
      return tagOk && qOk && moveOk;
    });
    renderGrid(grid, filtered, moved);
    countEl.textContent = `${filtered.length}건 (옮김 ${moved.size}/${posts.length})`;
  }

  try {
    posts = await fetchPosts();
  } catch (e) {
    grid.innerHTML = '<p class="empty-note">글 목록을 불러오지 못했습니다.</p>';
    console.error(e);
    return;
  }

  const allTags = [...new Set(posts.flatMap(p => p.tags || []))];
  filterBar.innerHTML = ['<button class="tag-filter" data-tag="" aria-pressed="true">전체</button>']
    .concat(allTags.map(t => `<button class="tag-filter" data-tag="${escapeHTML(t)}" aria-pressed="false">${escapeHTML(t)}</button>`))
    .join('');

  filterBar.addEventListener('click', e => {
    const btn = e.target.closest('.tag-filter');
    if (!btn) return;
    activeTag = btn.dataset.tag || null;
    filterBar.querySelectorAll('.tag-filter').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    applyFilters();
  });
  searchInput.addEventListener('input', applyFilters);
  moveFilter.addEventListener('change', applyFilters);
  wireMoveChecks(grid, moved, applyFilters);
  wireCopyButtons(grid, posts);

  applyFilters();
}

// ---- post detail ----
function stripFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  return m ? m[2].trim() : raw.trim();
}

function decorateImageNotes(html) {
  // turns standalone "[이미지 ...]" / "[관련 글 ...]" paragraphs into a styled placeholder note
  return html.replace(/<p>(\[[^<]*\])<\/p>/g, '<div class="img-note">$1</div>');
}

async function initPost() {
  const root = document.getElementById('post-root');
  if (!root) return;

  const params = new URLSearchParams(location.search);
  const slug = params.get('slug');

  try {
    const posts = await fetchPosts();
    const post = posts.find(p => p.file === slug);
    if (!post) {
      root.innerHTML = '<p class="empty-note">글을 찾을 수 없습니다. <a href="archive.html">전체 글 목록으로</a></p>';
      return;
    }

    document.title = `${post.title} — 코리아AI아카데미 블로그`;

    const mdRes = await fetch('blog-posts/' + post.file);
    const raw = await mdRes.text();
    const body = stripFrontmatter(raw);
    const bodyHTML = decorateImageNotes(marked.parse(body));

    document.getElementById('post-head').innerHTML = `
      <div class="tags">${tagsHTML(post.tags)}</div>
      <h1>${escapeHTML(post.title)}</h1>
      <div class="meta-row">
        <div class="meta">${formatDate(post.date)} · ${post.chars ? post.chars + '자' : ''}</div>
        <button type="button" class="copy-btn copy-btn-lg" id="copy-post-btn">다른 블로그용으로 복사</button>
      </div>`;
    document.getElementById('post-body').innerHTML = bodyHTML;

    const plainText = `${post.title}\n\n${markdownToPlainText(body)}`;
    document.getElementById('copy-post-btn').addEventListener('click', async () => {
      const btn = document.getElementById('copy-post-btn');
      btn.disabled = true;
      const ok = await copyToClipboard(plainText);
      btn.disabled = false;
      flashButton(btn, ok ? '복사됨 — 붙여넣기 하세요' : '복사 실패');
    });

    const related = posts
      .filter(p => p.file !== post.file && (p.tags || []).some(t => (post.tags || []).includes(t)))
      .slice(0, 3);
    const relatedSection = document.getElementById('related');
    if (related.length) {
      const moved = loadMoved();
      relatedSection.innerHTML = '<h2>관련 글</h2><div class="card-grid">' + related.map(p => postCardHTML(p, moved)).join('') + '</div>';
      wireMoveChecks(relatedSection, moved);
      wireCopyButtons(relatedSection, posts);
    }
  } catch (e) {
    root.innerHTML = '<p class="empty-note">글을 불러오지 못했습니다.</p>';
    console.error(e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initHome();
  initArchive();
  initPost();
});
