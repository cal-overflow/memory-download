const fs = require('fs');
const path = require('path');
const constants = require('./constants.js');

const isDebugging = process.env.DEBUG_MODE;
let outputDirectory;

const getMemoryDataFromJSON = (inputFile) => JSON.parse(fs.readFileSync(inputFile));

const initializeEnvironment = (file, output) => {
  if (!fs.existsSync(file))
    throw new Error(`JSON file "${file}" not found.`);

  outputDirectory = output;
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

  if (!fs.existsSync(outputDirectory))
    throw new Error(`Output directory "${outputDirectory}" does not exist`);

  if (!fs.existsSync(`${outputDirectory}/${year}`)) {
    fs.mkdirSync(`${outputDirectory}/${year}`);
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
  })
  .catch((err) => {
    if (isDebugging) console.log(`An error occurred with the file system. Error: ${err.message}`);
  });
};

const updateFileMetadata = (file, memory) => {
  const date = new Date(memory.Date);
  fs.utimes(file, date, date, () => {});
};

const getOutputInfo = () => {
  if (isDebugging) console.log('Getting output info');

  return {
    outputDirectory,
    message: `Your memories have been downloaded at:<br /><tt>${outputDirectory}</tt>`,
  };
};

module.exports = {
  initializeEnvironment,
  getMemoryDataFromJSON,
  getFileName,
  writeFile,
  updateFileMetadata,
  getOutputInfo,
};