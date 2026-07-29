# 部署到 GitHub Pages 教程

本教程手把手带你把 EEG Atlas 站点发布到 `https://<你的用户名>.github.io/eeg-atlas`。

---

## 第 0 步：前置条件

- 已安装 Git 和 Node.js 22+
- 已安装 GitHub CLI（`gh`）并登录（`gh auth login`）
- 本地 `site/` 目录能正常 `npm run build`

---

## 第 1 步：创建独立仓库

当前项目嵌在 Obsidian 金库里，金库中包含不宜公开的文件。我们需要把 `site/`
拆成一个独立的仓库来发布。

```bash
# 在 GitHub 上创建仓库（可选 --public 或 --private）
# 免费版 Pages 需要公开仓库；私有仓库需 Pro/Team
gh repo create Wang-Shinan/eeg-atlas --public --clone

# 把站点代码复制进去
cp -R site/. eeg-atlas/
cd eeg-atlas

# 确保生成的 EEG 章节不在里面（应该本来就是空的）
rm -rf src/content/chapters/eeg/
```

> **为什么要拆？** 金库里有外部抓取的参考资料和私人笔记。即使网站本身不渲染
> 它们，仓库一旦公开，文件就全部可见。拆出来的仓库只含我们自己写的代码和内容。

---

## 第 2 步：推送代码

```bash
git add .
git commit -m "初始站点结构"
git push -u origin main
```

推送完成后，GitHub Actions 会自动触发，但第一次会失败——因为 Pages 还没启用。

---

## 第 3 步：启用 GitHub Pages

1. 打开仓库页面 → **Settings**（设置）
2. 左侧找到 **Pages**
3. **Source** 选择 **GitHub Actions**（不是 "Deploy from a branch"）
4. 保存

不需要手动选分支或目录——workflow 文件里已经写好了所有构建步骤。

---

## 第 4 步：触发部署

启用 Pages 后，需要重新跑一次 workflow：

```bash
# 方法一：空推送
git commit --allow-empty -m "trigger deploy"
git push

# 方法二：在 GitHub 网页上手动触发
# 仓库 → Actions → "Deploy to GitHub Pages" → Run workflow
```

等 1–2 分钟，Actions 跑完后站点就上线了：

```
https://wang-shinan.github.io/eeg-atlas/
```

---

## 第 5 步：验证

打开上面的 URL，你应该能看到：

- 首页显示章节列表（目前只有 Foundation Models 板块的两章）
- 点进章节能看到正文、自测块和目录栏
- 所有链接都带 `/eeg-atlas/` 前缀，不会 404

---

## 后续：添加新章节

每次写完一章中文原创内容：

```bash
# 1. 把 .mdx 文件放到正确位置
#    例如 src/content/chapters/eeg/basic-electrophysiology.mdx

# 2. 如果是第一次往 eeg/ 里放原创内容，先解除 gitignore
#    编辑 .gitignore，删除这一行：
#    src/content/chapters/eeg/

# 3. 提交并推送
git add .
git commit -m "添加第一章：基础电生理"
git push
```

推送后 Actions 自动构建部署，约 1 分钟后新章节就上线了。

---

## 自定义域名（可选）

如果你有自己的域名（比如 `eeg.example.com`）：

1. 在 `public/` 下创建一个 `CNAME` 文件，内容就写域名：

```
eeg.example.com
```

2. 修改 `.github/workflows/deploy.yml` 里的环境变量：

```yaml
env:
  SITE_URL: https://eeg.example.com
  SITE_BASE: /
```

3. 在域名服务商那里添加 DNS 记录：
   - 类型：`CNAME`
   - 主机记录：`eeg`
   - 记录值：`wang-shinan.github.io`

4. 在 GitHub 仓库的 Settings → Pages → Custom domain 里填入域名

---

## 常见问题

### 构建失败：找不到内容文件

确认 `src/content/chapters/foundation-models/` 下有 `.mdx` 文件。CI 构建**不会**
运行 `npm run sync`，只有手动提交到仓库的章节才会被构建。

### 页面 404

检查两个地方：
1. Pages Source 是否选了 "GitHub Actions"（不是 "Deploy from a branch"）
2. `astro.config.mjs` 里的 `base` 是否和仓库名一致（`/eeg-atlas`）

### 想用用户主页（`wang-shinan.github.io`，不带子路径）

把仓库名改成 `wang-shinan.github.io`，然后：

```yaml
# .github/workflows/deploy.yml
env:
  SITE_URL: https://wang-shinan.github.io
  SITE_BASE: /
```

这样所有页面都在根路径下，不需要 `/eeg-atlas` 前缀。

---

## 技术原理（了解即可）

```
推送 main → GitHub Actions 触发 → npm ci → npm run build → 上传 dist/ → 部署到 Pages CDN
```

| 配置项 | 用途 | 在哪里改 |
|--------|------|----------|
| `SITE_URL` | 完整域名 | `.github/workflows/deploy.yml` |
| `SITE_BASE` | 子路径前缀 | `.github/workflows/deploy.yml` |
| `trailingSlash: 'always'` | 路径末尾加 `/` | `astro.config.mjs` |
| `rehype-base-links` 插件 | MDX 内容中的链接自动加前缀 | `plugins/rehype-base-links.mjs` |

---

## 发布前检查清单

- [ ] 仓库里不含外部抓取内容（`Learning EEG/` 目录不在里面）
- [ ] `src/content/chapters/eeg/` 只有自己写的原创章节
- [ ] 没有热链接到 learningeeg.com 的图片
- [ ] `src/site.config.ts` 里的站点标题和描述已更新
- [ ] `public/favicon.svg` 已放入图标
- [ ] Pages Source 已设为 GitHub Actions
