import fs from 'fs';
import admZip from 'adm-zip';
import path from 'path';

const constants = JSON.parse(fs.readFileSync('./src/constants.json'));
const inputFile = process.argv[process.argv.findIndex((val) => val === '-input') + 1];
const socketId = process.argv[process.argv.findIndex((val) => val === '-socket') + 1];
const distributionDirectory = './src/website/static/archive';
const outputDirectory = `memories/${socketId}`;

const getMemoryDataFromJSON = () => JSON.parse(fs.readFileSync(inputFile));
const getOutputDirectory = () => `memories/${socketId}`;

const initializeEnvironment = () => {
  if (!fs.existsSync(inputFile))
    throw new Error(`JSON file "${inputFile}" not found.`);

  if (!fs.existsSync(outputDirectory))
    fs.mkdirSync(outputDirectory);
}

const getFileName = async (memory, isConcatenatedVideo=false) => {
  const isPhoto = memory['Media Type'] === 'Image';
  const extension = isPhoto ? 'jpg' : 'mp4';
  const year = memory['Date'].substring(0, 4);
  const month = constants.months[memory['Date'].substring(5, 7)];
  const day = memory['Date'].substring(8, 10);
  let fileName;

  if (!fs.existsSync(`./${outputDirectory}/${year}`)) {
    fs.mkdirSync(`./${outputDirectory}/${year}`);
  }

  fileName = `${year}/${month}-${day}${isPhoto || isConcatenatedVideo ? '' : '-short'}`;

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

const zipFiles = async () => {
  process.send('Compressing your memories.');
  const outputFile = `${distributionDirectory}/${socketId}/memories.zip`;


  try {
    const zip = new admZip();

    zip.addLocalFolder(outputDirectory);
    zip.writeZip(outputFile);

    console.log(`An archived copy of your memories are stored in ${zippedFile}.`); // TODO: delete
  } catch {
    console.error('An error occured while compressing your memories.'); // TODO: delete
  }

  if (fs.existsSync(outputFile)) {
    fs.rmSync(outputDirectory, {recursive: true});
  }
};

export {
  initializeEnvironment,
  getMemoryDataFromJSON,
  getOutputDirectory,
  getFileName,
  writeFile,
  updateFileMetadata,
  zipFiles
};