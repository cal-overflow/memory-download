import {
  downloadPhotos,
  downloadVideos
} from './services/downloadServices.js';
import {
  initializeEnvironment,
  getMemoryDataFromJSON,
  getOutputDirectory,
  zipFiles
} from './services/fileServices.js';

const wantsFilesZipped = process.argv.includes('-zip');

initializeEnvironment();

const data = getMemoryDataFromJSON();
const memories = data['Saved Media'].reverse();

console.log('Downloading your memories. This will take a while...');

const photos = memories.filter((memory) => memory['Media Type'] === 'Image');
await downloadPhotos(photos);

const videos = memories.filter((memory) => memory['Media Type'] === 'Video')
await downloadVideos(videos);

console.log(`Memories downloaded successfully!`);

if (wantsFilesZipped) {
  await zipFiles();
  console.log(`There is an unarchvied copy of your memories in ${getOutputDirectory()}.`);
}
else {
  console.log(`Your memories are stored in ${getOutputDirectory()}.`);
}
