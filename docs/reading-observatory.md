# 第三章：联动读图观察器

## 范围与运行

这是教学组件，不是诊断工具或在线信号处理服务。只修改第三章及其数据、组件、测试与构建准备；前两章正文、全站布局和编辑器不改。

```bash
python -m pip install -r scripts/requirements-atlas.txt
npm ci
npm run build:pages
npm run test:reading
python -m pip install playwright==1.55.0
python -m playwright install chromium
python scripts/build-reading-preview.py
python scripts/test-reading-browser.py
```

`PYTHON` 可指向虚拟环境可执行文件。`predev` 和两种构建会校验缓存，缺样本才重新导出。`public/reading/*.json` 为可复现构建产物，不进入版本控制。首次需要网络，导出失败会明确终止而不静默用假数据代替真实数据。无新增前端依赖、服务器、CDN 或分析遥测。

## 文件与数据协议

- `src/lib/reading/dsp.ts`：确定性样本、Welch/STFT、频带积分与空间插值。纯函数，与 DOM 分离。
- `src/lib/reading/observatory.ts`：统一选区/通道/游标状态，Canvas 绘图，数值表、鼠标和键盘操作。
- `src/components/SignalObservatory.astro` 与 `src/styles/reading.css`：声明式控件与局部样式。
- `scripts/export-reading-sample.py`：PhysioNet S001R02 的 [10,22) 秒，SHA-256 同时与发布方清单和已固定值核对。MNE 校准为 V 后作全 64 路平均参考，再选 19 路并转为 µV；无额外滤波或 z-score。坐标是模板而非个体数字化位置。
- `scripts/test-reading-math.mjs`：独立 SciPy 数值对照，以及正弦功率、Nyquist、确定性、插值测试。

真实记录条件为整次闭眼基线，T0 不是闭眼时刻；不提供虚构的反应性或临床标签。EDF prefilter 原字段保留，不据此推断完整硬件滤波。原采集参考未确证；离线参考明确。派生样本遵循 PhysioNet ODC-By，保留作者、DOI、来源与许可链接。

## 算法定义

窗长 160 点（1 s），周期 Hann，逐窗去均值。单边 PSD = |DFT(xw)|² / (fs × sum(w²))，非 DC/Nyquist 频点乘 2。Welch hop=80，STFT hop=20；只使用完整窗，不补零。STFT 时间为窗中心。PSD 单位 µV²/Hz，频带功率为其线性插值后的区间积分，单位 µV²。PSD 与时频色阶均固定 −40..40 dB re 1 µV²/Hz；超出端点裁切显示。

波形保持原数值，默认正向上，选区是半开区间；频谱最短 1 s。游标按 1/160 s 对齐，A 决定瞬时电压图，选区决定功率图。ΔV 不自动等于峰峰值，1/Δt 不自动等于振荡频率。波形显示量程默认真实数据 ±250 µV、合成 ±50 µV，控件始终明示；改变显示不修改计算。

二维头皮图采用 head x/y 正交投影、同一尺度、凸包内 1/d² 插值，不用插值值冒充皮层源。各点有原值表。电压色阶以零对称，功率非负；用户可锁定上限，切换物理量/频带会解除锁定。锁定后的越界保留数值、颜色饱和。PSD 和地图不是临床认证实现。

合成 A/B 的 10 Hz 分量全段均方值按包络归一化对照，但 Welch 积分不保证严格相等；B 仅 4–6 s 成串。C 在 7 s 加双相短瞬态，不构成癫痫样诊断。D/E 共享相位、振荡和空间权重，只改变随机相位宽频背景幅度。背景是有限长 1/f-like 教学构造，并非独立生理源估计。

## 验收与预览

`reading-check.yml` 从 PR 的合并候选构建 Pages，运行数值与浏览器测试，上传 `reading-review`：完整 Pages 站点、来源归档、截图、结果 JSON 及 `chapter3-interactive-preview.html`。离线预览由构建后同一 HTML/CSS/JS 和实际样本内嵌生成，不依赖 CDN；它不是第二套手写界面。

浏览器测试覆盖 Pages 子路径、真实样本、合成切换、鼠标选区、数值边界、游标键盘、通道/模式联动、锁定色标、移动视口、无 JS 正文、加载失败和重试。测试通过不等于实体手机/GPU 全覆盖或临床有效性认证。不自动合并或部署 main。
