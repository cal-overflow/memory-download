
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
    sendMessage({error: 'Unable to parse the file you provided.<br />Please try uploading the <tt>memories_history.json</tt> file again.'});
    return;
  }
  
  const memories = data['Saved Media'].reverse();
  let total = 0;
  let photos = [];
  let videos = [];

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
    total
  });
  if (isDebugging) console.log(`Processing ${total} memories`);

  if (options.photos) {
    await downloadPhotos(photos, sendMessage);
  }

  if (options.videos) {
    const countOffset = options.photos ? photos.length : 0;
    await downloadVideos(videos, countOffset, sendMessage);
  }

  const downloadInfo = await getOutputInfo();

  sendMessage({ total, isComplete: true, ...downloadInfo });
};


module.exports = { downloadMemories };