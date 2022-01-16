import fs from 'fs';
import admZip from 'adm-zip';
import path from 'path';

const constants = JSON.parse(fs.readFileSync('./src/constants.json'));
const isDebugging = process.env.DEBUG_MODE;
const distributionDirectory = './src/public/archive';

const getMemoryDataFromJSON = (inputFile) => JSON.parse(fs.readFileSync(inputFile));

const initializeEnvironment = (socket) => {
  if (!fs.existsSync(socket.file))
    throw new Error(`JSON file "${socket.file}" not found.`);

  if (!fs.existsSync(socket.downloadFolder))
    fs.mkdirSync(socket.downloadFolder);
}

const getFileName = async (memory, socket, isConcatenatedVideo=false) => {
  const isPhoto = memory['Media Type'] === 'Image';
  const extension = isPhoto ? 'jpg' : 'mp4';
  const year = memory['Date'].substring(0, 4);
  const month = constants.months[memory['Date'].substring(5, 7)];
  const day = memory['Date'].substring(8, 10);
  let fileName;

  if (!fs.existsSync(socket.downloadFolder))
    throw new Error(`Output directory "${socket.downloadFolder}" does not exist`);

  if (!fs.existsSync(`./${socket.downloadFolder}/${year}`)) {
    fs.mkdirSync(`./${socket.downloadFolder}/${year}`);
  }

  fileName = `${year}/${month}-${day}${isPhoto || isConcatenatedVideo ? '' : '-short'}`;

  let i = 1;
  let confirmedFileName = fileName;
  while (fs.existsSync(`${socket.downloadFolder}/${confirmedFileName}.${extension}`)) {
    confirmedFileName = `${fileName}-${i++}`;
  }

  return path.resolve(`${socket.downloadFolder}/${confirmedFileName}.${extension}`);
};

const writeFile = async (file, data) => {
  const fileStream = fs.createWriteStream(file);

  await new Promise((resolve, reject) => {
    data.pipe(fileStream);
    data.on("error", reject);
    fileStream.on("finish", resolve);
  });
};

const updateFileMetadata = (file, memory) => {
  const date = new Date(memory.Date);
  fs.utimes(file, date, date, () => {});
};

const zipFiles = async (socket) => {
  socket.emit('message', {message: 'Compressing your memories.'});
  const outputFile = `${distributionDirectory}/${socket.id}/memories.zip`;

  try {
    const zip = new admZip();

    zip.addLocalFolder(socket.downloadFolder);
    zip.writeZip(outputFile);

    if (isDebugging) console.log(`[${socket.id}] Memories successfully compressed at ${outputFile}.`);
  } catch {
    if (isDebugging) console.log(`[${socket.id}] An error occured while compressing memories to ${outputFile}`);
  }
};

export {
  initializeEnvironment,
  getMemoryDataFromJSON,
  getFileName,
  writeFile,
  updateFileMetadata,
  zipFiles
};