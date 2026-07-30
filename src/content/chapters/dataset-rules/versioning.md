---
title: "版本规则"
subtitle: "Lance 版本到语义版本的映射"
summary: "versions.toml 如何记录变更类型、兼容性与受影响行列。"
order: 20
track: "dataset-rules"
group: "核心规则"
generated: true
---

## 1. 目的

`versions.toml` 将 Lance 内部表版本映射为人类可读的语义化变更。

Lance versions 描述表状态。`versions.toml` 解释为什么存在该表状态以及发生了什么变化。

## 2. 必需顶层字段

```toml
spec_version = "0.1.0"
dataset_id = "ds-example"
table = "dataset.lance"
```

## 3. 当前版本章节

`versions.toml` SHOULD 包含：

```toml
[current]
lance_version = 1
dataset_version = "2026.05.20"
description = "Current validated release."
```

## 4. 版本条目

每个有意义的 Lance 版本 SHOULD 通过 `[[versions]]` 描述。

必需字段：

| Field | Type | Required | Description |
|---|---|---:|---|
| `lance_version` | int | Yes | Lance 内部表版本 |
| `dataset_version` | string | Yes | 语义化数据集版本 |
| `created_at` | datetime/string | Yes | 变更时间 |
| `author` | string | Yes | 作者或系统 |
| `change_type` | string | Yes | 受控变更类型 |
| `compatible_with_previous` | bool | Yes | 旧版 reader 是否仍可使用此版本 |
| `description` | string | Yes | 人类可读变更说明 |
| `affected_rows` | int | Yes | 受影响行数 |
| `affected_columns` | list<string> | Yes | 受影响列 |

## 5. 推荐 `change_type` 值

```text
initial_import
append_samples
delete_samples
update_data
label_fix
qc_update
split_update
schema_update
metadata_update
preprocessing_update
feature_update
migration
release
rollback
```

## 6. 示例

```toml
spec_version = "0.1.0"
dataset_id = "ds-hmc-eeg"
table = "dataset.lance"

[current]
lance_version = 3
dataset_version = "2026.05.20"
description = "Current validated release."

[[versions]]
lance_version = 1
dataset_version = "2026.05.18"
created_at = "2026-05-18T12:00:00+08:00"
author = "system"
change_type = "initial_import"
compatible_with_previous = false
description = "Initial conversion from raw files to Lance format."
affected_rows = 111890
affected_columns = ["sample_id", "subject_id", "data", "label"]

[[versions]]
lance_version = 2
dataset_version = "2026.05.19"
created_at = "2026-05-19T09:30:00+08:00"
author = "system"
change_type = "schema_update"
compatible_with_previous = true
description = "Added split column."
affected_rows = 111890
affected_columns = ["split"]

[[versions]]
lance_version = 3
dataset_version = "2026.05.20"
created_at = "2026-05-20T11:00:00+08:00"
author = "system"
change_type = "schema_update"
compatible_with_previous = true
description = "Added original_shape and valid_length for reversible padding."
affected_rows = 111890
affected_columns = ["original_shape", "valid_length"]
```


---

来源：[Omni-Intel/dataset-rules](https://github.com/Omni-Intel/dataset-rules) · `rules/version-rules.cn.md`
