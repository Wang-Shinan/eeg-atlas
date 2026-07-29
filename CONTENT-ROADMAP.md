# 中文原创 EEG 章节写作路线图

每章的结构遵循参考站点的教学设计：

1. 导入段（为什么这个话题重要）
2. 正文小节（h2），每个概念配一张自制图
3. 穿插 2–4 个 `<TestYourself>` 自测块
4. 末尾 `<KeyTakeaways>` 复习清单

文件放到 `src/content/chapters/eeg/`，替换同步脚本生成的内容。

---

## 写作进度

| # | 文件名 | 标题 | 状态 | 备注 |
|---|--------|------|------|------|
| 01 | `basic-electrophysiology.mdx` | 基础电生理 | ⬜ 未开始 | 静息电位、突触电流、偶极子、场电位 |
| 02 | `montages-and-technical-components.mdx` | 导联与技术参数 | ⬜ 未开始 | 10-20 系统、双极/参考导联、相位反转、滤波 |
| 03 | `terminology-and-waveforms.mdx` | 术语与波形 | ⬜ 未开始 | 频率、振幅、相位、形态；频段定义 |
| 04 | `normal-awake.mdx` | 正常清醒 EEG | ⬜ 未开始 | 组织、梯度、对称性、反应性、后显性节律 |
| 05 | `normal-asleep.mdx` | 正常睡眠 EEG | ⬜ 未开始 | 困倦→慢波→REM；各期图形元素 |
| 06 | `artifacts.mdx` | 伪迹 | ⬜ 未开始 | 眼动、肌电、心电、电极、环境 |
| 07 | `normal-variants.mdx` | 正常变异 | ⬜ 未开始 | 形态尖锐但良性的模式 |
| 08 | `neonatal.mdx` | 新生儿 EEG | ⬜ 未开始 | 概念年龄、连续性、图形元素 |
| 09 | `pediatric.mdx` | 儿童 EEG | ⬜ 未开始 | 背景发育、年龄依赖性模式与综合征 |
| 10 | `non-epileptiform-abnormalities.mdx` | 慢波与非癫痫样异常 | ⬜ 未开始 | 局灶/广泛性慢化、衰减、脑病模式 |
| 11 | `epileptiform-activity.mdx` | 癫痫样放电 | ⬜ 未开始 | 尖波、棘波及其场分布 |
| 12 | `seizures.mdx` | 发作 | ⬜ 未开始 | 电图起始与演变 |
| 13 | `glossary.mdx` | 术语表 | ⬜ 未开始 | 术语定义汇总 |

---

## 图表方案

参考站的图片不可复用（版权），需要自制替代：

| 图表类型 | 方案 |
|----------|------|
| 示意图（偶极子、10-20 位置、相位关系） | SVG 手绘或用 Excalidraw 生成 |
| 频段波形样例（delta/theta/alpha/beta） | Python + MNE 从合成信号生成 |
| 真实 EEG 片段（正常/异常样例） | 从 TUH EEG Corpus 或 PhysioNet 开放数据集渲染 |
| 导联连接方式 | SVG 拓扑图 |

建议在 `scripts/` 下加一个 `generate-figures.py`，从开放数据集批量渲染标注图，
输出到 `public/figures/`。

---

## 关键原则

- **事实可以复述，表达必须原创。** "Alpha 频段是 8–13 Hz" 是领域知识，但对方的
  具体行文、解释顺序和比喻不能照搬。
- **章节大纲可以类似。** 生理→导联→正常→异常是所有 EEG 教材的标准递进顺序，
  不构成原创表达。
- **图表必须自制。** 这是比正文更严格的要求——标注过的 EEG 片段属于对方创作。
- **中文优先。** 术语首次出现时用「中文名（English term）」格式，后续只用中文。

---

## 发布前 gitignore 调整

写完原创内容后，把 `site/.gitignore` 中的以下行删除：

```
src/content/chapters/eeg/
```

这样原创章节会被 git 跟踪，CI 构建也能正常渲染它们。
