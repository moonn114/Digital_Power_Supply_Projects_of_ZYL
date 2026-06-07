/**
 * 数字电源项目博客 — 首页脚本
 * 功能：文章列表、分类筛选、标签云、搜索、归档
 */

// --- 内联回退数据 ---
const POSTS_FALLBACK = [
  {
    "id": "001", "title": "基于STM32F103C8T6的 120W同步Boost升压变换器设计",
    "date": "2026-04-15", "category": "数字电源设计",
    "tags": ["DC-DC", "Boost", "STM32", "PID控制"],
    "summary": "设计并实现了一款基于STM32F103C8T6的数字控制120W同步Boost升压变换器，采用数字PID闭环控制，支持恒压输出，效率最高达94%。",
    "file": "001_Boost-Converter.md"
  },
  
  {
    "id": "002", "title": "STM32G431C8T6控制的300W 四开关Buck-Boost电路",
    "date": "2026-06-07", "category": "数字电源设计",
    "tags": ["Buck-Boost", "四开关", "STM32G431", "HRTIM", "数字电源"],
    "summary": "基于STM32G431C8T6数字控制的四开关Buck-Boost变换器，支持5V~36V输入、3.3V~24V输出，额定功率300W，峰值效率97.2%，采用平均电流模式+电压外环级联PI控制。",
    "file": "002_Four_Switch_buck_boost.md"
  },
  {
    "id": "003", "title": "基于STM32F103C8T6的120W反激电源设计",
    "date": "2026-06-08", "category": "数字电源设计",
    "tags": ["DC-DC", "反激", "STM32", "PID控制"],
    "summary": "设计并实现了一款基于STM32F103C8T6的数字控制120W反激电源，采用数字PID闭环控制，支持恒压输出，效率最高达94%。",
    "file": "003_Fly_Back.md"
  }
];

let allPosts = [];

// --- 加载文章索引 ---
async function loadPosts() {
  try {
    const resp = await fetch('./data/posts.json');
    if (!resp.ok) throw new Error('Failed');
    return await resp.json();
  } catch {
    console.warn('使用内联数据（建议运行本地服务器获得完整功能）');
    return POSTS_FALLBACK;
  }
}

// --- 工具函数 ---
function getAllCategories(posts) {
  const cats = {};
  posts.forEach(p => {
    const c = p.category || '未分类';
    cats[c] = (cats[c] || 0) + 1;
  });
  return Object.entries(cats).sort((a, b) => b[1] - a[1]);
}

function getAllTags(posts) {
  const tagMap = {};
  posts.forEach(p => p.tags.forEach(t => {
    tagMap[t] = (tagMap[t] || 0) + 1;
  }));
  return Object.entries(tagMap).sort((a, b) => b[1] - a[1]);
}

function getArchives(posts) {
  const arch = {};
  posts.forEach(p => {
    const ym = p.date.substring(0, 7); // YYYY-MM
    arch[ym] = (arch[ym] || 0) + 1;
  });
  return Object.entries(arch).sort((a, b) => b[0].localeCompare(a[0]));
}

// --- 渲染文章列表 ---
function renderArticleList(posts) {
  const list = document.getElementById('article-list');
  const empty = document.getElementById('empty-state');
  if (!list) return;

  if (posts.length === 0) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  list.innerHTML = posts.map(p => `
    <div class="article-item" onclick="location.href='./post.html?id=${p.file}'">
      <div class="item-title">
        <a href="/post.html?id=${p.file}">${p.title}</a>
      </div>
      <div class="item-meta">
        <span class="category">${p.category || '未分类'}</span>
        <span class="date">📅 ${p.date}</span>
      </div>
      <p class="item-summary">${p.summary}</p>
    </div>
  `).join('');
}

// --- 渲染筛选按钮 ---
function renderFilterBar(posts) {
  const bar = document.getElementById('filter-bar');
  if (!bar) return;
  const categories = getAllCategories(posts);
  bar.innerHTML = `
    <button class="active" data-cat="all" style="padding:5px 14px;border-radius:14px;border:1px solid var(--border);background:var(--accent);color:#fff;cursor:pointer;font-size:0.82rem;margin-right:8px;font-family:var(--font-sans);">全部 (${posts.length})</button>
    ${categories.map(([cat, count]) => `
      <button data-cat="${cat}" style="padding:5px 14px;border-radius:14px;border:1px solid var(--border);background:transparent;color:var(--text-secondary);cursor:pointer;font-size:0.82rem;margin-right:8px;margin-bottom:4px;font-family:var(--font-sans);transition:all 0.2s;">${cat} (${count})</button>
    `).join('')}
  `;

  bar.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('button').forEach(b => {
        b.style.background = 'transparent';
        b.style.color = 'var(--text-secondary)';
        b.classList.remove('active');
      });
      btn.style.background = 'var(--accent)';
      btn.style.color = '#fff';
      btn.classList.add('active');

      const cat = btn.dataset.cat;
      const filtered = cat === 'all' ? allPosts : allPosts.filter(p => (p.category || '未分类') === cat);
      // 收起过滤时也考虑当前搜索词
      const query = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
      const final = query ? filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.summary.toLowerCase().includes(query) ||
        p.tags.some(t => t.toLowerCase().includes(query))
      ) : filtered;
      renderArticleList(final);
    });
  });
}

// --- 渲染侧边栏 ---
function renderSidebar(posts) {
  renderCategoryList(posts);
  renderTagCloud(posts);
  renderArchiveList(posts);
}

function renderCategoryList(posts) {
  const el = document.getElementById('category-list');
  if (!el) return;
  const cats = getAllCategories(posts);
  el.innerHTML = cats.map(([cat, count]) => `
    <li><a href="#" data-cat="${cat}" class="sidebar-cat-link">${cat}<span class="count">${count}</span></a></li>
  `).join('');

  el.querySelectorAll('.sidebar-cat-link').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const cat = a.dataset.cat;
      document.querySelectorAll('#filter-bar button').forEach(b => {
        b.style.background = 'transparent';
        b.style.color = 'var(--text-secondary)';
        b.classList.remove('active');
      });
      const target = document.querySelector(`#filter-bar button[data-cat="${cat}"]`);
      if (target) {
        target.style.background = 'var(--accent)';
        target.style.color = '#fff';
        target.classList.add('active');
      }
      renderArticleList(allPosts.filter(p => (p.category || '未分类') === cat));
    });
  });
}

function renderTagCloud(posts) {
  const el = document.getElementById('tag-cloud');
  if (!el) return;
  const tags = getAllTags(posts);
  el.innerHTML = tags.map(([tag, count]) => `
    <a href="#" data-tag="${tag}" class="tag-link">${tag} (${count})</a>
  `).join('');

  el.querySelectorAll('.tag-link').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const tag = a.dataset.tag;
      document.querySelectorAll('#filter-bar button').forEach(b => {
        b.style.background = 'transparent';
        b.style.color = 'var(--text-secondary)';
        b.classList.remove('active');
      });
      renderArticleList(allPosts.filter(p => p.tags.includes(tag)));
    });
  });
}

function renderArchiveList(posts) {
  const el = document.getElementById('archive-list');
  if (!el) return;
  const arch = getArchives(posts);
  el.innerHTML = arch.map(([ym, count]) => `
    <li><a href="#" data-ym="${ym}" class="archive-link">${ym}<span class="count">${count}</span></a></li>
  `).join('');

  el.querySelectorAll('.archive-link').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const ym = a.dataset.ym;
      document.querySelectorAll('#filter-bar button').forEach(b => {
        b.style.background = 'transparent';
        b.style.color = 'var(--text-secondary)';
        b.classList.remove('active');
      });
      renderArticleList(allPosts.filter(p => p.date.startsWith(ym)));
    });
  });
}

// --- 搜索功能 ---
function setupSearch(posts) {
  const input = document.getElementById('search-input');
  const btn = document.getElementById('search-btn');
  if (!input) return;

  const doSearch = () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      // 恢复全部
      renderArticleList(allPosts);
      document.querySelectorAll('#filter-bar button').forEach(b => {
        b.style.background = 'transparent';
        b.style.color = 'var(--text-secondary)';
      });
      const allBtn = document.querySelector('#filter-bar button[data-cat="all"]');
      if (allBtn) { allBtn.style.background = 'var(--accent)'; allBtn.style.color = '#fff'; }
      return;
    }
    const results = allPosts.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.summary.toLowerCase().includes(query) ||
      p.tags.some(t => t.toLowerCase().includes(query))
    );
    renderArticleList(results);
  };

  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
}

// --- 初始化 ---
async function init() {
  const data = await loadPosts();
  allPosts = data.sort((a, b) => new Date(b.date) - new Date(a.date));

  renderFilterBar(allPosts);
  renderArticleList(allPosts);
  renderSidebar(allPosts);
  setupSearch(allPosts);
}

document.addEventListener('DOMContentLoaded', init);
