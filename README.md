# EEG Atlas

面向第一次接触脑电的中文读者，从听见声音、想象握拳、进入睡眠等熟悉经历出发，逐步解释脑电测量、实验和脑机接口。网站使用 Astro、TypeScript、MDX 与 Tailwind。

## 当前阅读主线

主线为 **18 章＋术语附录**。首页和各章按“具体问题 → 现象与解释 → 名称 → 练习”的思路组织；详细算法、参数与资料出处放在可选的深入阅读中。写作目标、验收约定和后续读者试读计划见 [GOAL.md](GOAL.md)。

第二章保留 MNE 三维电极模板，第三章使用真实 EEG 样本。第四、五章的试次与 ERP 曲线为明确标注的合成教学演示；第六至十八章使用文字例子与原始研究入口，尚未逐章内嵌真实实验数据。基础模型、Dataset Rules 和九个旧临床参考页属于进阶或存档内容。

详细运行与验证见 [课程说明](docs/bci-first-edition.md) 和 [内容路线](CONTENT-ROADMAP.md)。技术检查通过不等于已通过零基础读者的理解测试。

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
| `node scripts/test-bci.mjs` | 主线结构、合成试次、卡片和依赖完整性检查 |
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
