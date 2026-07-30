---
title: "校验清单"
subtitle: "上传前必须通过的检查"
summary: "文件存在性、元数据、Lance schema、padding 与划分等阻断项清单。"
order: 23
track: "dataset-rules"
group: "预训练与校验"
generated: true
---

Use this checklist before accepting a dataset into the platform.

Validation MUST run on the local processing server against the final dataset directory before upload. Object storage upload MUST NOT start unless every required check passes.

If any required check fails, the dataset MUST be rejected for upload. Any change to files after validation MUST trigger a new validation run.

Unless an item is explicitly marked optional or recommended, every checklist item is required and blocking.

## Upload gate

- [ ] Validation is run against the exact dataset directory intended for upload.
- [ ] `dataset_id` and `dataset.version` in `metadata.toml` match the upload target.
- [ ] No files are modified after validation and before upload.
- [ ] All required checks in this checklist pass.
- [ ] A validation result is recorded with pass/fail status, dataset ID, dataset version, row count, and failed checks if any.

## File existence

- [ ] `dataset.lance/` exists.
- [ ] `dataset.lance/` can be opened as a Lance dataset.
- [ ] `dataset.lance/` contains at least one row.
- [ ] `metadata.toml` exists.
- [ ] `versions.toml` exists or the dataset is explicitly marked as not version-tracked.
- [ ] `description.toml` is optional.

## Metadata checks

- [ ] `metadata.toml` is valid TOML and can be parsed without errors.
- [ ] `spec_version` exists.
- [ ] `[dataset]` exists.
- [ ] `[storage]` exists.
- [ ] `[schema]` exists.
- [ ] At least one `[[schema.columns]]` entry exists.
- [ ] `[data]` exists.
- [ ] `[quality_control]` exists.
- [ ] Required modality-specific section exists.

## Dataset section

- [ ] `dataset.dataset_id` exists.
- [ ] `dataset.name` exists.
- [ ] `dataset.modality` exists.
- [ ] `dataset.version` exists.
- [ ] `dataset.created_at` exists.
- [ ] `dataset.updated_at` exists.
- [ ] `dataset.sample_unit` exists.
- [ ] `dataset.n_samples` exists.
- [ ] `dataset.n_samples` is positive.
- [ ] Lance row count equals `dataset.n_samples`.

## Storage section

- [ ] `storage.table_name` exists.
- [ ] `storage.lance_path` exists.
- [ ] `storage.path_type` is `relative` or `absolute`.
- [ ] `storage.lance_path` resolves to `dataset.lance/` or another declared Lance path.

## Lance schema checks

- [ ] Every required base column exists: `sample_id`, `subject_id`, `modality`, `data`, `shape`, `original_shape`, `valid_length`, and `qc_pass`.
- [ ] Required base columns contain no null values.
- [ ] All Lance columns are declared in `[[schema.columns]]`.
- [ ] All declared required columns exist in Lance.
- [ ] Types in `metadata.toml` match Lance schema.
- [ ] `sample_id` values are non-empty and unique.
- [ ] `subject_id` values are non-empty.
- [ ] `modality` values match `dataset.modality`.
- [ ] `qc_pass` is boolean and non-null for every row.

## Data restoration checks

- [ ] `data` values are present and non-empty for every row.
- [ ] `shape` and `original_shape` contain positive integer dimensions.
- [ ] `data` length matches the product of `shape`.
- [ ] `valid_length` is positive and does not exceed the product of `shape`.
- [ ] `data` can be reshaped to `shape` for every row.
- [ ] `original_shape` can be used to crop or slice the padded array.
- [ ] `valid_length` matches the product of `original_shape`, unless explicitly declared otherwise.
- [ ] `axis_order` length matches shape rank.

## Label checks

- [ ] Supervised datasets contain `[label]`.
- [ ] Supervised datasets contain a `label` column.
- [ ] Supervised datasets have non-null `label` values for every released row.
- [ ] Classification datasets contain `[[label.classes]]`.
- [ ] `label` values are valid class IDs for classification tasks.
- [ ] `label_name` matches `label.classes`, if present.

## Split checks

- [ ] If `split` is present, every value is declared in metadata or uses an accepted platform split value.

## EEG checks

- [ ] `[eeg]` exists when `dataset.modality = "eeg"`.
- [ ] `eeg.channel_layout` exists and is one of `dataset_level`, `per_subject`, or `per_sample`.
- [ ] If `eeg.channel_layout = "dataset_level"`, `eeg.n_channels` equals the number of `[[eeg.channels]]` entries.
- [ ] If `[[eeg.channels]]` is present, channel indexes are contiguous and start from 0.
- [ ] If `eeg.channel_layout` is `per_subject` or `per_sample`, `eeg.channel_names_column` exists and names a Lance column.
- [ ] If `eeg.channel_status_column` is declared, it names a Lance column aligned with `eeg.channel_names_column`.
- [ ] If `eeg.channel_mask_column` is declared, it names a Lance column aligned with the dataset-level channel universe or `eeg.channel_names_column`; mask values have length C.
- [ ] If `eeg.channel_mask_column` is declared, `sum(channel_mask)` equals the restored channel-axis length.
- [ ] If `eeg.bad_channel_mask_column` is declared, it names a Lance column with length C and aligns with `eeg.channel_mask_column` when present.
- [ ] If `channel_counts` and `channel_mask` both exist, `channel_counts == sum(channel_mask)`.
- [ ] For `per_subject` or `per_sample`, each `channel_names_column` value is non-empty and matches the restored channel-axis order.
- [ ] For `per_subject` or `per_sample`, `eeg.n_channels` is greater than or equal to every row's restored channel-axis length.
- [ ] `eeg.sampling_rate` is positive.
- [ ] `eeg.channel_axis` and `eeg.time_axis` are valid axes.

## MRI checks

- [ ] `[mri]` exists when `dataset.modality = "mri"`.
- [ ] `mri.voxel_size` contains 3 positive values.
- [ ] `mri.spatial_axes` contains 3 axes.
- [ ] `mri.field_strength` is positive or explicitly unknown by policy.
- [ ] If `mri.affine_column` is not empty, the column exists in Lance.

## fMRI checks

- [ ] `[fmri]` exists when `dataset.modality = "fmri"`.
- [ ] `fmri.tr` is positive.
- [ ] `fmri.voxel_size` contains 3 positive values.
- [ ] `fmri.time_axis` is valid.
- [ ] Preprocessing status fields exist.

## Pretrain profile checks

Applies when `metadata.toml` declares `profile = "pretrain"`. These checks are in addition to the base checks above; the label checks are replaced by the no-label checks below.

- [ ] `profile = "pretrain"` and `dataset.task_type = "pretrain"`.
- [ ] `[pretrain]` exists and `pretrain.is_labeled = false`.
- [ ] `[label]` is absent and there is no `label` or `label_name` column.
- [ ] The dataset is stored as a single table; datasets are not merged into channel-count buckets.
- [ ] If `split` is present, every value is in `["train", "val"]`; train and val are not stored as separate tables.
- [ ] `electrode_ids` and `channel_names` both exist, are non-null, and have equal length C in every row.
- [ ] `channel_mask` and `bad_channel_mask` exist with length C; `sum(channel_mask) == original_shape[0]`.
- [ ] If `channel_counts` exists, `channel_counts == sum(channel_mask)`.
- [ ] Padding slots satisfy `electrode_ids == pad_electrode_id` (default 0) and `channel_mask == false`.
- [ ] `electrode_ids` values are within the shared vocab range (reserved ids 0 and 1 allowed).
- [ ] `[eeg]` declares `electrode_ids_column`, `channel_names_column`, `channel_mask_column`, and `bad_channel_mask_column`.
- [ ] `valid_length == n_valid_channels * T` (declared, not `C * T`); `[data].time_padding = false`; T is constant within the dataset.
- [ ] `[data].channel_padding = "slot_mask"` and `channel_mask_column` names an existing column.
- [ ] If `eeg.electrode_vocab_path` is declared, the referenced `derivatives/electrode_vocab.json` exists.
- [ ] If `[features.npd].present = true`: `derivatives/features/npd.lance/` exists; its row count equals the main table; its `sample_id` set equals the main table; `channel_features` length `== C * channel_feature_dim`; `segment_features` length `== segment_feature_dim`; `manual_features` length `== manual_feature_dim`.

## Pre-upload object storage checks

- [ ] The upload payload contains the validated `dataset.lance/`, `metadata.toml`, and `versions.toml` unless version tracking is explicitly disabled.
- [ ] Relative paths in TOML files resolve inside the dataset directory.
- [ ] Absolute local paths are not used in uploaded metadata unless explicitly allowed by platform policy.
- [ ] Object storage destination is derived from `dataset_id` and `dataset.version`.
- [ ] Upload is blocked when validation status is not `pass`.


---

来源：[Omni-Intel/dataset-rules](https://github.com/Omni-Intel/dataset-rules) · `validation/validation-checklist.md`
