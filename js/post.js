/**
 * 数字电源项目博客 — 文章详情页脚本
 * 功能：Markdown 渲染、TOC 目录、代码高亮、评论加载
 */

let currentPost = null;

// --- 加载文章元数据 ---
async function loadPostMeta() {
  try {
    const resp = await fetch('/data/posts.json');
    if (resp.ok) return await resp.json();
  } catch {}
  return null;
}

// --- 加载 Markdown 内容 ---
async function loadMarkdown(filename) {
  try {
    const resp = await fetch('/posts/' + filename);
    if (!resp.ok) throw new Error('Post not found');
    return await resp.text();
  } catch (err) {
    return null;
  }
}

// --- 生成 TOC ---
function generateTOC(html) {
  // 从渲染后的 HTML 提取 h2/h3 生成目录
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const headings = doc.querySelectorAll('h2, h3');
  if (headings.length === 0) return null;

  const tocItems = [];
  headings.forEach((h, i) => {
    const id = 'heading-' + i;
    h.id = id;
    tocItems.push({ level: h.tagName.toLowerCase(), text: h.textContent, id: id });
  });

  return { tocItems, modifiedHtml: doc.body.innerHTML };
}

function renderTOC(items) {
  const tocContainer = document.getElementById('toc');
  const tocList = document.getElementById('toc-list');
  if (!tocContainer || !tocList) return;

  if (!items || items.length === 0) {
    tocContainer.style.display = 'none';
    return;
  }

  tocContainer.style.display = 'block';
  tocList.innerHTML = items.map(item => `
    <li class="${item.level === 'h3' ? 'toc-h3' : ''}">
      <a href="#${item.id}">${item.text}</a>
    </li>
  `).join('');
}

// --- 渲染文章头部 ---
function renderHeader(post) {
  const header = document.getElementById('article-header');
  if (!header) return;

  header.innerHTML = `
    <h1>${post.title}</h1>
    <div class="article-meta">
      <span class="category-tag">${post.category || '未分类'}</span>
      <span>📅 ${post.date}</span>
    </div>
  `;
  document.getElementById('page-title').textContent = post.title + ' — Digital Power Lab';
}

// --- 配置 marked.js ---
function setupMarked() {
  if (typeof marked === 'undefined') {
    console.error('marked.js 未加载');
    return;
  }

  marked.setOptions({
    gfm: true,
    breaks: false,
    highlight: function(code, lang) {
      if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch {}
      }
      if (typeof hljs !== 'undefined') {
        try { return hljs.highlightAuto(code).value; } catch {}
      }
      return code;
    }
  });
}

// --- 加载评论 (giscus) ---
function loadComments() {
  const container = document.getElementById('giscus-container');
  if (!container) return;

  // 使用 giscus 评论系统（需配置 GitHub 仓库）
  // 如果你的仓库支持 giscus，取消下面注释并填入你的 repo
  container.innerHTML = `
    <script src="https://giscus.app/client.js"
      data-repo="YOUR_GITHUB_USERNAME/YOUR_REPO"
      data-repo-id="YOUR_REPO_ID"
      data-category="Announcements"
      data-category-id="YOUR_CATEGORY_ID"
      data-mapping="pathname"
      data-strict="0"
      data-reactions-enabled="1"
      data-emit-metadata="0"
      data-input-position="bottom"
      data-theme="light"
      data-lang="zh-CN"
      crossorigin="anonymous"
      async>
    <\/script>
  `;

  // 如果未配置 giscus，显示提示
  setTimeout(() => {
    if (!container.querySelector('iframe') && !container.querySelector('script[src]')) {
      container.innerHTML = `
        <div style="padding:20px;background:var(--bg-sidebar);border-radius:var(--radius);border:1px solid var(--border);text-align:center;">
          <p style="color:var(--text-muted);font-size:0.88rem;">
            💡 评论功能需要配置 <a href="https://giscus.app/" target="_blank">giscus</a>。
            <br>请在 <code>js/post.js</code> 中填入你的 GitHub 仓库信息即可启用。
          </p>
        </div>`;
    }
  }, 3000);
}

// --- 初始化 ---
async function initPost() {
  setupMarked();

  // 从 URL 参数获取文章文件名
  const params = new URLSearchParams(window.location.search);
  const file = params.get('id');

  if (!file) {
    document.getElementById('article-body').innerHTML =
      '<div style="text-align:center;padding:60px;color:var(--text-muted);"><p>😕 未指定文章</p><p><a href="/">← 返回首页</a></p></div>';
    return;
  }

  // 加载元数据
  const allMeta = await loadPostMeta();
  let meta = allMeta ? allMeta.find(p => p.file === file) : null;

  // 加载 Markdown
  const md = await loadMarkdown(file);
  if (!md) {
    document.getElementById('article-body').innerHTML =
      '<div style="text-align:center;padding:60px;color:var(--text-muted);"><p>😕 文章不存在或加载失败</p><p><a href="/">← 返回首页</a></p></div>';
    return;
  }

  // 从 Markdown 内容提取标题（第一个 # 标题）
  if (!meta) {
    const firstLine = md.trim().split('\n')[0];
    const title = firstLine.replace(/^#\s+/, '');
    meta = {
      title: title || '未知标题',
      date: '',
      category: '',
      tags: [],
      summary: ''
    };
  }

  currentPost = meta;
  renderHeader(meta);

  // 渲染 Markdown
  const rawHtml = marked.parse(md);
  const { tocItems, modifiedHtml } = generateTOC(rawHtml);
  document.getElementById('article-body').innerHTML = modifiedHtml;

  // 生成 TOC
  renderTOC(tocItems);

  // 代码高亮
  if (typeof hljs !== 'undefined') {
    document.querySelectorAll('.article-body pre code').forEach(block => {
      hljs.highlightElement(block);
    });
  }

  // 加载评论
  loadComments();

  // 语法高亮范围
  if (typeof hljs !== 'undefined') {
    hljs.highlightAll();
  }
}

document.addEventListener('DOMContentLoaded', initPost);
