
import {
  downloadPhotos,
  downloadVideos
} from './services/downloadServices.js';
import {
  initializeEnvironment,
  getMemoryDataFromJSON,
  zipFiles
} from './services/fileServices.js';

const isDebugging = process.env.DEBUG_MODE;

export const downloadMemories = async (socket) => {  
  initializeEnvironment(socket);
  
  const data = getMemoryDataFromJSON(socket.file);
  
  if (!data['Saved Media']) {
    socket.emit('message', {error: 'Unable to parse the file you provided.<br />Please try uploading the <tt>memories_history.json</tt> file again.'});
    return;
  }
  
  const memories = data['Saved Media'].reverse();
  
  socket.emit('message', {total: memories.length});
  socket.total = memories.length;

  if (isDebugging) console.log(`[${socket.id}] Processing ${memories.length} memories`);
  
  await downloadPhotos(memories, socket);
  await downloadVideos(memories, socket);
  await zipFiles(socket);
};
