# 三维电极图谱：内容、坐标与复现

第一章沿神经生理到头皮测量的顺序展开，参考 Learning EEG 的知识覆盖范围，正文、流程说明和练习为重新编写。第一章与第三章共用 `src/data/frequency-bands.ts` 和 `FrequencyBands.astro`：五频段的边界是本文的分析约定，不是生理硬边界；合成图统一时长和振幅，gamma 不能自动等同于认知活动。

第二章的 `ElectrodeAtlas.astro` 使用原生 WebGL 和 DOM 控件，不增加前端框架或 CDN。每次只在交互/尺寸变化时绘图，用户点击后才加载数据。不支持 WebGL 时保留可搜索、可勾选的坐标列表。数据构建需要 Python；发布后的网页仍然是完全静态文件，不需要 Python 服务。

## 一次安装与构建

使用 Node 22.12+ 和 Python 3.12。建议在虚拟环境中安装：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r scripts/requirements-atlas.txt
npm ci
npm run assets:atlas
npm run check
npm run build:pages
```

`predev`、`prebuild`、`prebuild:local`、`prebuild:pages` 都会校验或生成资源。可以用 `PYTHON=/path/to/python npm run assets:atlas` 指定解释器。有效缓存不需要重新导出；缓存由导出脚本、固定依赖列表与输出文件的 SHA-256 验证。不要直接执行 `astro build` 跳过资源准备。

`public/atlas/data/` 是生成目录，不提交重复的大型 JSON。它由所安装包内的模板离线导出，随 `dist/` 或 `dist-pages/` 一起发布。不是在用户打开网页时去外部网站下载脑模型。首次安装依赖需要网络。

## 输入和变换

固定 MNE-Python 1.13.2、Nilearn 0.12.1、Nibabel 5.3.2。内置布局是 `fsaverage_1020`、`fsaverage_1010`、`biosemi32/64/128/256` 和 `GSN-HydroCel-128/129/256/257`，共十种。人数、通道数据列数、模板位置数不是同一概念；图中统计电极条目，不含单独标注的基准点。

每个 montage 以 `head_size='auto'` 创建，保留该 MNE 版本的默认模板尺寸；再用 `compute_native_head_t` 转为 MNE head 坐标。文件同时保存 nativePositions、nativeFrame、nativeToHead 和最终 positions。导出器拒绝缺少基准点、坐标不有限、单位异常、反射矩阵和错误的电极数量，不会用另一套模板悄悄替代缺失项。

脑模型是 Nilearn 包内的 FreeSurfer fsaverage5 左右 pial 表面；头皮来自 MNE 包内的 `fsaverage-head.fif`。表面保留网格分辨率，GIFTI 的 mm 转成 m，然后使用 `fsaverage-trans.fif` 的逆变换统一到 head 坐标。x 向右、y 向前、z 向上。所有原始输入保留 SHA-256。

厂商模板和 fsaverage 头皮并不保证完全贴合。查看器不进行投影、形变、逐设备缩放或点位抖动。电极以明确标注的透视模式显示，背面点较淡；颜色表示布局，不表示脑功能。这里不提供个体配准、通道信号、等价电极自动映射或源定位功能。

## 校验和浏览器验收

```bash
python scripts/export-electrode-atlas.py --check
python -m pip install playwright==1.55.0
python -m playwright install chromium
python scripts/test-atlas-browser.py
```

浏览器测试针对 GitHub Pages 的 `/eeg-atlas/` 子路径，检查五频段输出、真实表面、布局数量、WebGL、叠加、型号选择、搜索、勾选、键盘、手机溢出和无 JavaScript 正文。截图写入 `test-artifacts/`。PR 检查构建两种发布格式并上传页面与截图，不部署或合并。应另行用实际桌面/手机 GPU 查看透明表面和高密度遮挡；自动截图不是临床/解剖有效性认证。

模板及软件的许可、出处、修改说明随 `public/atlas/THIRD_PARTY_NOTICES.txt` 发布。教学正文不复用 Learning EEG 的图像或自测答案。已有编辑器、全站布局、其他章节和路由不在这次修改范围内。
