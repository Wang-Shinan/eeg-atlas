# EEG Atlas

面向 EEG／BCI 研究者的中文交互教材，使用 Astro、TypeScript、MDX 与 Tailwind。主线从生理、空间坐标和信号观察，进入实验、ERP、刺激选择、运动、听觉、语言与状态，最后讨论神经反馈、临床边界和在线协作。

## BCI 第一版的范围

主线为 **18 章＋术语附录**。前三章保留已经实现的三维 MNE 电极图谱和真实 EEG 观察器。第四、五章新增合成试次实验和 15 组成分浏览卡片；所有构造图均明确标注，不是 ERP CORE 或被试实测。第六至十八章有首版正文、方法与研究入口、自测，尚未逐章嵌入真实实验数据。临床在主线收拢到一章，九个旧网址保留为带提示的参考页。

详细范围、运行与验收见 [BCI 第一版说明](docs/bci-first-edition.md) 和 [内容路线](CONTENT-ROADMAP.md)。

## 本地运行

构建使用 Node 22.12+、Python 3.12。Python 用于离线导出固定版本电极／脑表面模板和校准真实 EEG 样本；发布后是纯静态资源，不需要 Python 后端或浏览器 CDN。

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r scripts/requirements-atlas.txt
npm ci
npm run dev
```

首次导出需要网络。无法取得或校验真实资源时会明确失败，不静默换成合成样本。`PYTHON` 可指向虚拟环境的解释器。开发服务器按 `AGENTS.md` 的项目约定管理。

| 命令 | 用途 |
|---|---|
| `npm run assets:atlas` | 校验缓存或导出 MNE 布局和解剖表面 |
| `npm run assets:reading` | 校验或生成第三章真实样本及 SciPy 对照 |
| `npm run dev` | 准备资源、同步 Dataset Rules、启动开发服务器 |
| `npm run build` | 生成 `dist/`，保留 Sites Worker 后处理 |
| `npm run build:pages` | 生成 `/eeg-atlas/` 子路径的静态 `dist-pages/`，禁用在线编辑器 |
| `npm run check` | Astro／TypeScript 检查 |
| `npm run test:reading` | 第三章数值对照 |
| `node scripts/test-bci.mjs` | 新主线、合成试次、卡片和原文件完整性检查 |
| `npm run sync:rules` | 从 Omni-Intel/dataset-rules 同步规范 |
| `npm run sync` | 旧本地资料导入流程；拒绝覆盖非 generated 的人工章节 |

## 内容与导航

`src/content/chapters/` 下有 `eeg/`、`foundation-models/`、`dataset-rules/` 三个专题；新增章按 `src/content.config.ts` 填写 `title`、`subtitle`、`summary`、`order`、`track`、`group`。`src/site.config.ts` 决定专题和分组顺序。显示编号按专题处理；术语表显示为附录。旧临床页由 `src/data/legacy-chapters.ts` 标记：仍生成原路由，但不进入主目录或上下章导航，并链接到对应的新章。

手写 MDX 可使用 `TestYourself`、`KeyTakeaways`、`SourceNote`、`AtlasFigure` 等组件。`src/data/figures.ts` 和 `public/figures/sources/provenance.json` 保留图片出处；`/sources/` 从同一元数据生成。新增或改图时同时核对来源、许可、图注、章节和图形含义，不从静态图片补造事件。

旧 `sync-content.ts` 可读取本地 vault，但其导入来源不自动获得公开发布资格；公开构建只使用已提交内容。当前章节不是旧导入文本的可随意覆盖产物。

## 交互与复现

- [电极图谱](docs/electrode-atlas.md)：MNE 坐标、模板表面、坐标变换、版本与许可；不把模板当作个体测量。
- [第三章观察器](docs/reading-observatory.md)：PhysioNet 物理单位、参考与裁剪，Welch／STFT 和插值算法、独立数值对照。
- [BCI 版](docs/bci-first-edition.md)：合成试次定义、ERP 卡片、旧路由保留和新导航。

没有 React/Vue 等 UI 框架；交互使用局部脚本和 Canvas/WebGL。正文在禁用 JavaScript 时仍可阅读，卡片采用原生 details；交互图不工作时不声称已经展示实际信号。

## 检查与预览

PR 会运行原有图谱／编辑器、第三章以及 BCI 检查。截图、数值结果、可复查源码和预览作为 Actions 产物保存。新预览脚本 `python scripts/build-bci-preview.py` 在静态构建完成后生成 `test-artifacts/bci-first-edition.zip`；解压并打开 `index.html` 可离线浏览整套内容，文献外链仍需网络。

本次只修改内容、导航和必要交互，不升级既有依赖。CI 安装输出中的安全告警需单独审计；构建或交互通过不是安全审计、临床有效性验证或全部实体设备测试。
