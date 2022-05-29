const {exiftool} = require('exiftool-vendored');
const dayjs = require('dayjs');

const updateExifData = async (fileName, creationDateTimeString) => {
  const exifFormattedDate = dayjs.utc(creationDateTimeString,'YYYY-MM-DD HH:mm:ss Z').format('YYYY:MM:DD HH:mm:ss');
  return exiftool.write(fileName, {
    'DateTimeOriginal': exifFormattedDate
  })
};

module.exports = {
  updateExifData,
}