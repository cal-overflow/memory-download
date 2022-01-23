
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

const downloadMemories = async (filepath, outputDirectory, sendMessage) => {  
  initializeEnvironment(filepath, outputDirectory);
  
  const data = getMemoryDataFromJSON(filepath);
  
  if (!data['Saved Media']) {
    sendMessage({error: 'Unable to parse the file you provided.<br />Please try uploading the <tt>memories_history.json</tt> file again.'});
    return;
  }
  
  const memories = data['Saved Media'].reverse();
  const total = memories.length;
  
  sendMessage({total});

  if (isDebugging) console.log(`Processing ${total} memories`);
  
  await downloadPhotos(memories, sendMessage);
  await downloadVideos(memories, sendMessage);
  const downloadInfo = await getOutputInfo();

  sendMessage({ total, isComplete: true, ...downloadInfo });
};


module.exports = { downloadMemories };