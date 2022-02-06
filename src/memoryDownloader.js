
const {
  downloadPhotos,
  downloadVideos
} = require('./services/downloadServices.js');
const {
  initializeEnvironment,
  getMemoryDataFromJSON,
  getOutputInfo
} = require('./services/fileServices.js');

const isDebugging = process.env.DEBUG_MODE;

const downloadMemories = async (filepath, outputDirectory, options, sendMessage) => {  
  initializeEnvironment(filepath, outputDirectory);
  
  const data = getMemoryDataFromJSON(filepath);
  
  if (!data['Saved Media']) {
    sendMessage({
      error: new Error('Invalid memories_history.json file provided. No "Saved Media" found.'),
      message: 'Unable to parse the file you provided.<br />Please try uploading the <tt>memories_history.json</tt> file again.',
    });
    return;
  }
  
  const memories = data['Saved Media'].reverse();

  if (options.concurrent) {
    const sortedMemories = {};

    for (let i = 0; i < memories.length; i++) {
      const year = memories[i].Date.substring(0, 4);

      if (!(year in sortedMemories)) {
        sortedMemories[year] = {
          photos: [],
          videos: []
        };

        for (let j = 0; j < memories.length; j++) {
          const memory = memories[j];

          if (year === memory.Date.substring(0, 4)) {
            if (memory['Media Type'] === 'Image') {
              sortedMemories[year].photos.push(memory);
            }
            else {
              sortedMemories[year].videos.push(memory);
            }
          }
        }
      }
    }

    const tasks = [];
    let photoCount = videoCount = total = 0;

    for (const year in sortedMemories) {
      if (sortedMemories[year].photos) {
        photoCount += sortedMemories[year].photos.length;
        tasks.push(downloadPhotos(sortedMemories[year].photos, sendMessage));
      }
      if (sortedMemories[year].videos) {
        videoCount += sortedMemories[year].videos.length;
        tasks.push(downloadVideos(sortedMemories[year].videos, sendMessage));
      }
    }

    total = photoCount + videoCount;

    if (isDebugging) console.log(`Processing ${total} memories`);

    sendMessage({
      photos: photoCount,
      videos: videoCount,
      totalMemories: total,
      message: 'Downloading photos and videos'
    });


    await Promise.all(tasks);
  }
  else {
    let photos = [];
    let videos = [];
    let total = 0;

    for (memory of memories) {
      if (memory['Media Type'] === 'Image') {
        photos.push(memory);
      }
      else {
        videos.push(memory);
      }
    }

    if (options.photos) total += photos.length;
    if (options.videos) total += videos.length;

    sendMessage({
      photos: photos.length,
      videos: videos.length,
      totalMemories: total
    });

    if (isDebugging) console.log(`Processing ${total} memories`);

    if (options.photos) {
      sendMessage({message: 'Downloading photos'});
      await downloadPhotos(photos, sendMessage);
    }
    
    if (options.videos) {
      sendMessage({message: 'Downloading videos'});
      await downloadVideos(videos, sendMessage);
    }
  }

  const downloadInfo = await getOutputInfo();

  sendMessage({ isComplete: true, ...downloadInfo });
};


module.exports = { downloadMemories };