import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import siofu from 'socketio-file-upload';
import fs from 'fs';
import { exec, fork } from 'child_process';
import redirectSSL from 'redirect-ssl';

const isDebugging = process.env.DEBUG_MODE;

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
app.use(redirectSSL.create({
  enabled: process.env.NODE_ENV === 'production',
  statusCode: 301
}));

const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use('/', express.static('src/website/static'));

app.get('/*', (req, res) => {
  res.redirect('/');
});

io.on('connection', (socket) => {
  if (isDebugging) console.log(`[${socket.id}] Socket connected`);

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
      const downloaderArguments = ['-input', socket.file, '-socket', socket.id];

      if (isDebugging) {
        console.log(`[${socket.id}] Starting child process`);
        downloaderArguments.push('-debug');
      }

      socket.process = fork('src/downloader/app.js', downloaderArguments);
      
      socket.process.on('message', (data) => {
        if (isDebugging && data.debug) {
          console.log(`[${socket.id}][CHILD] ${data.debug}`);
        }
        else socket.emit('message', data);
      });

      socket.process.on('close', (code) => {
        if (isDebugging) console.log(`[${socket.id}][CHILD] Process exited with code ${code}`);

        if (code === 0) {
          socket.emit('downloadLink', `archive/${socket.id}/memories.zip`);
        }
        
        setTimeout(() => {
          if (isDebugging) console.log(`[${socket.id}] One hour has passed... deleting archive`);
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
    if (isDebugging) console.log(`[${socket.id}] Socket disconnected`);

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