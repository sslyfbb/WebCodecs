# WebCodecs MP4 视频解码演示

这是一个基于 WebCodecs API 的 MP4 视频解码演示项目，展示了如何使用现代浏览器的 WebCodecs API 来解码不同格式的视频文件并进行实时渲染。

## 项目特性

- 🎥 支持多种视频编解码器：H.264、H.265、VP8、VP9、AV1
- 🎨 多种渲染模式：2D Canvas、WebGL、WebGL2、WebGPU
- ⚡ 可调节播放速度：0.5x - 5x
- 📊 实时性能监控：FPS 显示和状态跟踪
- 🔧 基于 Web Workers 的后台处理

## 技术栈

- **WebCodecs API** - 用于视频解码
- **MP4Box.js** - 用于 MP4 文件解析和采样提取
- **Web Workers** - 用于后台视频处理
- **Canvas API / WebGL / WebGPU** - 用于视频渲染

## 项目结构

```
├── index.html          # 主页面，包含用户界面
├── demuxer_mp4.js      # MP4 解复用器，使用 MP4Box.js 解析 MP4 文件
├── worker.js           # Web Worker，处理视频解码和渲染
├── video_avc.mp4       # H.264 测试视频
├── video_hevc.mp4      # H.265 测试视频
├── video_vp8.mp4       # VP8 测试视频
├── video_vp9.mp4       # VP9 测试视频
└── video_av1.mp4       # AV1 测试视频
```

## 功能说明

### 核心组件

1. **MP4Demuxer** (`demuxer_mp4.js`)
   - 使用 MP4Box.js 解析 MP4 文件
   - 提取视频轨道信息和编解码器配置
   - 生成 WebCodecs 兼容的视频块

2. **Worker** (`worker.js`)
   - 在后台线程处理视频解码
   - 支持多种渲染器（2D、WebGL、WebGPU）
   - 实现可调节的播放速度控制

3. **用户界面** (`index.html`)
   - 渲染模式选择
   - 视频编解码器选择
   - 播放速度控制
   - 实时状态监控

### 支持的视频格式

- **H.264 (AVC)** - 广泛支持的标准格式
- **H.265 (HEVC)** - 高效视频编码
- **VP8** - Google 开发的开源格式
- **VP9** - VP8 的后继者
- **AV1** - 下一代开源视频编解码器

### 渲染模式

- **2D Canvas** - 基础的 2D 渲染
- **WebGL** - 硬件加速的 3D 图形
- **WebGL 2** - WebGL 的增强版本
- **WebGPU** - 下一代图形 API（需要浏览器支持）

## 使用方法

1. **访问应用**
   - 在浏览器中打开 `http://localhost:8000`
   - 确保浏览器支持 WebCodecs API

2. **操作步骤**
   - 选择渲染模式（2D/WebGL/WebGL2/WebGPU）
   - 选择视频编解码器（H.264/H.265/VP8/VP9/AV1）
   - 选择播放速度（默认/0.5x-5x）
   - 点击 "Start" 开始播放
   - 点击 "Reset" 重置播放器

## 浏览器兼容性

### WebCodecs API 支持
[Can I use WebCodecs](https://caniuse.com/?search=WebCodecs)
- **Chrome/Edge**: 94+ ✅
- **Firefox**: 实验性支持 ⚠️
- **Safari**: 部分支持 ⚠️

### 编解码器支持
| 编解码器 | Chrome | Firefox | Safari |
|---------|--------|---------|--------|
| H.264   | ✅     | ✅      | ✅     |
| H.265   | ✅     | ❌      | ✅     |
| VP8     | ✅     | ✅      | ❌     |
| VP9     | ✅     | ✅      | ❌     |
| AV1     | ✅     | ✅      | ❌     |

## 外部依赖

项目使用以下外部库和资源：

### JavaScript 库
- **MP4Box.js**: https://w3c.github.io/webcodecs/samples/third_party/mp4boxjs/mp4box.all.min.js
  - 用于 MP4 文件解析和采样提取
  - GitHub: https://github.com/gpac/mp4box.js/

### 渲染器
- **2D Renderer**: https://w3c.github.io/webcodecs/samples/video-decode-display/renderer_2d.js
- **WebGL Renderer**: https://w3c.github.io/webcodecs/samples/video-decode-display/renderer_webgl.js
- **WebGPU Renderer**: https://w3c.github.io/webcodecs/samples/video-decode-display/renderer_webgpu.js

## 性能监控

应用提供实时性能监控：

- **Fetch**: 文件下载进度（MB）
- **Demux**: 解复用状态
- **Decode**: 解码器状态和视频信息
- **Render**: 渲染帧率（FPS）

## 开发说明

### 关键 API

1. **VideoDecoder** - WebCodecs 视频解码器
2. **EncodedVideoChunk** - 编码的视频数据块
3. **VideoFrame** - 解码后的视频帧

### 工作流程

1. 使用 Fetch API 下载 MP4 文件
2. MP4Box.js 解析文件结构和元数据
3. 提取视频轨道和编解码器信息
4. 配置 VideoDecoder
5. 解码视频块为视频帧
6. 在选定的渲染器中显示帧

## 注意事项

- WebGPU 渲染模式需要浏览器实验性支持
- 某些编解码器可能需要硬件支持
- 建议使用 HTTPS 或本地服务器运行
- 大视频文件可能影响性能

## 参考资源

- [WebCodecs API 规范](https://w3c.github.io/webcodecs/)
- [MP4Box.js 文档](https://github.com/gpac/mp4box.js/)
- [WebCodecs 示例](https://w3c.github.io/webcodecs/samples/)
- [MDN WebCodecs 文档](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
