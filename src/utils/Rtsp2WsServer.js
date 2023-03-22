const ws = require("ws");
const {EventEmitter} = require("events");
const MpegProcessor = require("./MpegProcessor");
const uUrl = require("./uUrl");
const {atob} = require("buffer");

const RTSP_URL_KEY = "url";

const rtsp2WsServerDefaultOptions = {
  port: 9999,
  path: "/proxy",
  ffmpeg: "ffmpeg",
  audio: true,
  freeTime: 60,
  checkTime: 10,
  transportType: "tcp"
};

// 无特殊意义，借助此内容构造url，提取其中的query参数
const exampleBaseUrl = "https://example.com";

class Rtsp2WsServer extends EventEmitter {
  /**
   * 构造函数
   *
   * @param options {
   *   {
   *     captureRejections?: boolean | undefined,
   *     port?: number,
   *     path?: string,
   *     ffmpeg?: string,
   *     audio?: boolean,
   *     freeTime?: number,
   *     checkTime?: number
   *   }
   * }
   */
  constructor(options = rtsp2WsServerDefaultOptions) {
    super(options);

    this.options = {...rtsp2WsServerDefaultOptions, ...options};
    this.port = this.options.port;
    this.path = this.options.path;
    this.ffmpeg = this.options.ffmpeg;
    this.audio = this.options.audio;
    this.freeTime = this.options.freeTime;
    this.checkTime = this.options.checkTime;
    this.transportType = this.options.transportType;
    /**
     * ws客户端及ffmpeg处理过程 holder
     *
     * @type {Record<string,{mpegProcessor:MpegProcessor,wss:WebSocket[]}>}
     */
    this.clientHolders = {};
    /**
     * 保存 检查 任务
     * @type {Record<string, number>}
     */
    this.checkTaskRecord = {};
  }

  /**
   * 启动 ws 服务
   */
  listen() {
    let that = this;
    that.wss = new ws.WebSocketServer({port: that.port, path: that.path});
    that.startCheckTask();

    that.wss.on("connection", function (ws, req) {
      const url = new URL(req.url, exampleBaseUrl);
      const reUrlStr = uUrl.rearrangeUrl(url);

      ws.on("close", () => {
        if (Object.keys(that.clientHolders).includes(reUrlStr)) {
          let index = that.clientHolders[reUrlStr].wss.indexOf(ws);

          if (index === -1) {
            return
          }

          that.clientHolders[reUrlStr].wss.splice(index, 1)
        }
      });

      if (Object.keys(that.clientHolders).includes(reUrlStr)) {
        that.clientHolders[reUrlStr].wss.push(ws);
        return;
      }

      const params = {};
      for (const key of url.searchParams.keys()) {
        const value = String(url.searchParams.get(key));
        if (value !== "") {
          params[key] = value;
        }
      }

      if (!Object.keys(params).includes(RTSP_URL_KEY)) {
        ws.close();
        return
      }

      let rtspUrl = params.url;
      try {
        rtspUrl = atob(rtspUrl);
      } catch (e) {
        console.log(e);
        return;
      }

      const mpegProcessor = new MpegProcessor({
        url: rtspUrl,
        path: that.ffmpeg,
        transportType: that.transportType,
        ffmpegOptions: {...params, url: ""}
      });

      that.clientHolders[reUrlStr] = {mpegProcessor: mpegProcessor, wss: [ws]};

      mpegProcessor.on("data", (data) => {
        if (that.holderNotFound(reUrlStr)) {
          return;
        }

        that.clientHolders[reUrlStr].wss.forEach(ws => {
          ws.send(data);
        });
      });

      mpegProcessor.on("error", (error) => {
        that.exitMpegProcessor()
      })

      mpegProcessor.on("exit", () => {
        that.exitMpegProcessor()
      });

      mpegProcessor.open();

      that.checkTaskRecord[reUrlStr] = 0;
    })
  }

  startCheckTask() {
    this.checkTaskIndex = setInterval(this.checkTaskFunc(this), this.options.checkTime * 1000);
  }

  checkTaskFunc(that) {
    return () => {
      console.log(`检查开始，需要检查的url如下 ${Object.keys(that.checkTaskRecord).join("------")}`)

      for (let url in that.checkTaskRecord) {
        if (!that.clientHolders[url]) {
          continue;
        }

        if (that.holderNotFound(url)) {
          that.checkTaskRecord[url] += that.options.checkTime;

          console.log(`url:\t${url}\nfreeTime:\t${that.checkTaskRecord[url]}`)

          if (that.checkTaskRecord[url] >= 60) {
            try {
              that.exitMpegProcessor(url);
              delete that.checkTaskRecord[url];
            } catch (e) {
              console.log(e);
            }
          }

          continue
        }

        that.checkTaskRecord[url] = 0;
      }
    }
  }

  stopCheckTask() {
    if (this.checkTaskIndex) {
      clearInterval(this.checkTaskIndex);
    }
  }

  holderNotFound(reUrlStr) {
    return !this.clientHolders[reUrlStr] || !this.clientHolders[reUrlStr].wss || this.clientHolders[reUrlStr].wss.length === 0
  }

  exitMpegProcessor(reUrlStr) {
    if (this.holderNotFound(reUrlStr) && !this.clientHolders[reUrlStr]) {
      return;
    }

    this.clientHolders[reUrlStr].wss.forEach(ws => {
      ws.close();
    })

    this.clientHolders[reUrlStr].wss.length = 0;
    this.clientHolders[reUrlStr].mpegProcessor.close();
    delete this.clientHolders[reUrlStr];
  }
}

module.exports = Rtsp2WsServer;