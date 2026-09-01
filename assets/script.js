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

function postCardHTML(post) {
  return `
    <a class="post-card" href="post.html?slug=${encodeURIComponent(post.file)}">
      <div class="tags">${tagsHTML(post.tags)}</div>
      <h3>${escapeHTML(post.title)}</h3>
      <p class="excerpt">${escapeHTML(post.preview || '')}</p>
      <div class="meta"><span>${formatDate(post.date)}</span><span>${post.chars ? post.chars + '자' : ''}</span></div>
    </a>`;
}

function renderGrid(container, posts) {
  if (!posts.length) {
    container.innerHTML = '<p class="empty-note">아직 발행된 글이 없습니다.</p>';
    return;
  }
  container.innerHTML = posts.map(postCardHTML).join('');
}

// ---- home ----
async function initHome() {
  const grid = document.getElementById('latest-grid');
  if (!grid) return;
  try {
    const posts = await fetchPosts();
    renderGrid(grid, posts.slice(0, 6));
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

  let posts = [];
  let activeTag = null;

  function applyFilters() {
    const q = (searchInput.value || '').trim().toLowerCase();
    const filtered = posts.filter(p => {
      const tagOk = !activeTag || (p.tags || []).includes(activeTag);
      const qOk = !q || p.title.toLowerCase().includes(q) || (p.preview || '').toLowerCase().includes(q);
      return tagOk && qOk;
    });
    renderGrid(grid, filtered);
    countEl.textContent = `${filtered.length}건`;
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
      <div class="meta">${formatDate(post.date)} · ${post.chars ? post.chars + '자' : ''}</div>`;
    document.getElementById('post-body').innerHTML = bodyHTML;

    const related = posts
      .filter(p => p.file !== post.file && (p.tags || []).some(t => (post.tags || []).includes(t)))
      .slice(0, 3);
    const relatedSection = document.getElementById('related');
    if (related.length) {
      relatedSection.innerHTML = '<h2>관련 글</h2><div class="card-grid">' + related.map(postCardHTML).join('') + '</div>';
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
