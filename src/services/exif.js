const { ExifTool } = require("exiftool-vendored");
const { unlink } = require("fs/promises");
const { extname } = require("path");
const dayjs = require("dayjs");

const exiftool = new ExifTool({});

const updateExifData = async (
  fileName,
  creationDateTimeString,
  geolocationData
) => {
  const extension = extname(fileName);
  if (extension === ".mp4") {
    // mp4 files are not supported by exiftool
    return;
  }
  const exifFormattedDate = dayjs
    .utc(creationDateTimeString, "YYYY-MM-DD HH:mm:ss Z")
    .format("YYYY:MM:DD HH:mm:ss");

  await exiftool.write(fileName, {
    DateTimeOriginal: exifFormattedDate,
    GPSLatitude: geolocationData.latitude,
    GPSLongitude: geolocationData.longitude,
    GPSLatitudeRef: geolocationData.latitude > 0 ? "North" : "South",
    GPSLongitudeRef: geolocationData.longitude > 0 ? "East" : "West",
  });

  await unlink(`${fileName}_original`);
};

module.exports = {
  updateExifData,
};
