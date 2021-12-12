import fetch from 'node-fetch';
import fs from 'fs';

const inputFile = './memories_history.json';
const outputDirectory = './memories';

if (!fs.existsSync(inputFile))
  throw new Error(`JSON file "${inputFile}" not found`);

if (!fs.existsSync(outputDirectory))
  fs.mkdirSync(outputDirectory);

const data = JSON.parse(fs.readFileSync(inputFile));
const memories = data["Saved Media"].reverse();

const getFileName = async (memory) => {
  const extension = memory['Media Type'] === 'PHOTO' ? 'jpg' : 'mp4';
  const filename = memory['Date'].substr(0, 10);

  let i = 1;
  let confirmedFilename = filename;
  while (fs.existsSync(`${outputDirectory}/${confirmedFilename}.${extension}`)) {
    confirmedFilename = `${filename}(${i++})`;
  }

  return `${outputDirectory}/${confirmedFilename}.${extension}`;
};

console.log("Downloading your memories. This will probably take a while...");

for (const memory of memories) {
  await fetch((memory['Download Link']), {
    method: 'POST'
  })
  .then(async (res) => {
    const url = await res.text();
  
    // download file from url
    const download = await fetch(url);
    const fileStream = fs.createWriteStream(await getFileName(memory));

    await new Promise((resolve, reject) => {
      download.body.pipe(fileStream);
      download.body.on("error", reject);
      fileStream.on("finish", resolve);
    });
  });
}

console.log(`Memories downloaded successfully!\nYour memories are stored in ${outputDirectory}`);
