importScripts(
  "https://w3c.github.io/webcodecs/samples/third_party/mp4boxjs/mp4box.all.min.js"
);

// Wraps an MP4Box File as a WritableStream underlying sink.
class MP4FileSink {
  #onEndOfStream = null;
  #setStatus = null;
  #file = null;
  #offset = 0;

  constructor(file, onEndOfStream, setStatus) {
    this.#file = file;
    this.#setStatus = setStatus;
    this.#onEndOfStream = onEndOfStream;
  }

  write(chunk) {
    // MP4Box.js requires buffers to be ArrayBuffers, but we have a Uint8Array.
    const buffer = new ArrayBuffer(chunk.byteLength);
    new Uint8Array(buffer).set(chunk);

    // Inform MP4Box where in the file this chunk is from.
    buffer.fileStart = this.#offset;
    this.#offset += buffer.byteLength;

    // Append chunk.
    this.#setStatus("fetch", (this.#offset / 1024 ** 2).toFixed(1) + " MiB");
    this.#file.appendBuffer(buffer);
  }

  close() {
    this.#setStatus("fetch", "Done");
    this.#file.flush();
    this.#onEndOfStream();
  }
}

// 使用MP4Box解密MP4文件的第一个视频track，调用 `onConfig（）`和`onChunk（）`带有相应的WebCodecs对象。
// 使用mp4box对mp4文件进行元数据解析
class MP4Demuxer {
  #onConfig = null;
  #onChunk = null;
  #setStatus = null;
  #file = null;

  constructor(uri, { onConfig, onChunk, onEndOfStream, setStatus }) {
    this.#onConfig = onConfig;
    this.#onChunk = onChunk;
    this.#setStatus = setStatus;

    // Configure an MP4Box File for demuxing.
    this.#file = MP4Box.createFile();
    this.#file.onError = (error) => setStatus("demux", error);
    this.#file.onReady = this.#onReady.bind(this);
    this.#file.onSamples = this.#onSamples.bind(this);

    // 获取文件数据流
    const fileSink = new MP4FileSink(this.#file, onEndOfStream, setStatus);
    fetch(uri).then((response) => {
      // highWaterMark应设置得足够大以确保流畅播放，但过低则更节省内存。
      response.body.pipeTo(new WritableStream(fileSink, { highWaterMark: 2 }));
    });
  }

  // 获取特定track的适当“描述”。假设
  // track是H.264、H.265、VP8、VP9或AV1。
  #description(track) {
    const trak = this.#file.getTrackById(track.id);
    for (const entry of trak.mdia.minf.stbl.stsd.entries) {
      // BoxParser
      const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
      console.log("BoxParser: ", entry);
      if (box) {
        const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
        box.write(stream);
        return new Uint8Array(stream.buffer, 8); // Remove the box header.
      }
    }
    throw new Error("avcC, hvcC, vpcC, or av1C box not found");
  }

  // 视频数据被解析完毕
  #onReady(info) {
    const duration = info.duration / info.timescale;
    this.#setStatus("demux", "Ready");
    const track = info.videoTracks[0];
    const fps = Math.round(track.nb_samples / duration);
    console.log(
      "MP4box视频数据解析完毕",
      "\n",
      "duration：",
      duration,
      "\n",
      "fps：",
      fps,
      "\n",
      "Chunk-length：",
      track.nb_samples,
      "\n",
      "info：",
      info
    );
    // 生成并发出适当的VideoDecoderConfig。
    this.#onConfig({
      // 浏览器不支持解析完整的vp8编解码器（例如：`vp08.00.41.08`），
      // 它们只支持vp8。
      codec: track.codec.startsWith("vp08") ? "vp8" : track.codec, // 当前浏览器支持的编码器
      codedHeight: track.video.height,
      codedWidth: track.video.width,
      description: this.#description(track), // 编解码器特定字节序列
      duration,
      fps,
    });
    this.#file.setExtractionOptions(track.id, "", { nbSamples: 2000 }); // 设置提取选项
    this.#file.start(); // 开始提取视频帧
  }

  // 完成视频帧数组提取
  #onSamples(track_id, ref, samples) {
    console.log("视频帧数据：", samples);
    // 为每个视频帧生成并发出一个编码的VideoChunk。
    console.log(
      "VideoChunk：",
      new EncodedVideoChunk({
        type: samples[0].is_sync ? "key" : "delta", // 此数据块是否为关键帧 key:关键帧 delta:非关键帧 关键块的解码不依赖于其他帧
        timestamp: (1e6 * samples[0].cts) / samples[0].timescale,
        duration: (1e6 * samples[0].duration) / samples[0].timescale,
        data: samples[0].data,
      })
    );
    for (const sample of samples) {
      this.#onChunk(
        // 编码视频字节
        new EncodedVideoChunk({
          type: sample.is_sync ? "key" : "delta",
          timestamp: (1e6 * sample.cts) / sample.timescale,
          duration: (1e6 * sample.duration) / sample.timescale,
          data: sample.data,
        }),
        samples.length
      );
    }
  }
}
