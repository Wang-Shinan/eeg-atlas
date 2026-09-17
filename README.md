# EEG Atlas

A chapter-based teaching site for EEG, built with Astro + TypeScript + Tailwind.
Structurally modelled on [learningeeg.com](https://www.learningeeg.com/): a
numbered chapter index on the home page, and each chapter as a single long
reading flow with inline self-test questions and grouped figures.

## Getting started

Node 22.12+ and Python 3.12 are used for builds. Python is only needed to export
the pinned electrode templates and anatomical meshes; the published site is
fully static and does not need a Python server or a browser CDN.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r scripts/requirements-atlas.txt
npm ci
npm run dev      # prepares atlas assets, syncs dataset rules, then serves on http://localhost:4321
```

See [the electrode atlas guide](docs/electrode-atlas.md) for coordinate sources,
reproducible exports, browser tests and limitations. Third-party template and
surface notices are published at `public/atlas/THIRD_PARTY_NOTICES.txt`.

| Script | What it does |
| --- | --- |
| `npm run sync` | Imports chapter text from the local vault into MDX; refuses to overwrite non-generated chapters |
| `npm run sync:rules` | Imports Chinese docs from [dataset-rules](https://github.com/Omni-Intel/dataset-rules) |
| `npm run assets:atlas` | Validates cached atlas assets or exports them from pinned Python packages |
| `npm run dev` | Prepares atlas assets, syncs dataset rules and starts the dev server |
| `npm run build` | Prepares atlas assets and builds `dist/`, including the Sites Worker postbuild |
| `npm run build:local` | Prepares atlas assets, syncs dataset rules and builds locally |
| `npm run build:pages` | Prepares atlas assets and builds the static Pages export in `dist-pages/` |
| `npm run check` | Type-checks `.astro`, `.ts` and `.mdx` files |

## Content model

There is one content collection, `chapters`, split into three tracks:

```
src/content/chapters/
  eeg/                  # original teaching chapters — committed
  foundation-models/    # written by hand — committed
  dataset-rules/        # synced from Omni-Intel/dataset-rules — committed
```

Every chapter's frontmatter is validated against the schema in
`src/content.config.ts`:

| Field | Purpose |
| --- | --- |
| `title`, `subtitle` | Shown in the index and the chapter header |
| `summary` | Chapter standfirst and meta description |
| `order` | Global position; drives numbering and prev/next links |
| `track`, `group` | Where the chapter appears on the home page |
| `generated` | `true` for imported chapters |

Tracks and the order of their groups are declared in `src/site.config.ts`.

### Imported chapters

The optional legacy importer reads `../Learning EEG/Learning EEG Final/`.
That local source material is not cleared for redistribution; it is not fetched
by CI. Published EEG chapters are committed original writing. The importer
refuses to overwrite non-generated chapters. Third-party teaching figures and
anatomical data have their own provenance and licenses; they are not all original.

`scripts/sync-content.ts` reads that directory and recognises two conventions
the raw Markdown expresses only implicitly:

- A bold paragraph ending in `?`, followed by a heading and one explanatory
  paragraph, becomes a `<TestYourself>` block. The heading is consumed as the
  answer verdict, so it never reaches the table of contents.
- A run of two or more consecutive images becomes a `<FigureTabs>` group, with
  tab labels derived from the image file names and shared leading words stripped.

To point the site at different source material, change `sourceDir` in
`scripts/sync-content.ts` and rewrite the chapter list in
`scripts/chapters.config.ts`.

### Hand-written chapters

Add an `.mdx` file under `src/content/chapters/<track>/` with the frontmatter
fields above. The same components are available:

```mdx
import TestYourself from '../../../components/TestYourself.astro';

<TestYourself answer="The short verdict">
<Fragment slot="question">

What is being asked?

</Fragment>
<Fragment slot="answer">

Why that is the answer.

</Fragment>
</TestYourself>
```

## Components

| Component | Notes |
| --- | --- |
| `TestYourself.astro` | Two-stage reveal built on nested `<details>` — no client JS |
| `FigureTabs.astro` | Tabbed figure group; falls back to the first figure without JS |
| `KeyTakeaways.astro` | End-of-chapter review list |
| `TableOfContents.astro` | Sticky rail from the chapter's h2/h3 headings |
| `FrequencyBands.astro` | Shared five-band table and original same-duration synthetic traces |
| `ElectrodeAtlas.astro` | On-demand WebGL montage viewer; searchable coordinate list if WebGL is unavailable |

There is no client UI framework. Small client scripts handle navigation,
figures, teaching interactives and the optional content editor.

## Styling

Tailwind v4 is configured through `@tailwindcss/vite`, with the design tokens
(paper, ink, rule, accent colours and the serif/sans stacks) declared in the
`@theme` block of `src/styles/global.css`. Chapter body copy is styled by the
`.prose-chapter` class in that same file rather than by Tailwind utilities, so
imported Markdown picks up the editorial look without any per-file classes.

## 图谱与阅读界面（2026-09）

- 原始教学图与图注元数据集中在 `src/data/figures.ts`，文件位于 `public/figures/sources/`。
- `provenance.json` 记录下载来源、作者和许可依据。保留原始图片；中文讲解写在图外。
- `/sources/` 由同一份元数据生成，新增图片时同时填写出处、许可、图号及对应章节。
- `AtlasFigure` 支持点击放大、原始尺寸查看、键盘关闭；原有概念示意仍保留并明确标注。
- 章节上下篇导航仅在同一专题内连接。手机可分别打开章节目录和本页目录。
- `npm run sync` 会拒绝覆盖非 generated 的人工章节，避免旧导入流程覆盖原创内容。

### 两种发布构建

`npm run build` 保留 Sites 的 Worker、数据库、媒体与在线编辑能力。
`npm run build:pages` 将纯静态版本输出到 `dist-pages/`，使用 `/eeg-atlas/` 基础路径；GitHub Pages 没有编辑后端，因此此构建不加载编辑器。
现有 GitHub Actions 使用静态构建；两种输出不会相互覆盖。PR 检查只验证并上传审阅产物，不部署网站。
