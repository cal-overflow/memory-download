const { exiftool } = require('exiftool-vendored');
const { unlink } = require('fs/promises');
const dayjs = require('dayjs');

const updateExifData = async (fileName, creationDateTimeString) => {
  const exifFormattedDate = dayjs.utc(creationDateTimeString,'YYYY-MM-DD HH:mm:ss Z').format('YYYY:MM:DD HH:mm:ss');
  await exiftool.write(fileName, {
    'DateTimeOriginal': exifFormattedDate
  })
  await unlink(`${fileName}_original`);
};

module.exports = {
  updateExifData,
}