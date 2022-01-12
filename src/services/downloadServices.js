import fetch from 'node-fetch';
import fs from 'fs';
import videoStitch from 'video-stitch';
import {writeFile, getFileName, updateFileMetadata} from './fileServices.js';

const videoConcat = videoStitch.concat;

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

const downloadPhotos = async (photos) => {
  let year;

  for (const photo of photos) {
    if (year !== photo.Date.substring(0, 4)) {
      year = photo.Date.substring(0, 4);
      console.log(`Downloading photos from ${year}.`);
    }

    const res = await fetch(photo['Download Link'], {method: 'POST'});
    const url = await res.text();
    const download = await fetch(url);
    const fileName = await getFileName(photo);

    await writeFile(fileName, download.body);
    updateFileMetadata(fileName, photo);
  }
};

const downloadVideos = async (videos) => {
  let clips = [];
  let year, prevMemory, fileName, fileStream, prevUrl, prevFileName;

  for (const video of videos) {
    if (year !== video.Date.substring(0, 4)) {
      year = video.Date.substring(0, 4);
      console.log(`Downloading videos from ${year}.`);
    }

    const res = await fetch((video['Download Link']), {method: 'POST'});
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
      .output(await getFileName(prevMemory, true))
      .concat()
      .then((outputFile) => {
        updateFileMetadata(outputFile, prevMemory);

        for (const clip of clips)
          fs.rmSync(clip.fileName);
      })
      .catch(() => {
        console.log(`There was an issue combining ${clips.length} clips into a single video file.\nDon't worry! The video clips will be saved individually.`);
      })
      .finally(() => clips = []);
    }

    const download = await fetch(url);
    fileName = await getFileName(video);

    await writeFile(fileName, download.body);
    updateFileMetadata(fileName, video);

    prevUrl = url;
    prevMemory = video;
    prevFileName = fileName;
  }
};

export {downloadPhotos, downloadVideos};