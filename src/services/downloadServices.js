const fetch = require("node-fetch");
const fs = require("fs");
const ffmpeg = require("@ffmpeg-installer/ffmpeg");
const videoStitch = require("video-stitch");
const constants = require("./constants.js");
const {
  writeFile,
  getFileName,
  updateFileMetadata,
} = require("./fileServices.js");

const videoConcat = videoStitch.concat;
const isDebugging = process.env.DEBUG_MODE;

const checkVideoClip = (prev, cur) => {
  if (prev["Media Type"] !== "Video" || cur["Media Type"] !== "Video")
    return false;

  if (prev.Date.substring(0, 13) !== prev.Date.substring(0, 13)) return false;

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
    },
  };

  // Handles most cases, allowing for 30 second difference in recording times
  if (JSON.stringify(times.prev) === JSON.stringify(times.cur)) {
    return true;
  } else if (times.prev.hour == times.cur.hour) {
    if (times.prev.minute == times.cur.minute) {
      return Math.abs(times.prev.second - times.cur.second) <= 24;
    } else if (Math.abs(times.prev.minute - times.cur.minute) == 1) {
      return 48 < times.prev.second && times.cur.second < 12;
    } else return false;
  } else return times.prev.minute == 59 && times.cur.minute == 0;
};

const downloadPhotos = async (photos, failedMemories, sendMessage) => {
  const type = "photo";
  const date = {};
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];

    const res = await fetch(photo["Download Link"], { method: "POST" }).catch(
      (e) => fetchErrorHandler(e, photo, failedMemories)
    );
    if (!res) continue;

    const url = await res.text();
    const download = await fetch(url).catch((e) =>
      fetchErrorHandler(e, photo, failedMemories)
    );
    if (!download) continue;

    const fileName = await getFileName(photo);

    await writeFile(fileName, download.body);
    await updateFileMetadata(fileName, photo);

    removeFailedMemory(photo, failedMemories);

    handleUpdateMessages({
      memory: photo,
      sendMessage,
      type,
      count: i + 1,
      date,
      file: fileName,
      total: photos.length,
    });
  }
};

const downloadVideos = async (videos, failedMemories, sendMessage) => {
  const type = "video";
  const date = {};
  let prevMemory, fileName, prevUrl, prevFileName;
  let clips = [];

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];

    const res = await fetch(video["Download Link"], { method: "POST" }).catch(
      (e) => fetchErrorHandler(e, video, failedMemories)
    );
    if (!res) continue;

    const url = await res.text();
    if (url === prevUrl) continue; // Ignore duplicate URLs

    const isContinuationClip = prevMemory
      ? checkVideoClip(prevMemory, video)
      : false;

    if (isContinuationClip) {
      clips.push({ fileName: prevFileName });
    } else if (clips.length) {
      clips.push({ fileName: prevFileName }); // Last clip was the final clip in this memory

      videoConcat({ ffmpeg_path: ffmpeg.path })
        .clips(clips)
        .output(await getFileName(prevMemory, true))
        .concat()
        .then(async (outputFile) => {
          await updateFileMetadata(outputFile, prevMemory);

          for (const clip of clips) fs.rmSync(clip.fileName);
        })
        .catch((err) => {
          sendMessage({
            message: `There was an issue combining ${clips.length} clips into a single video file.<br /><strong>Don't worry!</strong> The video clips will be saved individually.`,
            smallError: err,
          });

          if (isDebugging) {
            if (err) {
              console.log(
                `An error occurred while trying to combine video clips. Error: ${err.message}`
              );
            } else
              console.log(
                `An unknown error occurred while trying to combine video clips`
              );
          }
        })
        .finally(() => (clips = []));
    }

    const download = await fetch(url).catch((e) =>
      fetchErrorHandler(e, video, failedMemories)
    );
    if (!download) continue;

    fileName = await getFileName(video);

    await writeFile(fileName, download.body);
    await updateFileMetadata(fileName, video);

    removeFailedMemory(video, failedMemories);

    handleUpdateMessages({
      memory: video,
      sendMessage,
      type,
      count: i + 1,
      date,
      total: videos.length,
    });

    prevUrl = url;
    prevMemory = video;
    prevFileName = fileName;
  }
};

const handleUpdateMessages = ({
  date,
  count,
  total,
  type,
  file,
  memory,
  sendMessage,
}) => {
  let isSendingUpdateMessage =
    date.memoriesThisMonth % 10 === 0 || count === 1 || count === total;

  if (!date.month || date.month !== memory.Date.substring(5, 7)) {
    date.month = memory.Date.substring(5, 7);
    date.memoriesThisMonth = 1;
    isSendingUpdateMessage = true;

    if (!date.year || date.year !== memory.Date.substring(0, 4)) {
      date.year = memory.Date.substring(0, 4);
    }
  } else {
    date.memoriesThisMonth++;
  }

  if (isSendingUpdateMessage) {
    sendMessage({
      file,
      count,
      type,
      date: {
        year: date.year,
        month: constants.months[date.month],
      },
      total: count === 1 ? total : undefined,
    });
  }
};

const fetchErrorHandler = (err, memory, failedMemories) => {
  if (isDebugging)
    console.log(`There was an issue fetching a memory. Error: ${err.message}`);

  failedMemories.push(memory);
};

const removeFailedMemory = (memory, failedMemories) => {
  const index = failedMemories.findIndex(
    (failedMemory) => failedMemory["Download Link"] === memory["Download Link"]
  );

  if (index > -1) {
    failedMemories.splice(index, 1);
  }
};

module.exports = { downloadPhotos, downloadVideos };
