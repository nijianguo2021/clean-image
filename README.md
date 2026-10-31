# 净图小站

免费本机 AI 图片修补。打开网页、选择图片、涂抹文字，点击「免费 AI 修复」后下载 PNG。不需要登录或 API key，图片和选区不离开浏览器。

使用 MI-GAN 官方 ONNX pipeline 和 ONNX Runtime Web 1.22.0 的单线程 WASM。支持流式解压的浏览器首次下载约 28 MB（其他浏览器约 40 MB）处理资源。静态资源与页面同源，不依赖第三方模型 CDN。旧手机可能较慢或内存不足。长边最多 2400 像素，单张最大 30 MB。

黑字可选择「深色文字」，白字选择「浅色文字 / 水印」，颜色复杂时选择「整个涂抹区域」。尽量贴着文字涂抹，避免覆盖大量背景。AI 生成的背景可能有差异，不保证完全无痕。选区外像素保持不变。支持取消、恢复原图、原图对比和继续修补。

本地测试：python -m http.server 8767 --bind 127.0.0.1 --directory public
发布目录：GitHub Pages 使用 docs，Netlify 使用 public。

模型：https://huggingface.co/andraniksargsyan/migan/blob/main/migan_pipeline_v2.onnx
项目：https://github.com/Picsart-AI-Research/MI-GAN
模型及运行库许可证分别见 models/LICENSE.txt、ort/LICENSE.txt 和 ort/ThirdPartyNotices.txt。

链接提取需要 Netlify 函数后台，GitHub Pages 上尚未接通。解析器只读取公开页面返回的数据，不执行页面脚本、不发送登录 Cookie，不绕过登录、验证码或平台限制。真实小红书样本跳转登录，不能宣称该链接提取成功。提取到的文件不保证无水印。

验证：浏览器实际载入用户样图、深色文字选区、执行 WASM 推理、检查门槛纹理与文字去除、成功下载 PNG。私有样图及结果不进入公开仓库。test.mjs 为历史插值及链接解析器测试，不能代替 AI 浏览器测试。

加载优化：文件完整性校验、下载进度、断线自动重试两次、可用时保存本机缓存；成功后复用工作线程和会话。资源错误与选区错误分别提示，并保留图片及选区以便重试。gzip 资源解压后与原版逐字节一致。
验证：node test-loader.cjs（下载失败/中断、超时、缓存损坏及不可用、资源哈希、gzip 解压、错误分类）；浏览器实际压缩资源加载、取消后重试、连续两次修复成功。尚未在用户报错的手机上复现。
