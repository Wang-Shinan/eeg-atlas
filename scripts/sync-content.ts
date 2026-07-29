/**
 * Imports chapter text from the local Obsidian vault into MDX the site can render.
 *
 * The transform recognises two patterns that the raw Markdown expresses only by
 * convention, and turns them into real components:
 *
 *   - a bold question paragraph followed by a heading and one explanatory
 *     paragraph  ->  <TestYourself>
 *   - a run of two or more consecutive images  ->  <FigureTabs>
 *
 * Output lands in a git-ignored directory, so imported text never enters the
 * repository. Run with `npm run sync`.
 */
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { chapterSources, type ChapterSource } from './chapters.config.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');

const sourceDir = resolve(projectRoot, '../Learning EEG/Learning EEG Final');
const outputDir = join(projectRoot, 'src/content/chapters/eeg');
/** Relative path from a generated MDX file back to `src/components`. */
const componentsPath = '../../../components';

// ---------------------------------------------------------------- parsing

type Block =
  | { kind: 'heading'; depth: number; text: string }
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'question'; text: string }
  | { kind: 'rule' }
  | { kind: 'paragraph'; text: string };

const HEADING = /^(#{1,6})\s+(.*)$/;
const IMAGE = /^!\[(.*?)\]\((\S+?)\)\s*$/;
const RULE = /^-{3,}\s*$/;
/** A paragraph that is entirely bold and ends in a question mark. */
const QUESTION = /^\*\*(.+\?)\*\*\s*$/;

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.split('\n');
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraph.join('\n') });
      paragraph = [];
    }
  };

  for (const line of lines) {
    if (line.trim() === '') {
      flush();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: 'heading', depth: heading[1].length, text: heading[2].trim() });
      continue;
    }

    const image = IMAGE.exec(line);
    if (image) {
      flush();
      blocks.push({ kind: 'image', alt: image[1].trim(), src: image[2] });
      continue;
    }

    if (RULE.test(line)) {
      flush();
      blocks.push({ kind: 'rule' });
      continue;
    }

    const question = QUESTION.exec(line);
    if (question) {
      flush();
      blocks.push({ kind: 'question', text: question[1].trim() });
      continue;
    }

    paragraph.push(line);
  }

  flush();
  return blocks;
}

// ------------------------------------------------------------ figure labels

/** Derives a tab label from a CDN file name such as `<hash>_Deep%20EPSP-p-800.png`. */
function labelFromSrc(src: string): string {
  const file = decodeURIComponent(src.split('/').pop() ?? '');
  return file
    .replace(/\.(png|jpe?g|gif|webp|svg)$/i, '')
    .replace(/^(?:[0-9a-f]{16,}_)+/i, '')
    .replace(/-p-\d+$/i, '')
    .replace(/\((.*?)\)/g, ' ')
    .replace(/\b(?:tiny|small|large|copy|flat+ened)\b/gi, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Shortens labels within one figure group by dropping the words they all share,
 * so `Dipole Effects 1 … 9` becomes `1 … 9`.
 */
function shortenLabels(labels: string[]): string[] {
  if (labels.length < 2) return labels.map((label, i) => label || String(i + 1));

  const wordLists = labels.map((label) => label.split(' ').filter(Boolean));
  let shared = 0;
  while (
    shared < Math.min(...wordLists.map((words) => words.length)) - 1 &&
    wordLists.every((words) => words[shared].toLowerCase() === wordLists[0][shared].toLowerCase())
  ) {
    shared += 1;
  }

  return wordLists.map((words, i) => words.slice(shared).join(' ').trim() || String(i + 1));
}

// ------------------------------------------------------------- MDX emission

/** Neutralises characters MDX would otherwise read as JSX or expressions. */
function escapeMdx(text: string): string {
  return text
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;')
    .replace(/<(?![a-zA-Z/!])/g, '&lt;');
}

function stripInlineMarkdown(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[*_`]/g, '').trim();
}

function resolveWikilinks(text: string, slugByTitle: Map<string, string>): string {
  return text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, alias?: string) => {
    const key = target.replace(/^\d+\s+/, '').trim().toLowerCase();
    const slug = slugByTitle.get(key);
    const label = alias ?? target.replace(/^\d+\s+/, '');
    return slug ? `[${label}](/chapters/eeg/${slug})` : label;
  });
}

function renderImages(images: Array<{ src: string; alt: string }>): string {
  if (images.length === 1) {
    const { src, alt } = images[0];
    return `![${escapeMdx(alt) || labelFromSrc(src)}](${src})`;
  }

  const labels = shortenLabels(images.map((image) => labelFromSrc(image.src)));
  const entries = images
    .map((image, i) => {
      const caption = image.alt || labelFromSrc(image.src);
      return `  { src: ${JSON.stringify(image.src)}, label: ${JSON.stringify(labels[i])}, caption: ${JSON.stringify(caption)} }`;
    })
    .join(',\n');

  return `<FigureTabs figures={[\n${entries}\n]} />`;
}

interface TransformResult {
  body: string;
  questionCount: number;
  figureGroupCount: number;
}

function transform(blocks: Block[], slugByTitle: Map<string, string>): TransformResult {
  const out: string[] = [];
  let questionCount = 0;
  let figureGroupCount = 0;
  let usesFigureTabs = false;

  const text = (value: string) => escapeMdx(resolveWikilinks(value, slugByTitle));
  const collectImages = (from: number) => {
    const images: Array<{ src: string; alt: string }> = [];
    let i = from;
    while (i < blocks.length && blocks[i].kind === 'image') {
      const block = blocks[i] as Extract<Block, { kind: 'image' }>;
      images.push({ src: block.src, alt: block.alt });
      i += 1;
    }
    return { images, next: i };
  };

  let index = 0;
  while (index < blocks.length) {
    const block = blocks[index];

    if (block.kind === 'question') {
      const { images: questionImages, next: afterQuestion } = collectImages(index + 1);
      const answerHeading = blocks[afterQuestion];

      // Without a heading right after it, this is just an emphasised sentence.
      if (!answerHeading || answerHeading.kind !== 'heading') {
        out.push(`**${text(block.text)}**`);
        index += 1;
        continue;
      }

      const answerBody = blocks[afterQuestion + 1];
      const bodyText =
        answerBody && answerBody.kind === 'paragraph' ? text(answerBody.text) : '';
      const { images: answerImages, next: afterAnswer } = collectImages(
        afterQuestion + (bodyText ? 2 : 1),
      );

      const questionParts = [text(block.text)];
      if (questionImages.length > 0) {
        questionParts.push(renderImages(questionImages));
        usesFigureTabs ||= questionImages.length > 1;
      }

      const answerParts = bodyText ? [bodyText] : [];
      if (answerImages.length > 0) {
        answerParts.push(renderImages(answerImages));
        usesFigureTabs ||= answerImages.length > 1;
      }

      out.push(
        [
          `<TestYourself answer=${JSON.stringify(stripInlineMarkdown(answerHeading.text))}>`,
          '<Fragment slot="question">',
          '',
          questionParts.join('\n\n'),
          '',
          '</Fragment>',
          '<Fragment slot="answer">',
          '',
          answerParts.join('\n\n'),
          '',
          '</Fragment>',
          '</TestYourself>',
        ].join('\n'),
      );

      questionCount += 1;
      index = afterAnswer;
      continue;
    }

    if (block.kind === 'image') {
      const { images, next } = collectImages(index);
      out.push(renderImages(images));
      if (images.length > 1) {
        usesFigureTabs = true;
        figureGroupCount += 1;
      }
      index = next;
      continue;
    }

    if (block.kind === 'heading') {
      // Everything is nested under the page's own <h1>, so demote to h2/h3.
      const depth = Math.min(Math.max(block.depth, 2), 4);
      out.push(`${'#'.repeat(depth)} ${text(block.text)}`);
      index += 1;
      continue;
    }

    if (block.kind === 'rule') {
      out.push('---');
      index += 1;
      continue;
    }

    out.push(text(block.text));
    index += 1;
  }

  const imports = [`import TestYourself from '${componentsPath}/TestYourself.astro';`];
  if (usesFigureTabs) {
    imports.push(`import FigureTabs from '${componentsPath}/FigureTabs.astro';`);
  }

  return {
    body: `${imports.join('\n')}\n\n${out.join('\n\n')}\n`,
    questionCount,
    figureGroupCount,
  };
}

/** Drops the vault's own cross-link footer; the site renders navigation itself. */
function stripRelatedTopics(markdown: string): string {
  const index = markdown.search(/\n-{3,}\s*\n+##\s+Related Topics/i);
  return index === -1 ? markdown : markdown.slice(0, index);
}

function buildFrontmatter(source: ChapterSource): string {
  const fields: Array<[string, string]> = [
    ['title', JSON.stringify(source.title)],
    ['subtitle', JSON.stringify(source.subtitle)],
    ['summary', JSON.stringify(source.summary)],
    ['order', String(source.order)],
    ['track', JSON.stringify(source.track)],
    ['group', JSON.stringify(source.group)],
    ['generated', 'true'],
  ];
  return `---\n${fields.map(([key, value]) => `${key}: ${value}`).join('\n')}\n---\n`;
}

// --------------------------------------------------------------------- main

async function main(): Promise<void> {
  // The imported text is for local development only. Refusing to run in CI
  // keeps it from reaching a deployed build even if the source is committed.
  if (process.env.CI && !process.env.ALLOW_VAULT_SYNC) {
    console.error('Refusing to import vault content in CI.');
    console.error('Deployed builds must run `astro build` against committed content only.');
    process.exitCode = 1;
    return;
  }

  try {
    await readdir(sourceDir);
  } catch {
    console.error(`Source directory not found: ${sourceDir}`);
    console.error('Update `sourceDir` in scripts/sync-content.ts to point at your content.');
    process.exitCode = 1;
    return;
  }

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const slugByTitle = new Map(
    chapterSources.map((source) => [source.title.toLowerCase(), source.slug]),
  );

  for (const source of chapterSources) {
    const raw = await readFile(join(sourceDir, source.file), 'utf8');
    const { content } = matter(raw);
    const blocks = parseBlocks(stripRelatedTopics(content));
    const { body, questionCount, figureGroupCount } = transform(blocks, slugByTitle);

    await writeFile(join(outputDir, `${source.slug}.mdx`), buildFrontmatter(source) + body, 'utf8');
    console.log(
      `${String(source.order).padStart(2, '0')} ${source.slug.padEnd(34)} ` +
        `${questionCount} questions, ${figureGroupCount} figure groups`,
    );
  }

  console.log(`\nWrote ${chapterSources.length} chapters to ${outputDir}`);
}

await main();
