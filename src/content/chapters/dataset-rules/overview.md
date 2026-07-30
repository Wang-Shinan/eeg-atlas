---
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

```text
<dataset_id>/
  dataset.lance/          # 必需：主 Lance 表
  metadata.toml           # 必需：机器可读元数据与 schema
  versions.toml           # 推荐：Lance 版本变更说明
  description.toml        # 可选：人类可读概述与处理说明
```

## 五条核心原则

1. `dataset.lance` 存样本级数据、标签、ID、形状、QC 与划分。
2. `metadata.toml` 存解析、恢复、校验与训练所需的结构化细节。
3. `versions.toml` 把 Lance 内部版本映射成可读的语义变更。
4. `description.toml` 只写给人看的概述、背景、处理摘要、用途、局限与引用。
5. 阵列类神经影像数据入库前应 padding 到固定形状，并保留 `original_shape` 以便还原。

## 两种 Profile

| Profile | 适用 | 要点 |
| --- | --- | --- |
| **base**（默认） | 监督 / 下游任务数据集 | 有监督时必须有 `[label]` |
| **pretrain** | 自监督 EEG 预训练语料 | 无标签、一数据集一表，通道用 slot-mask padding，NPD 等特征进 `derivatives/` |

在 `metadata.toml` 顶部写 `profile = "pretrain"` 即选用预训练 profile；缺省或 `base` 则走基础规则。

## 推荐阅读顺序

1. [数据集布局](/chapters/dataset-rules/dataset-layout/)
2. [Lance 表规则](/chapters/dataset-rules/lance-table/)
3. [元数据规则](/chapters/dataset-rules/metadata/)
4. [版本规则](/chapters/dataset-rules/versioning/)
5. [描述文件规则](/chapters/dataset-rules/description/)
6. [预训练 Profile](/chapters/dataset-rules/pretrain-profile/)
7. [校验清单](/chapters/dataset-rules/validation-checklist/)

上游规范与示例 TOML 以 GitHub 仓库为准；本站章节由 `npm run sync:rules` 从中文规则文档生成。
