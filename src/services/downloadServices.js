import fetch from 'node-fetch';
import fs from 'fs';
import videoStitch from 'video-stitch';
import {writeFile, getFileName, updateFileMetadata} from './fileServices.js';

const videoConcat = videoStitch.concat;
const isDebugging = process.env.DEBUG_MODE;

const checkVideoClip = (prev, cur) => {
  if (prev['Media Type'] !== 'Video' || cur['Media Type'] !== 'Video')
    return false;
  
  if (prev.Date.substring(0, 13) !== prev.Date.substring(0, 13)) 
    return false;

  const times = {
    prev: {
      hour: parseInt(prev.Date.substring(11, 13)),
      minute: parseInt(prev.Date.substring(14, 16)),
      second: parseInt(prev.Date.substring(17, 19)),
    },
    cur: {
      hour: parseInt(cur.Date.substring(11, 13)),
      minute: parseInt(cur.Date.substring(14, 16)),
      second: parseInt(cur.Date.substring(17, 19)),
    }
  };

  // Handles most cases, allowing for 30 second difference in recording times
  if (JSON.stringify(times.prev) === JSON.stringify(times.cur)) {
    return true;
  }
  else if (times.prev.hour == times.cur.hour) {
    if (times.prev.minute == times.cur.minute) {
      return Math.abs(times.prev.second - times.cur.second) <= 24;
    }
    else if (Math.abs(times.prev.minute - times.cur.minute) == 1) {
      return (48 < times.prev.second && times.cur.second < 12);
    }
    else return false;
  }
  else return (times.prev.minute == 59 && times.cur.minute == 0);
};

const downloadPhotos = async (memories, socket) => {
  const photos = memories.filter((memory) => memory['Media Type'] === 'Image');
  const type = 'photo';
  let year;

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    
    if (year !== photo.Date.substring(0, 4)) {
      year = photo.Date.substring(0, 4);
      sendSocketMessages({
        socket,
        count: i,
        type,
        year
      });
    }
    else {
      sendSocketMessages({
        socket,
        count: i,
        type
      });
    }

    const res = await fetch(photo['Download Link'], {method: 'POST'}).catch((e) => fetchErrorHandler(e, socket, photo));
    if (!res) continue;

    const url = await res.text();
    const download = await fetch(url).catch((e) => fetchErrorHandler(e, socket, photo));
    if (!download) continue;

    const fileName = await getFileName(photo, socket);

    await writeFile(fileName, download.body, socket);
    updateFileMetadata(fileName, photo);
  }
};

const downloadVideos = async (memories, socket) => {
  const photoCount = memories.filter((memory) => memory['Media Type'] === 'Image').length;
  const videos = memories.filter((memory) => memory['Media Type'] === 'Video');
  const type = 'video';
  let year, prevMemory, fileName, prevUrl, prevFileName;
  let clips = [];

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];

    if (year !== video.Date.substring(0, 4)) {
      year = video.Date.substring(0, 4);
      sendSocketMessages({
        socket,
        type,
        count: i + photoCount,
        year
      });
    }
    else {
      sendSocketMessages({
        socket,
        type,
        count: i + photoCount
      });
    }

    const res = await fetch((video['Download Link']), {method: 'POST'}).catch((e) => fetchErrorHandler(e, socket, video));
    if (!res) continue;

    const url = await res.text();
    if (url === prevUrl) continue; // Ignore duplicate URLs

    const isContinuationClip = prevMemory ? checkVideoClip(prevMemory, video) : false;
    
    if (isContinuationClip) {
      clips.push({fileName: prevFileName});
    }
    else if (clips.length) {
      clips.push({fileName: prevFileName}); // Last clip was the final clip in this memory

      videoConcat()
      .clips(clips)
      .output(await getFileName(prevMemory, socket, true))
      .concat()
      .then((outputFile) => {
        updateFileMetadata(outputFile, prevMemory);

        for (const clip of clips)
          fs.rmSync(clip.fileName);
      })
      .catch((err) => {
        socket.emit('message', {message: `There was an issue combining ${clips.length} clips into a single video file.<br /><strong>Don't worry!</strong> The video clips will be saved individually.`});

        if (isDebugging) {
          if (err) {
            console.log(`[${socket.id}] An error occurred while trying to combine video clips. Error: ${err.message}`);
          }
          else console.log(`[${socket.id}] An unknown error occurred while trying to combine video clips`);
        }
      })
      .finally(() => clips = []);
    }

    const download = await fetch(url).catch((e) => fetchErrorHandler(e, socket, video));
    if (!download) continue;

    fileName = await getFileName(video, socket);

    await writeFile(fileName, download.body, socket);
    updateFileMetadata(fileName, video);

    prevUrl = url;
    prevMemory = video;
    prevFileName = fileName;
  }
};

const sendSocketMessages = ({socket, year, count, type}) => {
  if (year || (count % 10 === 0 && count !== 0)) {
    socket.emit('message', {
      count,
      message: year ? `Processing ${type}s from ${year}.` : undefined
    });
  }
};

const fetchErrorHandler = (err, socket, memory) => {
  if (isDebugging) console.log(`[${socket.id}] There was an issue fetching a memory. Error: ${err.message}`);

  socket.emit('message', {
    failedMemory: memory
  });
};

export {downloadPhotos, downloadVideos};