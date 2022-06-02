const {
  downloadPhotos,
  downloadVideos,
} = require("./services/downloadServices.js");
const {
  initializeEnvironment,
  getMemoryDataFromJSON,
  getOutputInfo,
} = require("./services/fileServices.js");

const isDebugging = process.env.DEBUG_MODE;

const failedMemories = {
  photos: [],
  videos: [],
  reAttempted: [],
};

const downloadMemories = async (
  filepath,
  outputDirectory,
  options,
  sendMessage
) => {
  initializeEnvironment(filepath, outputDirectory);

  const data = getMemoryDataFromJSON(filepath);

  if (!data["Saved Media"]) {
    sendMessage({
      error: new Error(
        'Invalid memories_history.json file provided. No "Saved Media" found.'
      ),
      message:
        "Unable to parse the file you provided.<br />Please try uploading the <tt>memories_history.json</tt> file again.",
    });
    return;
  }

  const memories = data["Saved Media"].reverse();

  if (options.concurrent) {
    const sortedMemories = {};

    for (let i = 0; i < memories.length; i++) {
      const year = memories[i].Date.substring(0, 4);

      if (!(year in sortedMemories)) {
        sortedMemories[year] = {
          photos: [],
          videos: [],
        };

        for (let j = 0; j < memories.length; j++) {
          const memory = memories[j];

          if (year === memory.Date.substring(0, 4)) {
            if (memory["Media Type"] === "Image") {
              sortedMemories[year].photos.push(memory);
            } else {
              sortedMemories[year].videos.push(memory);
            }
          }
        }
      }
    }

    const tasks = [];
    let photoCount = 0;
    let videoCount = 0;
    let total = 0;

    for (const year in sortedMemories) {
      if (sortedMemories[year].photos) {
        photoCount += sortedMemories[year].photos.length;
        tasks.push(
          downloadPhotos(
            sortedMemories[year].photos,
            failedMemories.photos,
            sendMessage
          )
        );
      }
      if (sortedMemories[year].videos) {
        videoCount += sortedMemories[year].videos.length;
        tasks.push(
          downloadVideos(
            sortedMemories[year].videos,
            failedMemories.videos,
            sendMessage
          )
        );
      }
    }

    total = photoCount + videoCount;

    if (isDebugging) console.log(`Processing ${total} memories`);

    sendMessage({
      photos: photoCount,
      videos: videoCount,
      totalMemories: total,
      message: "Downloading photos and videos",
    });

    await Promise.all(tasks);

    if (failedMemories.photos.length || failedMemories.videos.length) {
      if (
        !(
          failedMemories.photos.length === photoCount &&
          failedMemories.videos.length === videoCount
        )
      ) {
        const reAttemptTasks = [];
        if (isDebugging)
          console.log(
            `Re-attempting to download ${failedMemories.photos.length} photos and ${failedMemories.videos.length} videos`
          );
        sendMessage({ isReAttemptingFailedMemories: true });

        if (failedMemories.photos.length) {
          reAttemptTasks.push(
            downloadPhotos(
              failedMemories.photos,
              failedMemories.reAttempted,
              sendMessage
            )
          );
        }
        if (failedMemories.videos.length) {
          reAttemptTasks.push(
            downloadVideos(
              failedMemories.videos,
              failedMemories.reAttempted,
              sendMessage
            )
          );
        }

        sendMessage({
          message: `Re-attempting to download ${
            failedMemories.photos.length + failedMemories.videos.length
          } memories`,
        });
        await Promise.all(reAttemptTasks);
      } else {
        failedMemories.reAttempted = failedMemories.photos.concat(
          failedMemories.videos
        );
      }
    }
  } else {
    let photos = [];
    let videos = [];
    let total = 0;

    for (const memory of memories) {
      if (memory["Media Type"] === "Image") {
        photos.push(memory);
      } else {
        videos.push(memory);
      }
    }

    if (options.photos) total += photos.length;
    if (options.videos) total += videos.length;

    sendMessage({
      photos: photos.length,
      videos: videos.length,
      totalMemories: total,
    });

    if (isDebugging) console.log(`Processing ${total} memories`);

    if (options.photos) {
      sendMessage({ message: "Downloading photos" });
      await downloadPhotos(photos, failedMemories.photos, sendMessage);
    }

    if (options.videos) {
      sendMessage({ message: "Downloading videos" });
      await downloadVideos(videos, failedMemories.videos, sendMessage);
    }

    if (failedMemories.photos.length || failedMemories.videos.length) {
      if (
        !(
          failedMemories.photos.length === photos.length &&
          failedMemories.videos.length === videos.length
        )
      ) {
        if (isDebugging)
          console.log(
            `Re-attempting to download ${failedMemories.photos.length} photos and ${failedMemories.videos.length} videos`
          );
        sendMessage({ isReAttemptingFailedMemories: true });

        if (failedMemories.photos.length) {
          sendMessage({
            message: `Re-attempting to download ${failedMemories.photos.length} photos`,
          });
          await downloadPhotos(
            failedMemories.photos,
            failedMemories.reAttempted,
            sendMessage
          );
        }

        if (failedMemories.videos.length) {
          sendMessage({
            message: `Re-attempting to download ${failedMemories.videos.length} videos`,
          });
          await downloadVideos(
            failedMemories.videos,
            failedMemories.reAttempted,
            sendMessage
          );
        }
      } else {
        failedMemories.reAttempted = failedMemories.photos.concat(
          failedMemories.videos
        );
      }
    }
  }

  if (failedMemories.reAttempted.length) {
    sendMessage({ failedMemories: failedMemories.reAttempted });
  }

  const downloadInfo = await getOutputInfo();

  sendMessage({ isComplete: true, ...downloadInfo });
};

module.exports = { downloadMemories };
