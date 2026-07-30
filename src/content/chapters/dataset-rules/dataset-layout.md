---
title: "数据集布局"
subtitle: "目录结构与必需文件"
summary: "dataset.lance、metadata.toml、versions.toml、description.toml 的默认布局与扩展约定。"
order: 17
track: "dataset-rules"
group: "核心规则"
generated: true
---

## 1. 默认数据集布局

每个数据集 SHOULD 存储在一个以其数据集 ID 命名的单独目录中：

```text
<dataset_id>/
  dataset.lance/
  metadata.toml
  versions.toml
  description.toml
```

## 2. 必需和可选文件

### MUST

- 数据集 MUST 包含 `dataset.lance/`。
- 数据集 MUST 包含 `metadata.toml`。
- 除非在 `metadata.toml` 中另行声明，`dataset.lance/` MUST 是默认主 Lance 表名称。
- `metadata.toml` MUST 足以让程序从 `dataset.lance` 解析并恢复数据。

### SHOULD

- 数据集 SHOULD 包含 `versions.toml`。
- `versions.toml` SHOULD 描述每一个有意义的 Lance 表版本。
- 当数据集目录自包含时，TOML 文件内部 SHOULD 使用相对路径。

### MAY

- 数据集 MAY 包含 `description.toml`。
- 数据集 MAY 包含 `derivatives/` 目录，用于派生特征、报告、QC 产物或模型输出。

## 3. 扩展布局

用于派生数据或报告时：

```text
<dataset_id>/
  dataset.lance/
  metadata.toml
  versions.toml
  description.toml
  derivatives/
    features/
    reports/
    qc/
```

## 4. 单模态规则

对于当前单模态数据集，优先使用一个 `dataset.lance/` 表。该表 SHOULD 存储样本级数据、标签、ID、形状元数据、QC 标记和数据划分。

## 5. 多模态扩展规则

对于未来的多模态数据集：

- 如果各模态严格对齐并且总是一起读取，MAY 使用一个宽表形式的 `dataset.lance/`。
- 如果各模态不严格对齐，每个模态 SHOULD 单独存储，并通过 manifest 或关系表进行链接。
- 当前规范保留该扩展能力，但默认采用单主表设计。


---

来源：[Omni-Intel/dataset-rules](https://github.com/Omni-Intel/dataset-rules) · `rules/dataset-layout-rules.cn.md`
