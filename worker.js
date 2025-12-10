importScripts(
  "demuxer_mp4.js",
  "https://w3c.github.io/webcodecs/samples/video-decode-display/renderer_2d.js",
  "https://w3c.github.io/webcodecs/samples/video-decode-display/renderer_webgl.js",
  "https://w3c.github.io/webcodecs/samples/video-decode-display/renderer_webgpu.js"
);

// 编解码类型支持检测
const detectSupportedCodecs = async () => {
  const supportedCodecs = [
    "avc1.42E01E", // H.264 Baseline
    "avc1.4D401E", // H.264 Main
    "avc1.64001E", // H.264 High
    "hev1.1.6.L93.B0", // H.265/HEVC
    "vp8", // VP8
    "vp09.00.10.08", // VP9
    "av01.0.04M.08", // AV1
  ];
  const results = {};
  for (const codec of supportedCodecs) {
    try {
      const config = {
        codec: codec,
        width: 1920,
        height: 1080,
      };
      const support = await VideoDecoder.isConfigSupported(config);
      results[codec] = {
        supported: support.supported,
        config: support.config,
      };
    } catch (error) {
      results[codec] = {
        supported: false,
        error: error.message,
      };
    }
  }
  return results;
};

// Status UI. Messages are batched per animation frame.
let pendingStatus = null;
const FRAME_DURATION = 1000 / 60;

function setStatus(type, message) {
  if (pendingStatus) {
    pendingStatus[type] = message;
  } else {
    pendingStatus = { [type]: message };
    self.requestAnimationFrame(statusAnimationFrame);
  }
}
function statusAnimationFrame() {
  self.postMessage(pendingStatus);
  pendingStatus = null;
}

// Rendering. Drawing is limited to once per animation frame.
let renderer = null;
let startTime = null;
let frameCount = 0;
let duration = 0;
let frameDuration = 0;
let frameLength = 0;
let fps = 0;
let frameQueue = [];
let isPlaying = false;
let playbackStartTime = null;
let firstFrameTimestamp = null;
let playbackSpeed = 0; // 播放速度倍数

// 按照解码速度渲染
function renderFrame1(frame) {
  let fps = 0;
  if (startTime == null) {
    startTime = performance.now();
  } else {
    const elapsed = (performance.now() - startTime) / 1000;
    fps = ++frameCount / elapsed;
  }
  setStatus(
    "render",
    `${fps.toFixed(0)}fps （duration：${
      frameCount + 1 === frameLength
        ? duration * 1000
        : (frameDuration * frameCount + 1).toFixed(0)
    }ms/${duration * 1000}ms）`
  );
  renderer.draw(frame);
}

function renderFrame(frame) {
  // 按照指定fps渲染
  frameQueue.push({
    frame: frame,
    timestamp: frame.timestamp / 1000, // 转换为毫秒
  });
  // Start playback if not already playing
  if (!isPlaying) {
    isPlaying = true;
    playbackStartTime = performance.now();
    firstFrameTimestamp = frame.timestamp / 1000;
    scheduleNextFrame();
  }
}

function scheduleNextFrame() {
  if (frameQueue.length === 0) {
    isPlaying = false;
    return;
  }
  const frameData = frameQueue.shift();
  const frame = frameData.frame;
  const frameTimestamp = frameData.timestamp;
  // 计算相对时间戳，并根据播放速度调整
  const relativeTimestamp =
    (frameTimestamp - firstFrameTimestamp) / playbackSpeed;
  const targetTime = playbackStartTime + relativeTimestamp;
  const currentTime = performance.now();
  const delay = Math.max(0, targetTime - currentTime);

  setTimeout(() => {
    frameCount++;
    renderer.draw(frame);
    frame.close(); // 释放帧资源
    const targetFps = fps * playbackSpeed;
    setStatus(
      "render",
      `${targetFps.toFixed(1)}fps  （duration：${
        frameCount === frameLength
          ? duration * 1000
          : (frameDuration * frameCount).toFixed(0)
      }ms/${duration * 1000}ms）`
    );
    // 调度下一帧
    scheduleNextFrame();
  }, delay);
}

// Startup.
function start({ dataUri, rendererName, canvas, playbackSpeed: speed = 0 }) {
  // 重置数据
  pendingStatus = null;
  renderer = null;
  startTime = null;
  frameCount = 0;
  duration = 0;
  frameDuration = 0;
  frameLength = 0;
  fps = 0;
  frameQueue = [];
  isPlaying = false;
  playbackStartTime = null;
  firstFrameTimestamp = null;
  // 设置播放速度
  playbackSpeed = speed;
  // Pick a renderer to use.
  switch (rendererName) {
    case "2d":
      renderer = new Canvas2DRenderer(canvas);
      break;
    case "webgl":
      renderer = new WebGLRenderer(rendererName, canvas);
      break;
    case "webgl2":
      renderer = new WebGLRenderer(rendererName, canvas);
      break;
    case "webgpu":
      renderer = new WebGPURenderer(canvas);
      break;
  }

  // 用于解码视频片段
  const decoder = new VideoDecoder({
    output(frame) {
      if (frame.timestamp === 0) console.log("VideoFrame: ", frame);
      if (playbackSpeed === 0) {
        renderFrame1(frame);
      } else {
        // 将帧添加到渲染队列
        renderFrame(frame);
      }
    },
    error(e) {
      console.error("VideoDecoder error:", e);
      setStatus("decode", `Error: ${e.message}`);
    },
  });
  console.log("VideoDecoder", decoder);
  detectSupportedCodecs().then((res) => {
    console.log("SupportedCodecs:", res);
  });

  // Fetch and demux the media data.
  const demuxer = new MP4Demuxer(dataUri, {
    onConfig(config) {
      console.log("Video config:", config);
      setStatus(
        "decode",
        `${config.codec} @ ${config.codedWidth}x${config.codedHeight}`
      );
      // 设置视频帧率
      fps = config.fps || 30; // 默认30fps
      duration = config.duration;
      decoder.configure(config); // 配置视频解码器进行分块解码
    },
    onChunk(chunk, length) {
      frameLength = length;
      frameDuration = (duration * 1000) / length;
      decoder.decode(chunk); // 解码给定的视频片段
    },
    onEndOfStream() {
      decoder.flush(); // 所有待处理的消息都处理完毕
    },
    setStatus,
  });
}

// Listen for the start request.
self.addEventListener("message", (message) => start(message.data), {
  once: true,
});
