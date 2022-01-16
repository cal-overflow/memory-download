import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import siofu from 'socketio-file-upload';
import fs from 'fs';
import redirectSSL from 'redirect-ssl';
import {downloadMemories} from './memoryDownloader.js';

const isDebugging = process.env.DEBUG_MODE;
const isProdEnv = process.env.NODE_ENV === 'production';
const archiveDeletionDelay = isProdEnv ? 600000 : 60000;

const downloadDirectory = './downloads';
const outputDirectory = './memories';
const distributionDirectory = './src/public/archive';

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
  enabled: isProdEnv,
  statusCode: 301
}));

const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use('/', express.static('src/public'));

app.get('/*', (req, res) => {
  if (/archive\/([a-zA-Z0-9~@#$^*()_+=[\]{}|\\,.?: -])*\/memories\.zip/i.test(req.path)) {
    // send 400 if file does not exist
    if (!fs.existsSync(req.path)) {
      res.status(400).send('Invalid download link');
    }
  }
  else res.redirect('/');
});

io.on('connection', (socket) => {
  if (isDebugging) console.log(`[${socket.id}] Socket connected`);

  var uploader = new siofu();
  uploader.dir = downloadDirectory;
  uploader.listen(socket);

  uploader.on('saved', async (event) => {
    if (event.file.success) {
      socket.emit('uploadSuccess');

      socket.file = event.file.pathName;

      socket.downloadFolder = `memories/${socket.id}`;
      if (!fs.existsSync(socket.downloadFolder)) {
        fs.mkdirSync(socket.downloadFolder);
      }
      
      if (isDebugging) console.log(`[${socket.id}] Downloading memories`);

      downloadMemories(socket)
      .then(() => {
        if (isDebugging) console.log(`[${socket.id}] Download complete`);
      })
      .catch((err) => {
        if (socket.connected) {
          socket.emit('message', {error: 'An unknown error occurred while processing your memories.<br />Please try again'});
          
          if (isDebugging) {
            console.log(`[${socket.id}] An error occured while downloading memories. Error: ${err.message}`);
          }
        }
      });
    }
    else {
      socket.emit('uploadFail');
    }
  });
  
  uploader.on('error', () => {
    socket.emit('uploadFail');
  });

  socket.on('download', () => {
    if (isDebugging) console.log(`[${socket.id}] Download link clicked`);
  });

  socket.on('disconnect', () => {
    if (isDebugging) console.log(`[${socket.id}] Socket disconnected`);

    const uncompressedMemories = `${outputDirectory}/${socket.id}`;
    const compressedMemories = `${distributionDirectory}/${socket.id}`;    

    // delete JSON input file
    if (fs.existsSync(socket.file)) {
      fs.rmSync(socket.file);
    }
    
    // delete uncompressed memories from the server
    if (fs.existsSync(uncompressedMemories)) {
      fs.rm(
        uncompressedMemories,
        {
          recursive: true,
          force: true
        },
        (err) => fsCallback(err, uncompressedMemories, socket)
      );
    }

    // set timer to delete compressed memories from the server after delay
    if (fs.existsSync(compressedMemories)) {
      setTimeout(() => {
        if (isDebugging) console.log(`[${socket.id}] Destroying archive file`);
        fs.rm(
          compressedMemories, 
          {
            recursive: true,
            force: true
          },
          (err) => fsCallback(err, compressedMemories, socket)
        );
      }, archiveDeletionDelay);
    }
  });
});

const fsCallback = (err, path, socket) => {
  if (isDebugging) {
    if (err) {
      console.log(`[${socket.id}] Failed to remove directory ${path}`);
      if (err.message) console.log(`[${socket.id}] Error: ${err.message}`);
      else console.log(`error: ${error}`);
    }
    else console.log(`[${socket.id}] Successfully deleted contents of ${path}`)
  }
};

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});