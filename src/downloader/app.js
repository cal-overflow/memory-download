
import {
  downloadPhotos,
  downloadVideos
} from './services/downloadServices.js';
import {
  initializeEnvironment,
  getMemoryDataFromJSON,
  zipFiles
} from './services/fileServices.js';

initializeEnvironment();

const data = getMemoryDataFromJSON();

if (!data['Saved Media']) {
  process.send({error: 'Unable to parse the file you provided.<br />Please try uploading the <tt>memories_history.json</tt> file again.'});
  process.exit(1);
}

const memories = data['Saved Media'].reverse();
process.send({total: memories.length});

const photos = memories.filter((memory) => memory['Media Type'] === 'Image');
await downloadPhotos(photos);

const videos = memories.filter((memory) => memory['Media Type'] === 'Video')
await downloadVideos(videos);

await zipFiles();

process.send('Done!');
