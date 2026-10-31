# 净图小站

手机和电脑浏览器中的本机图片修补工具。选择图片、自动选择水印候选或手动涂抹、核对红色选区、修复并下载 PNG。无需登录或 API key，图片和选区不离开当前设备。公开地址：https://nijianguo2021.github.io/clean-image/

## 使用与边界

- 点击「放大编辑」进入大图，加减按钮或手机双指缩放，最高 8 倍；移动画面、手动涂抹、擦除选区分别操作。放大只改变显示，不改变选区坐标或导出尺寸。
- 「擦除选区」只擦掉红色标记，不改原图；可撤销，后续涂抹可以重新选回。自动候选也支持局部擦除。
- 「自动识别」先寻找图片边缘文字，再根据局部颜色和连通性选出笔画；有文字模型证据的封闭浅色标志另做形状检查。每个候选均可取消，不能把普通文字自动认定为水印。中央、低对比、复杂彩色标志、花体长尾可能漏选，需要放大核对和补涂。
- 手动处理黑字可选「深色文字」，白字可选「浅色文字 / 水印」；「整个涂抹区域」会修补整片红色选区。预览与实际处理使用同一份遮罩。
- 原图长边超过 2400 像素会先缩小；单张上限 30 MB。处理后的工作图中，选区外 RGB 和全部透明度保持不变。不保证遮挡内容与原图一致，复杂纹理仍可能留下痕迹。
- 链接提取在 GitHub Pages 上尚未接通；后台准备代码不代表功能已经可用。解析器不绕过登录、验证码或访问限制。

## core1 实现

文字检测使用 RapidAI/RapidOCR 的 PP-OCRv4 mobile detection ONNX 模型，约 4.75 MB。检测框只用于定位，实际修复遮罩是提取出的笔画或标志形状，不直接使用整个矩形。模型检测到文字不代表判断出其版权、用途或是否应删除。

背景补全仍使用 MI-GAN 官方 ONNX pipeline。距离较远的选区分别裁取附近背景处理，每组都读取原图；推理遮罩包含裁剪内所有选中像素，输出只写回属于该组的选中像素，避免把其他水印当作已知背景。

「纹理与细节」在补全后保守细化窄缝，保护已有线条；仅当邻近纹理匹配、独立验证、接缝和多个来源一致性检查均通过时，才使用原图局部纹理。没有可靠匹配就保留模型结果。可选后处理异常时恢复完整模型输出，不丢失已完成的修复。该方法不是 Photoshop 集成，也不代表换用了更强的生成模型。

实测范围：真实 WASM 中完成两类私有样图的文字检测与修复；能检测此前漏掉的浅色标志及部分实心笔画。纹理模块在这两张样图上均未接受替换，因此不能把这些样图的变化归因于纹理模块。复杂签名装饰长尾仍可能需要手动补选。私有图片、遮罩、结果和测试报告不进入公开仓库。

## 资源与兼容性

ONNX Runtime Web 1.22.0，单线程 WASM；OCR 和修复会话交替释放后加载，避免同时保留两个模型会话。释放会话不保证手机立即归还全部 WASM 堆内存。

共享运行资源压缩约 2.9 MB，修复模型压缩约 24.6 MB，文字模型另约 4.75 MB。下载带大小/SHA-256 校验、分块进度、缓存、超时、重试及固定版本备用 CDN；旧版 iPhone 网络修正保留。运行资源和模型是公开文件，照片不会发送给 CDN。浏览器手机尺寸检查不能代替真实 iPhone 的网络、速度与内存验证。

## 验证与发布

从项目目录运行：

```sh
node test-selection.cjs
node test-zoom.cjs
node test-text-detect.cjs
node test-regions.cjs
node test-quality.cjs
node test-texture.cjs
node test-worker.cjs
node test-loader.cjs
```

测试覆盖精确遮罩、选区擦除/撤销/重涂、双指切换、文字预处理和候选过滤、标志负例、分组所有权、原图和透明度保护、接缝与纹理回退、模型会话释放顺序及资源错误处理。合成纹理用例改善不等于任意真实图片都能改善。

本地服务：`python -m http.server 8767 --bind 127.0.0.1 --directory public`。开发目录 `public`，GitHub Pages 发布目录 `docs`，两者保持一致。

## 来源与许可证

- MI-GAN：https://github.com/Picsart-AI-Research/MI-GAN ，模型 https://huggingface.co/andraniksargsyan/migan/blob/main/migan_pipeline_v2.onnx ，许可证 `models/LICENSE.txt`。
- 文字检测：https://github.com/RapidAI/RapidOCR ，PP-OCRv4 mobile detection，Apache-2.0，许可证 `models/text-det-LICENSE.txt`。模型 SHA-256：`d2a7720d45a54257208b1e13e36a8479894cb74155a5efe29462512d42f49da9`。
- ONNX Runtime：`ort/LICENSE.txt`、`ort/ThirdPartyNotices.txt`。
- fflate 0.8.2：`vendor/fflate-LICENSE.txt`。

## edgefix1：修正淡字残影

MI-GAN pipeline 在返回结果前会对已知区域遮罩做 3×3 最大池化和 5×5 高斯模糊，再混合原图与生成内容。旧实现把用户选区直接交给模型，导致细笔画边缘混回原文字，留下浅色轮廓。本地 ONNX 节点与官方 pipeline 源码已交叉核验：https://github.com/Picsart-AI-Research/MI-GAN/blob/main/scripts/create_onnx_pipeline.py

修复仅对模型输入增加 3 像素保护区，最终仍严格按原有红色选区写回。预览选区和输出范围不扩大，无需新模型。回归验证 maxpool3 + gaussian5 下每个原选中点的旧图混合系数为零；真实 WASM 两张样图 A/B 证明选区外 RGB 与 alpha 零变化，浅色轮廓明显减轻。没有选择到的字尾和模型生成纹理误差仍可能存在，不等于完全无痕。

新增回归：`node test-repair-mask.cjs`；`test-worker.cjs` 同时验证推理保护区与最终输出所有权分离。浏览器实际自动识别、修复和 PNG 导出流程验证通过。
