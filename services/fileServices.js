import fs from 'fs';
import path from 'path';

const subdirEnabled = process.argv.includes('-organize-years');
const constants = JSON.parse(fs.readFileSync('./constants.json'));
const inputFile = './memories_history.json';
const outputDirectory = './memories';

const initializeEnvironment = () => {
  if (!fs.existsSync(inputFile))
    throw new Error(`JSON file "${inputFile}" not found.`);

  if (!fs.existsSync(outputDirectory))
    fs.mkdirSync(outputDirectory);
}

const getMemoryDataFromJSON = () =>
  JSON.parse(fs.readFileSync(inputFile));

const getFileName = async (memory, isConcatenatedVideo=false) => {
  const isPhoto = memory['Media Type'] === 'PHOTO';
  const extension = isPhoto ? 'jpg' : 'mp4';
  const year = memory['Date'].substring(0, 4);
  const month = constants.months[memory['Date'].substring(5, 7)];
  const day = memory['Date'].substring(8, 10);
  let fileName;

  if (subdirEnabled) {
    if (!fs.existsSync(`./${outputDirectory}/${year}`)) {
      fs.mkdirSync(`./${outputDirectory}/${year}`);
    }

    fileName = `${year}/${month}-${day}${isPhoto || isConcatenatedVideo ? '' : '-short'}`;
  }
  else {
    fileName = `${year}-${month.substring(0, 3)}-${day}${isPhoto || isConcatenatedVideo ? '' : '-short'}`;
  }

  let i = 1;
  let confirmedFileName = fileName;
  while (fs.existsSync(`${outputDirectory}/${confirmedFileName}.${extension}`)) {
    confirmedFileName = `${fileName}-${i++}`;
  }

  return path.resolve(`${outputDirectory}/${confirmedFileName}.${extension}`);
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

export {
  initializeEnvironment,
  getMemoryDataFromJSON,
  getFileName,
  writeFile,
  updateFileMetadata
};