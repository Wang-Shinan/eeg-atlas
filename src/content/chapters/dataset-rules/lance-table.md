---
title: "Lance 表规则"
subtitle: "样本级主表怎么存"
summary: "必需列、padding、形状恢复，以及 EEG / MRI / fMRI 的可选列。"
order: 18
track: "dataset-rules"
group: "核心规则"
generated: true
---

## 1. 目的

`dataset.lance/` 是主要的样本级数据表。每一行代表一个样本。

样本 MAY 是：

- 一个 EEG window 或 epoch；
- 一个 MRI image；
- 一个 fMRI volume、window 或 run；
- 一个特征向量或派生样本，前提是在 `metadata.toml` 中声明。

## 2. 必需列

`dataset.lance/` MUST 包含：

| Column | Type | Required | Description |
|---|---|---:|---|
| `sample_id` | string | Yes | 唯一样本标识符 |
| `subject_id` | string | Yes | 受试者标识符 |
| `modality` | string | Yes | `eeg`、`mri`、`fmri` 或其他已声明模态 |
| `data` | fixed_size_list<float32> or list<float32> | Yes | 展平后的 padded 数据 |
| `shape` | list<int32> | Yes | padded 形状 |
| `original_shape` | list<int32> | Yes | padding 前的原始形状 |
| `valid_length` | int64 | Yes | padding 前的有效展平值数量 |
| `qc_pass` | bool | Yes | 样本是否通过 QC |

## 3. 推荐列

适用时，`dataset.lance/` SHOULD 包含：

| Column | Type | Description |
|---|---|---|
| `session_id` | string | Session 标识符 |
| `run_id` | string | Run 标识符 |
| `label` | int32 / float32 / string | 主标签 |
| `label_name` | string | 人类可读标签 |
| `split` | string | `train`、`val`、`test` 或其他已声明划分 |
| `source_path` | string | 相对源路径或 URI |
| `created_at` | timestamp/string | 行创建时间 |
| `updated_at` | timestamp/string | 行更新时间 |

## 4. 数据存储规则

所有多维数据 MUST 以展平数组形式存储在 `data` 列中。

表中 MUST 同时存储：

```text
shape           # padded shape
original_shape  # shape before padding
valid_length    # flattened valid length before padding
```

恢复流程：

```python
padded = data.reshape(shape)
original = crop_or_slice(padded, original_shape)
```

## 5. Padding 规则

- 数据 SHOULD 在一个数据集内 padding 到固定形状。
- Padding value MUST 在 `metadata.toml` 中声明。
- Axis order MUST 在 `metadata.toml` 中声明。
- `shape` MUST 描述 padded 数组形状。
- `original_shape` MUST 描述未 padding 的数组形状。
- 除非另有显式声明，`valid_length` MUST 等于 `original_shape` 的元素乘积。

## 6. 列命名规则

默认名称：

```text
data
shape
original_shape
valid_length
label
label_name
qc_pass
split
```

如果使用非默认名称，MUST 在 `metadata.toml` 中声明。

## 7. 模态特定列

### EEG 可选列

```text
start_time: float64
duration: float64
start_sample: int64
channel_names: list<string>
channel_status: list<string>
channel_mask: list<bool>
```

对于可变 EEG 通道布局，`metadata.toml` MUST 声明读取哪些通道列。存在这些列时：

- `channel_names` MUST 按恢复后数据通道轴使用的顺序存储通道名称。
- `channel_status` MUST 与 `channel_names` 对齐。
- `channel_mask` 如果存在数据集级通道全集，MUST 与该全集对齐；否则 MUST 与 `channel_names` 对齐。

对于 `channel_layout = "per_subject"`，被试级通道元数据 SHOULD 在该被试的每个样本行中重复存储。

### MRI 可选列

```text
affine: fixed_size_list<float32>[16]
voxel_size: list<float32>
space: string
image_type: string
```

### fMRI 可选列

```text
affine: fixed_size_list<float32>[16]
tr: float32
start_volume: int32
n_volumes: int32
space: string
```

## 8. 索引建议

SHOULD 考虑为以下列建立索引：

```text
sample_id
subject_id
session_id
run_id
modality
label
qc_pass
split
```


---

来源：[Omni-Intel/dataset-rules](https://github.com/Omni-Intel/dataset-rules) · `rules/lance-rules.cn.md`
