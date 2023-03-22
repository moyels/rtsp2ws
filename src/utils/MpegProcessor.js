const {EventEmitter} = require("events");
const childProcess = require("child_process");

const mpegProcessDefaultOptions = {
  url: "",
  path: "",
  transportType: "tcp",
  ffmpegOptions: {}
}

class MpegProcessor extends EventEmitter {
  /**
   * 构造方法
   *
   * @param options {
   *   {
   *     captureRejections?: boolean | undefined,
   *     url: string,
   *     path: string,
   *     transportType: "tcp" | "udp" | "udp_multicast" | "http" | "https",
   *     ffmpegOptions?: {}
   *   }
   * }
   */
  constructor(options = mpegProcessDefaultOptions) {
    super(options);

    this.options = {...mpegProcessDefaultOptions, ...options};

    this.url = this.options.url;
    this.transportType = this.options.transportType;
    this.ffmpegOptions = options.ffmpegOptions;
    this.additionalFlags = [];

    // 添加新的配置
    if (this.ffmpegOptions) {
      for (const key in this.ffmpegOptions) {
        const value = String(this.ffmpegOptions[key]);
        if (value !== "") {
          this.additionalFlags.push(key);
          this.additionalFlags.push(value);
        }
      }
    }

    this.spawnOptions = [
      "-rtsp_transport",
      this.transportType,
      "-i",
      this.url,
      '-f',
      'mpegts',
      '-codec:v',
      'mpeg1video',
      // additional ffmpeg options go here
      ...this.additionalFlags,
      '-'
    ];
  }

  open() {
    this.stream = childProcess.spawn(this.options.path, this.spawnOptions, {detached: false});
    this.inputStreamStarted = true;
    this.exitCode = undefined;

    this.registerEvent();
  }

  registerEvent() {
    const that = this;
    that.stream.stdout.on("data", (data) => {
      return that.emit("data", data);
    });
    that.stream.stderr.on("data", (error) => {
      return that.emit("error", error);
    })

    // 理论上来讲，除非rtsp流断开，否则stream将不会自动退出
    that.stream.on("exit", (code, signal) => {
      if (code === 1 && signal !== "SIGUSR1") {
        console.log("意外退出");
        that.exitCode = 1;
        return that.emit("illegal_exit");
      }

      that.exitCode = 0;
      return that.emit("exit");
    })
  }

  /**
   * 返回 true 时表示状态正常， false 时表示异常
   * @returns {boolean} 状态是否正常
   */
  status() {
    return this.exitCode === undefined;
  }

  close() {
    if (this.stream && this.inputStreamStarted) {
      this.inputStreamStarted = false;
      this.stream.kill();
    }
  }
}

module.exports = MpegProcessor;