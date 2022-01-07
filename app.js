import {
  downloadPhotos,
  downloadVideos
} from './services/downloadServices.js';
import {
  initializeEnvironment,
  getMemoryDataFromJSON,
} from './services/fileServices.js';

initializeEnvironment();

const data = getMemoryDataFromJSON();
const memories = data['Saved Media'].reverse();

console.log('Downloading your memories. This will take a while...');

const photos = memories.filter((memory) => memory['Media Type'] === 'PHOTO');
await downloadPhotos(photos);

const videos = memories.filter((memory) => memory['Media Type'] === 'VIDEO')
await downloadVideos(videos);

console.log(`Memories downloaded successfully!\nYour memories are stored in ${outputDirectory}.`);
