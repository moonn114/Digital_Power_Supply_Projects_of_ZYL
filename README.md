# ⚡ Digital Power Lab — 数字电源项目博客

记录数字电源项目的设计思路、调试心得与测试数据。

## 功能

| 功能 | 说明 |
|------|------|
| 📝 Markdown 写作 | 用 Markdown 写文章，自动渲染为 HTML |
| 📂 分类筛选 | 文章按技术方向分类，侧边栏和顶部均可筛选 |
| 🏷️ 标签云 | 侧边栏标签云，点击即可筛选 |
| 🔍 全文搜索 | 搜索文章标题、摘要和标签 |
| 📑 文章目录 TOC | 长文章自动生成目录导航 |
| 💬 评论 | 支持 giscus (GitHub Discussions) 评论系统 |
| 📅 归档 | 按月份归档文章 |

## 快速启动

```bash
# Python
python start.py

# Node.js
npx serve .
```

访问 `http://localhost:8080`

## 如何添加新文章

### 1. 写文章

```bash
cp posts/template.md posts/005-你的文章.md
```

### 2. 更新索引

在 `data/posts.json` 中添加新条目，同步更新 `js/main.js` 中的 `POSTS_FALLBACK`。

### 3. 发布

```bash
git add -A && git commit -m "新文章: xxx" && git push
```

GitHub Pages 会在 1-2 分钟内自动更新。

## 文章写作规范

每篇文章建议包含：
1. **项目背景与需求** — 为什么做，设计指标
2. **拓扑选择与方案设计** — 系统架构
3. **硬件设计要点** — 器件选型、磁件计算
4. **数字控制策略** — 算法描述、关键代码
5. **测试结果** — 效率、纹波、波形数据
6. **问题与改进** — 踩坑记录
7. **总结** — 回顾与展望
