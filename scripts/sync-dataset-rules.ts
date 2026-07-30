/**
 * Imports Chinese rule docs from Omni-Intel/dataset-rules into MD chapters.
 *
 * Source: https://github.com/Omni-Intel/dataset-rules
 *
 * Usage:
 *   DATASET_RULES_DIR=/path/to/dataset-rules npm run sync:rules
 *
 * If DATASET_RULES_DIR is unset, clones a shallow copy into .cache/dataset-rules.
 */
import { mkdir, readFile, rm, writeFile, access } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const outputDir = join(projectRoot, 'src/content/chapters/dataset-rules');
const defaultCache = join(projectRoot, '.cache/dataset-rules');
const REPO = 'https://github.com/Omni-Intel/dataset-rules.git';

interface RuleChapter {
  /** Path relative to the dataset-rules repo root. */
  source: string;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  order: number;
  group: string;
  /** If set, use this body instead of reading `source` (e.g. Chinese checklist). */
  inlineBody?: string;
}

const chapters: readonly RuleChapter[] = [
  {
    source: 'rules/dataset-layout-rules.cn.md',
    slug: 'dataset-layout',
    title: '数据集布局',
    subtitle: '目录结构与必需文件',
    summary: 'dataset.lance、metadata.toml、versions.toml、description.toml 的默认布局与扩展约定。',
    order: 17,
    group: '核心规则',
  },
  {
    source: 'rules/lance-rules.cn.md',
    slug: 'lance-table',
    title: 'Lance 表规则',
    subtitle: '样本级主表怎么存',
    summary: '必需列、padding、形状恢复，以及 EEG / MRI / fMRI 的可选列。',
    order: 18,
    group: '核心规则',
  },
  {
    source: 'rules/metadata-rules.cn.md',
    slug: 'metadata',
    title: '元数据规则',
    subtitle: '机器可读的 metadata.toml',
    summary: '解析、校验与训练所需的 schema、模态元数据、标签、QC 与划分声明。',
    order: 19,
    group: '核心规则',
  },
  {
    source: 'rules/version-rules.cn.md',
    slug: 'versioning',
    title: '版本规则',
    subtitle: 'Lance 版本到语义版本的映射',
    summary: 'versions.toml 如何记录变更类型、兼容性与受影响行列。',
    order: 20,
    group: '核心规则',
  },
  {
    source: 'rules/description-rules.cn.md',
    slug: 'description',
    title: '描述文件规则',
    subtitle: '给人看的 description.toml',
    summary: '可选的人类可读概述：采集背景、处理摘要、用途、局限与引用。',
    order: 21,
    group: '核心规则',
  },
  {
    source: 'rules/pretrain-rules.cn.md',
    slug: 'pretrain-profile',
    title: '预训练 Profile',
    subtitle: '自监督 EEG 语料的扩展约定',
    summary: '无标签、一数据集一表、电极词表与 NPD 特征表等预训练专用规则。',
    order: 22,
    group: '预训练与校验',
  },
  {
    source: 'validation/validation-checklist.md',
    slug: 'validation-checklist',
    title: '校验清单',
    subtitle: '上传前必须通过的检查',
    summary: '文件存在性、元数据、Lance schema、padding 与划分等阻断项清单。',
    order: 23,
    group: '预训练与校验',
  },
];

async function ensureSourceDir(): Promise<string> {
  if (process.env.DATASET_RULES_DIR) {
    const dir = resolve(process.env.DATASET_RULES_DIR);
    await access(dir);
    return dir;
  }

  try {
    await access(join(defaultCache, 'rules'));
    console.log(`Using cached clone at ${defaultCache}`);
    return defaultCache;
  } catch {
    // fall through to clone
  }

  console.log(`Cloning ${REPO} → ${defaultCache}`);
  await rm(defaultCache, { recursive: true, force: true });
  await mkdir(resolve(defaultCache, '..'), { recursive: true });
  await execFileAsync('git', ['clone', '--depth', '1', REPO, defaultCache]);
  return defaultCache;
}

/** Drop the leading H1 — the chapter page already renders `title` as the page heading. */
function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^#[^\n]*\n+/, '');
}

function buildFrontmatter(chapter: RuleChapter): string {
  const fields: Array<[string, string]> = [
    ['title', JSON.stringify(chapter.title)],
    ['subtitle', JSON.stringify(chapter.subtitle)],
    ['summary', JSON.stringify(chapter.summary)],
    ['order', String(chapter.order)],
    ['track', JSON.stringify('dataset-rules')],
    ['group', JSON.stringify(chapter.group)],
    ['generated', 'true'],
  ];
  return `---\n${fields.map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n\n`;
}

async function main(): Promise<void> {
  const sourceRoot = await ensureSourceDir();
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  // Overview is hand-written and committed separately; do not delete it if present
  // outside the regenerated set — we write rules into the same folder, so recreate
  // overview after wipe by reading from ../overview.mdx if we keep it elsewhere.
  // Instead: wipe only generated slugs; overview is written by this script too from a template.

  const overview = `---
title: "规范导读"
subtitle: "Lance + TOML 神经影像数据规范"
summary: "Omni-Intel Dataset Rules 的设计目标、默认布局、两种 profile，以及推荐阅读顺序。"
order: 16
track: "dataset-rules"
group: "规范导读"
generated: false
---

本专栏收录 [Omni-Intel/dataset-rules](https://github.com/Omni-Intel/dataset-rules) 规范的中文条文，便于与 EEG 判读、基础模型专题对照阅读。规范面向 EEG、MRI、fMRI 及未来多模态数据：样本级数据进 Lance，机器可读元数据进 TOML。

## 默认布局

\`\`\`text
<dataset_id>/
  dataset.lance/          # 必需：主 Lance 表
  metadata.toml           # 必需：机器可读元数据与 schema
  versions.toml           # 推荐：Lance 版本变更说明
  description.toml        # 可选：人类可读概述与处理说明
\`\`\`

## 五条核心原则

1. \`dataset.lance\` 存样本级数据、标签、ID、形状、QC 与划分。
2. \`metadata.toml\` 存解析、恢复、校验与训练所需的结构化细节。
3. \`versions.toml\` 把 Lance 内部版本映射成可读的语义变更。
4. \`description.toml\` 只写给人看的概述、背景、处理摘要、用途、局限与引用。
5. 阵列类神经影像数据入库前应 padding 到固定形状，并保留 \`original_shape\` 以便还原。

## 两种 Profile

| Profile | 适用 | 要点 |
| --- | --- | --- |
| **base**（默认） | 监督 / 下游任务数据集 | 有监督时必须有 \`[label]\` |
| **pretrain** | 自监督 EEG 预训练语料 | 无标签、一数据集一表，通道用 slot-mask padding，NPD 等特征进 \`derivatives/\` |

在 \`metadata.toml\` 顶部写 \`profile = "pretrain"\` 即选用预训练 profile；缺省或 \`base\` 则走基础规则。

## 推荐阅读顺序

1. [数据集布局](/chapters/dataset-rules/dataset-layout/)
2. [Lance 表规则](/chapters/dataset-rules/lance-table/)
3. [元数据规则](/chapters/dataset-rules/metadata/)
4. [版本规则](/chapters/dataset-rules/versioning/)
5. [描述文件规则](/chapters/dataset-rules/description/)
6. [预训练 Profile](/chapters/dataset-rules/pretrain-profile/)
7. [校验清单](/chapters/dataset-rules/validation-checklist/)

上游规范与示例 TOML 以 GitHub 仓库为准；本站章节由 \`npm run sync:rules\` 从中文规则文档生成。
`;

  await writeFile(join(outputDir, 'overview.md'), overview, 'utf8');
  console.log('16 overview');

  for (const chapter of chapters) {
    const raw = await readFile(join(sourceRoot, chapter.source), 'utf8');
    const body = stripLeadingH1(raw).trimEnd() + '\n';
    const note =
      `\n\n---\n\n来源：[Omni-Intel/dataset-rules](https://github.com/Omni-Intel/dataset-rules) · \`${chapter.source}\`\n`;
    await writeFile(
      join(outputDir, `${chapter.slug}.md`),
      buildFrontmatter(chapter) + body + note,
      'utf8',
    );
    console.log(`${String(chapter.order).padStart(2, '0')} ${chapter.slug}`);
  }

  console.log(`\nWrote ${chapters.length + 1} chapters to ${outputDir}`);
}

await main();
