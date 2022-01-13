import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import siofu from 'socketio-file-upload';
import fs from 'fs';
import { exec, fork } from 'child_process';
import herokuSSLRedirect from 'heroku-ssl-redirect';

const sslRedirect = herokuSSLRedirect.default

const downloadDirectory = './downloads';
const outputDirectory = './memories';
const distributionDirectory = './src/website/static/archive';

if (!fs.existsSync(downloadDirectory)) {
  fs.mkdirSync(downloadDirectory)
}

if (!fs.existsSync(outputDirectory)) {
  fs.mkdirSync(outputDirectory)
}

if (!fs.existsSync(distributionDirectory)) {
  fs.mkdirSync(distributionDirectory)
}

const app = express().use(siofu.router);
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('src/website/static'));
app.use(sslRedirect(['production'], 301)); // enforce 301 HTTPS redirect on production


io.on('connection', (socket) => {
  var uploader = new siofu();
  uploader.dir = downloadDirectory;
  uploader.listen(socket);

  uploader.on('saved', (event) => {
    if (event.file.success) {
      socket.emit('uploadSuccess');

      socket.file = event.file.pathName;

      socket.downloadFolder = `memories/${socket.id}`;
      if (!fs.existsSync(socket.downloadFolder))
        fs.mkdirSync(socket.downloadFolder);


      // Spin up child process
      socket.process = fork('src/downloader/app.js', ['-input', socket.file, '-socket', socket.id]);

      socket.process.on('message', (msg) => {
        socket.emit('message', msg);
      });

      socket.process.on('close', (code) => {
        if (code === 0) {
          socket.emit('downloadLink', `archive/${socket.id}/memories.zip`);
        }
        
        setTimeout(() => {
          exec(`rm -rf src/website/static/archive/${socket.id}`);
        }, 3600000);
      });
    }
    else {
      socket.emit('uploadFail');
    }
  });
  
  uploader.on('error', () => {
    socket.emit('uploadFail');
  });

  socket.on('disconnect', () => {
    if (fs.existsSync(socket.file)) {
      fs.rmSync(socket.file);
    }

    if (socket.process) {
      socket.process.kill('SIGINT')
    }
  });
});

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});