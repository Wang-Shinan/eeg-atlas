---
title: "预训练 Profile"
subtitle: "自监督 EEG 语料的扩展约定"
summary: "无标签、一数据集一表、电极词表与 NPD 特征表等预训练专用规则。"
order: 22
track: "dataset-rules"
group: "预训练与校验"
generated: true
---

本文档定义**预训练 profile（pretrain profile）**：基础规范的兄弟 profile，面向**自监督 EEG 预训练**语料
（例如 OpenNeuro 系列数据集与 TUH foundation 语料）。

预训练 profile 复用基础的 layout、Lance、metadata、version、description 规则。本文档只说明预训练 profile
在何处**扩展或覆盖**基础规则；本文档未提及处，基础规则照常生效。

遵循本 profile 的数据集 MUST 在 `metadata.toml` 顶部声明：

```toml
spec_version = "0.1.0"
profile = "pretrain"
```

没有 `profile`、或 `profile = "base"` 的数据集，按基础（监督）规则不变处理。

## 1. 目的与范围

- 预训练 profile 适用于用于自监督预训练的 EEG 数据集，数据**无标签**。
- 一个数据集 MUST 存为一个目录、一张主表 `dataset.lance/`。
- train/val 划分 MUST 用 `split` 列表示，MUST NOT 用分表表示。

## 2. 布局扩展

基础见 `dataset-layout-rules.cn.md`。

```text
<dataset_id>/
  dataset.lance/                    # 必需：主信号表，一行一个窗口/段
  metadata.toml                     # 必需
  versions.toml                     # 推荐
  description.toml                  # 可选
  derivatives/
    electrode_vocab.json            # 推荐：共享电极词表（id <-> name）
    montage_vocab.json              # 可选：montage 词表（id <-> name）
    features/
      npd.lance/                    # 推荐：行对齐的 NPD 特征表
    qc/                             # 可选
    reports/                        # 可选
```

### MUST / SHOULD / MAY

- 预训练数据集 MUST 包含 `dataset.lance/` 与 `metadata.toml`。
- 若提供 NPD 特征，则 `derivatives/features/npd.lance/` MUST 存在并 MUST 在 `[features.npd]` 中声明。
- 被引用的电极词表 SHOULD 存于 `derivatives/electrode_vocab.json`，并通过 `[eeg].electrode_vocab_path` 声明。

### `dataset_id` 约定

- OpenNeuro：MUST 用 accession，如 `ds003690`、`ds005089`。每个 OpenNeuro accession 各自成集、各自一表。
- TUH foundation：用 `tuh-eeg-foundation`（单一数据集、单表）。

### 一数据集一表（覆盖）

基础规范允许合并严格对齐的数据；预训练 profile **要求一数据集一表**。把多个数据集合并进按通道数分桶的表
（例如 `eeg_openneuro_64ch`）MUST NOT 作为预训练存储形态。

## 3. 主表扩展

基础见 `lance-rules.cn.md`。必需基列不变：
`sample_id, subject_id, modality, data, shape, original_shape, valid_length, qc_pass`。

预训练 profile **把以下 EEG 列由可选提升为必需**：

| Column | Type | Required | 说明 |
|---|---|---:|---|
| `electrode_ids` | fixed_size_list\<uint16>[C] | Yes | 每槽位的共享词表电极 id；`0`=pad，`1`=UNK_EEG |
| `channel_names` | list\<string>（长度 C） | Yes | 每槽位规范化通道名，与 `electrode_ids` 对齐 |
| `channel_mask` | fixed_size_list\<bool>[C] | Yes | `true`=有效（非 padding）槽位 |
| `bad_channel_mask` | fixed_size_list\<bool>[C] | Yes | `true`=坏道，仅在有效槽位内有意义 |

- `electrode_ids` 与 `channel_names` 描述同一事实（第 `i` 槽位是哪个电极），二者 MUST 长度均为 C、顺序一致。
- `label` / `label_name` 列 MUST NOT 出现。
- 信号列 MUST 命名为 `data`；遗留的 `signals` 列 MUST 在发布前重命名为 `data`。

推荐列（适用时 SHOULD）：
`split, session_id, run_id, source_path, start_time, channel_counts, montage_id, channel_status,
shard_name, global_idx, dataset_key`。

## 4. 通道与电极模型

### 共享电极词表

- 所有预训练数据集 MUST 引用同一个共享电极词表：同一物理电极在每个数据集里映射到同一整数 id
  （例如 `F7=17`、`F3=19` 在 TUH 与 OpenNeuro 中一致）。
- 保留 id：`0 = PAD`（padding 槽位），`1 = UNK_EEG`（EEG 类但不在词表中的通道）。
- 关系：`electrode_ids[i] = electrode_vocab[ canonicalize(channel_names[i]) ]`。
- 规范化策略 SHOULD 记录在 `description.toml` 或 `[preprocessing]`。

### `channel_layout`

复用基础取值 `dataset_level` / `per_subject` / `per_sample`。无论哪种布局，本 profile 下逐行的
`electrode_ids` 与 `channel_names` 始终存在且为权威。

| 值 | 含义 |
|---|---|
| `dataset_level` | 每行用 `[[eeg.channels]]` 声明的同一槽位顺序；`n_channels` 等于条目数。 |
| `per_subject` | 槽位映射可按受试者不同；同受试者各行 SHOULD 一致。 |
| `per_sample` | 槽位映射可按样本不同；`electrode_ids`/`channel_names` 为权威。 |

### 两类掩码

- `channel_mask`（有效 vs padding）：padding 槽位 SHOULD 追加在末尾（槽 `n_valid_channels … C-1`），
  其 `electrode_id = 0`、`channel_names = ""`、`channel_mask = false`。
- `bad_channel_mask`（好道 vs 坏道）：在有效槽位内部标记伪迹/插值通道；**不改变形状**。
- 两类掩码 MUST 与通道轴对齐（长度 C）。

## 5. Padding 与还原

基础见 `lance-rules.cn.md` §4–§5。

- `data` MUST 为 (C, T) 按 row-major 展平的 `fixed_size_list<float32>`，长度 `C·T`。
- `shape = [C, T]`；`original_shape = [n_valid_channels, T]`。时间维 T 在数据集内固定，故 `[data].time_padding = false`。
- `valid_length = n_valid_channels · T`，**显式声明**（不是 `C·T`）。
- 还原用 `channel_mask` 选有效通道：

```python
padded = data.reshape(shape)                                   # (C, T)
original = padded[[i for i, m in enumerate(channel_mask) if m], :]   # (n_valid_channels, T)
```

`[data]` 在本 profile 下新增必需字段：

```toml
channel_padding = "slot_mask"
channel_mask_column = "channel_mask"
time_padding = false
```

## 6. metadata.toml 扩展

基础见 `metadata-rules.cn.md`。

- `[label]` MUST NOT 出现。`dataset.task_type` MUST 为 `"pretrain"`。
- `[pretrain]` MUST 出现（取代 `[label]`）。
- 若提供 NPD 特征，`[features.npd]` MUST 出现并设置 `present = true`。未提供 NPD 特征时，`[features.npd]` MAY 以 `present = false` 的形式出现。
- `[preprocessing]` SHOULD 出现。

### `[pretrain]`

| Field | Type | Required | 说明 |
|---|---|---:|---|
| `is_labeled` | bool | Yes | MUST 为 `false` |
| `recommended_pretext` | list\<string> | MAY | 如 `["masked_reconstruction", "jepa", "cwt_time_freq"]` |

### `[preprocessing]`（SHOULD）

| Field | Type | 说明 |
|---|---|---|
| `target_sfreq` | float | 重采样率，如 `200.0` |
| `window_seconds` | float | 窗口长度（秒） |
| `segment_samples` | int | 每窗采样点（`= target_sfreq * window_seconds`） |
| `bandpass_low` / `bandpass_high` | float | 带通边界 |
| `notch_hz` | float | 陷波频率 |
| `unit_before_normalization` | string | 如 `"uV"` |
| `normalization` | string | 如 `"clip_divide_200"` |
| `normalization_detail` | string | 归一化公式（人读） |
| `channel_canonicalization` | string | 通道规范化策略摘要 |

### `[eeg]` 新增

在基础必需 EEG 字段之外，本 profile 还要求：

| Field | Type | Required | 说明 |
|---|---|---:|---|
| `electrode_ids_column` | string | Yes | `"electrode_ids"` |
| `channel_names_column` | string | Yes | `"channel_names"` |
| `channel_mask_column` | string | Yes | `"channel_mask"` |
| `bad_channel_mask_column` | string | Yes | `"bad_channel_mask"` |
| `electrode_vocab_name` | string | SHOULD | 共享词表名 |
| `electrode_vocab_version` | string | SHOULD | 词表版本 |
| `electrode_vocab_path` | string | SHOULD | `"derivatives/electrode_vocab.json"` |
| `pad_electrode_id` | int | SHOULD | `0` |
| `unk_electrode_id` | int | SHOULD | `1` |

`[[eeg.channels]]`（`dataset_level` 必需）每条新增 `electrode_id` 字段：

| Field | Type | Required | 说明 |
|---|---|---:|---|
| `index` | int | Yes | 槽位序号，从 0 连续 |
| `electrode_id` | int | Yes | 共享词表 id |
| `name` | string | Yes | 通道名 |
| `type` | string | Yes | `eeg`/`eog`/`emg`/`ecg`/`stim`/`misc`/`ref` |
| `unit` | string | Yes | 通道单位 |

### `[features.npd]`

本节 MAY 以 `present = false` 显式声明 NPD 特征不存在。若 `present = true`，或实际存在
NPD 特征，则下列必需字段 MUST 出现，且 `derivatives/features/npd.lance/` MUST 满足
NPD 派生表规则。

| Field | Type | Required | 说明 |
|---|---|---:|---|
| `present` | bool | Yes | 是否存在 NPD 特征 |
| `table_name` / `lance_path` | string | Yes | `"derivatives/features/npd.lance"` |
| `row_alignment` | string | Yes | `"sample_id"` |
| `extractor` | string | Yes | 特征提取器名 |
| `extractor_version` | string | SHOULD | 提取器版本 |
| `channel_feature_dim` | int | Yes | 每通道特征维（如 41） |
| `segment_feature_dim` | int | Yes | 段级特征维（如 76） |
| `manual_feature_dim` | int | Yes | 手工特征维（如 158） |
| `channel_feature_axis_order` | list\<string> | Yes | 如 `["channel", "feature"]` |
| `signal_already_normalized` | bool | SHOULD | 特征是否在归一化信号上计算 |

## 7. NPD 派生表

`derivatives/features/npd.lance/` MUST 以 `sample_id` 与主表行对齐。

- 行数 MUST 等于主表；`sample_id` 集合 MUST 相等；行序 SHOULD 一致。
- 读取方 MUST 按 `sample_id` join，MUST NOT 依赖隐式行号。

| Column | Type | Required | 说明 |
|---|---|---:|---|
| `sample_id` | string | Yes | 与主表的 join 键 |
| `channel_features` | fixed_size_list\<float32>[C·D_ch] | Yes | 展平 (C, D_ch) 每通道特征 |
| `segment_features` | fixed_size_list\<float32>[D_seg] | Yes | 段级特征 |
| `manual_features` | fixed_size_list\<float32>[D_man] | Yes | 手工特征 |
| `channel_mask` | fixed_size_list\<bool>[C] | Yes | 与主表对齐 |
| `electrode_ids` | fixed_size_list\<uint16>[C] | Yes | 与主表对齐 |
| `bad_channel_mask` | fixed_size_list\<bool>[C] | Yes | 与主表对齐 |
| `subject_id` / `split` | string | SHOULD | 溯源冗余，便于独立加载 |

NPD 表变更 SHOULD 在 `versions.toml` 中用 `change_type = "feature_update"` 记录。

## 8. 版本与描述

- `versions.toml`：基础规则照常；受控 `change_type` 集合新增 `feature_update`（用于 NPD）。
- `description.toml`：对 OpenNeuro，`[collection]`/`[citation]` SHOULD 带 BIDS 的 `Name`、`DatasetDOI`、
  `Authors`、`License`；`intended_use.tasks` SHOULD 含 `["representation_learning", "pretraining"]`。

## 9. 校验

见 `validation/validation-checklist.md` 的 **Pretrain profile checks** 一节。

## 10. 数据集约定（OpenNeuro / TUH）

| | OpenNeuro（每 accession 一表） | TUH foundation（单表） |
|---|---|---|
| `dataset_id` | `ds00XXXX` | `tuh-eeg-foundation` |
| `dataset.source` | `"openneuro"` | `"tuh"` |
| C（padded 槽数）| 各集 `c_max`（如 ds003690 = 65） | 26（named26 固定槽） |
| `channel_layout` | 多为 `per_sample` | `dataset_level` |
| T | 2000（200 Hz × 10 s） | 2000 |
| split | `split` 列（`train`/`val`） | `split` 列（`train`/`val`） |

完整示例数据集见 `examples/eeg-pretrain/`。


---

来源：[Omni-Intel/dataset-rules](https://github.com/Omni-Intel/dataset-rules) · `rules/pretrain-rules.cn.md`
