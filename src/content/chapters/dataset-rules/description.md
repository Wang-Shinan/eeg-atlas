---
title: "描述文件规则"
subtitle: "给人看的 description.toml"
summary: "可选的人类可读概述：采集背景、处理摘要、用途、局限与引用。"
order: 21
track: "dataset-rules"
group: "核心规则"
generated: true
---

## 1. 目的

`description.toml` 是可选文件。它面向人类阅读，并用于平台展示页面。

它 SHOULD NOT 成为解析 `dataset.lance/` 的必需条件。机器可读的细节属于 `metadata.toml`。

## 2. 推荐章节

```toml
[overview]
[collection]
[processing_summary]
[intended_use]
[limitations]
[citation]
```

## 3. 示例

```toml
[overview]
title = "HMC Sleep EEG Dataset"
summary = "A sleep staging EEG dataset converted into Lance format."
modality = "eeg"
task = "sleep_stage_classification"

[collection]
source = "HMC"
population = "Sleep study participants"
collection_period = "unknown"
institution = "unknown"

[processing_summary]
description = "Raw EEG recordings were segmented into fixed-length windows and converted to padded Lance rows."
window_sec = 30.0
normalization = "none"
label_mapping = "Sleep stage labels were mapped to integer class IDs."

[intended_use]
tasks = ["classification", "representation_learning"]
recommended_split = "Use the split column in dataset.lance."

[limitations]
notes = [
  "Channel information should be checked before cross-dataset training.",
  "Labels depend on the original annotation quality."
]

[citation]
text = "Please cite the original dataset and this converted release."
```


---

来源：[Omni-Intel/dataset-rules](https://github.com/Omni-Intel/dataset-rules) · `rules/description-rules.cn.md`
