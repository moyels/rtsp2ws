const Rtsp2WsServer = require("./src/utils/Rtsp2WsServer");

const rtsp2ws = new Rtsp2WsServer({ffmpeg: "D:\\pgs\\ffmpeg-master-latest-win64-gpl\\bin\\ffmpeg.exe"});

rtsp2ws.listen();