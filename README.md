# RTSP TO WS

> 将`RTSP`视频流解析为`WebSocket`形式（转换后视频格式为MPEG1），在前端使用支持`WebSocket`
> 的播放器[JSMpeg](https://www.npmjs.com/package/@cycjimmy/jsmpeg-player)即可实现web页面播放rtsp视频流

## 使用方式一（未打包为npm包的情况下）

```javascript
const Rtsp2WsServer = require("./src/utils/Rtsp2WsServer");

const rtsp2ws = new Rtsp2WsServer({ffmpeg: "D:\\pgs\\ffmpeg-master-latest-win64-gpl\\bin\\ffmpeg.exe"});
rtsp2ws.listen();
```

使用如上代码则启动了一个websocket服务，在前端构造对应的websocket连接地址放入播放器url中即可播放

### 详细介绍

Rtsp2WsServer的构造函数默认参数如下

```json
{
  "port": 9999,
  "path": "/proxy",
  "ffmpeg": "ffmpeg",
  "audio": true,
  "freeTime": 60,
  "checkTime": 10,
  "transportType": "tcp"
}
```

| 属性            | 默认值    | 描述                | 备注                    |
|---------------|--------|-------------------|-----------------------|
| port          | 9999   | websocket服务端口     | ---                   |
| path          | /proxy | 类似contextPath     | ---                   |
| ffmpeg        | ffmpeg | ffmpeg安装位置        | 如ffmpeg存在于环境变量中，可直接使用 |
| audio         | true   | 是否播放声音            | 目前未做此功能，但可以通过url参数实现  |
| freeTime      | 60     | 多长时间后将ffmpeg视为闲置  | 闲置的ffmpeg解析流将被中止      |
| checkTime     | 10     | 检查ffmpeg进程是否闲置的间隔 | ---                   |
| transportType | tcp    | rtsp流传输协议         | ---                   |

按照如上默认的参数配置，启动websocket服务后，ws的连接为 `ws://localhost:9999/proxy`，具体的连接url按自己的配置设置

### 播放器url

同时，因为每个页面需要代理的url不同，所以将需要代理的url通过ws连接统一传递

示例：
如你有一个rtsp视频流地址如下： `rtsp://localhost:8554/video`，使用如下方式拼接

```javascript
const wsUrl = "ws://localhost:9999/proxy"
const rtspUrl = "rtsp://localhost:8554/video"

function concatLink() {
  return `${wsUrl}?url=${btoa(rtspUrl)}`
}
```

同时url连接中还可以写入ffmpeg解析视频流的参数，如：是否播放声音(-an)，视频质量(-q)等内容，详情见[ffmpeg配置项](https://ffmpeg.org/ffmpeg.html#Main-options)