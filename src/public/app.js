const { ipcRenderer } = require('electron');

const fileUpload = document.getElementById('file-input');
const downloadLocationButton = document.getElementById('choose-download-location-button');
const waitCard = document.getElementById('step-4');
const progress = document.getElementById('percent');
const progressBarNote = document.getElementById('progress-bar-note');
const message = document.getElementById('message');
const errorCard = document.getElementById('error-card');
const errorText = document.getElementById('error-text');
const expiredFileNote = document.getElementById('expired-file-note');
const navButton = document.getElementById('nav-button');
const progressBar = document.getElementById('progress-bar');
const openMemories = document.getElementById('open-memories-button');
const doneMessage = document.getElementById('done-message');
const preview = document.getElementById('preview');
const photoPreview = document.querySelector('#preview img');

const extraOptionsButton = document.getElementById('extra-options-button');
const extraOptions = document.getElementById('extra-options');
const photosOption = document.querySelector('form [name="photos"]');
const videosOption = document.querySelector('form [name="videos"]');
const showPreviewsOption = document.querySelector('form [name="previews"]')
const concurrentOption = document.querySelector('form [name="concurrent"]');
const progressUpdatesOption = document.querySelector('form [name="progress-updates"]');

const feedbackLink = document.getElementById('feedback-link');
const startOverLink = document.getElementById('start-over');

const feedbackUrl = 'http://www.christianlisle.io/contact?memoryDownload=true';

let step = photos = videos = total = downloadLocation = prevConcurrentSetting = prevShowProgressUpdatesSetting = prevShowPreviewsSetting = isReAttemptingFailedMemories = 0;
const count = {
  allTime: {
    photos: 0,
    videos: 0
  }
};
let failedMemories = [];
let appVersion = undefined;

ipcRenderer.on('message', (event, data) => {
  if (data.version) {
    appVersion = data.version;
    document.getElementById('version').innerHTML = data.version;
  }

  if (data.downloadLocation) {
    downloadLocation = data.downloadLocation;
    reEnableNavButton();
  }

  if (data.totalMemories) {
    progress.classList.remove('d-none');
  
      if (data.photos || data.videos) {
        feedbackLink.setAttribute('href', `${feedbackUrl}&memoryTotal=${data.totalMemories}&photos=${data.photos}&videos=${data.videos}&version=${appVersion}`);
      }
      
      total = data.totalMemories;
      document.getElementById('total-memories').innerHTML = total;
  }

  if (data.total && !isReAttemptingFailedMemories) {
    if (data.date?.year) {
      if (!count[data.date.year]) {
        count[data.date.year] = {
          photos: 0,
          videos: 0,
          photoTotal: 0,
          videoTotal: 0,
        };
      }
      if (data.date?.year && data.type) {
        count[data.date.year][`${data.type}Total`] = data.total;
        total += data.total;
      }
    }
  }

  if (data.count && !isReAttemptingFailedMemories) {
    let currentCount = 0;

    if (concurrentOption.checked) {
      if (progressUpdatesOption.checked) {
        document.getElementById('advanced-progress-updates').classList.remove('d-none');

        if (!document.getElementById(`year-${data.date.year}`)) {
          const row = document.createElement('tr');
          row.setAttribute('id', `year-${data.date.year}`);
  
          const year = document.createElement('td');
          year.innerHTML = data.date.year;
  
          const emptyPhoto = document.createElement('td');
          const emptyVideo = document.createElement('td');
          emptyPhoto.classList.add('photo');
          emptyVideo.classList.add('video');
          emptyPhoto.innerHTML = emptyVideo.innerHTML = '0 / 0';
  
          row.append(year, emptyPhoto, emptyVideo);

          const table = document.querySelector('#advanced-progress-updates tbody');
          const rows = table.children;

          if (rows.length) {
            for (let i = 0; i < rows.length; i++) {
              if (rows[i].id > `year-${data.date.year}`) {
                table.insertBefore(row, rows[i]);
                break;
              }
              if (i === rows.length - 1) {
                table.appendChild(row);
              }
            }
          }
          else table.appendChild(row);
        }
  
        document.querySelector(`#year-${data.date.year} .${data.type}`).innerHTML = `${data.count} / ${count[data.date.year][`${data.type}Total`]}`;
      }

      if (data.type === 'photo') {
        count[data.date.year].photos = data.count;
      }
      else if (data.type === 'video') {
        count[data.date.year].videos = data.count;
      }
  
      for (year in count) {
        currentCount += (count[year].photos + count[year].videos);
      }
    }
    else {
      if (data.type === 'photo') {
        count.allTime.photos = data.count;
      }
      else if (data.type === 'video') {
        count.allTime.videos = data.count;
      }

      currentCount = count.allTime.photos + count.allTime.videos;
    }

    percent = `${parseInt((currentCount / total) * 100)}%`;
    progressBar.style.width = percent;
    progress.innerHTML = percent;
  }

  if (data.error) {
    showErrorMessage(data);
    return;
  }

  if (data.isReAttemptingFailedMemories) {
    isReAttemptingFailedMemories = true;
    progressBarNote.innerHTML = '<em>The progress bar does not update for re-attempted downloads</em><br />';
    progressBarNote.classList.remove('d-none');
  }

  if (data.failedMemories) {
    failedMemories = data.failedMemories;
  }

  if (data.message) {
    message.innerHTML = data.message;
  }

  if (data.file) {
    handlePreviewFile(data)
  }

  if (data.smallError) {
    document.querySelector('#small-error-feedback pre').innerHTML = data.smallError.message;
    document.getElementById('small-error-feedback').classList.remove('d-none');
  }

  if (data.isComplete) {
    if (total === failedMemories.length) {
      showErrorMessage({
        message: 'Either there is no internet connection or the input file provided is expired<br />Be sure to use data from your Snapchat account that was downloaded within the last 7 days',
      });
      expiredFileNote.classList.remove('d-none');
    }
    else handleDownloadComplete(data);
  }
});

const handleStepChange = (i) => {
  if (i == 0 || step == 5) ipcRenderer.send('reload');

  else if (i !== 4) {
    startOverLink.classList.remove('d-none');
    document.getElementById(`step-${step}`).classList.add('d-none');

    if (step !== 0) document.getElementById(`${step}`).classList.toggle('bg-light');
    if (step !== 0) document.getElementById(`${step}`).classList.toggle('text-dark');

    document.getElementById(`step-${i}`).classList.remove('d-none');
    document.getElementById(`${i}`).classList.toggle('bg-light');
    document.getElementById(`${i}`).classList.toggle('text-dark');
    if (i === 1 || i == 2) {
      navButton.innerHTML = 'Continue';
      navButton.classList.remove('disabled');
    }

    if (i === 3) {
      navButton.innerHTML = 'Begin download';
      navButton.classList.add('disabled');
    }
    if (i === 5) {
      navButton.innerHTML = 'Download more memories';
      navButton.classList.remove('d-none');
    }
    step = i;
  }
  else if (fileUpload.value && downloadLocation) {
    if (step !== 0) document.getElementById(`${step}`).classList.toggle('bg-light');
    if (step !== 0) document.getElementById(`${step}`).classList.toggle('text-dark');

    document.getElementById(`step-${i}`).classList.remove('d-none');
    document.getElementById(`${i}`).classList.toggle('bg-light');
    document.getElementById(`${i}`).classList.toggle('text-dark');

    navButton.classList.add('d-none');
    document.getElementById(`step-3`).classList.toggle('d-none');

    ipcRenderer.send('beginDownload', {
      input: fileUpload.files[0].path,
      output: downloadLocation,
      options: {
        photos: photosOption.checked,
        videos: videosOption.checked,
        concurrent: concurrentOption.checked,
      }
    });
    document.getElementById('donation-link').classList.remove('d-none');
    startOverLink.classList.add('d-none');
    step = i;
  }
};

const manualStepChange = (i) => {
  if (!(step == 4 || i >= 4 || i == step)) {
    handleStepChange(i);
  }
};

const reEnableNavButton = () => {
  if (fileUpload.value && downloadLocation) {
    navButton.classList.remove('disabled');
  }
  else if (!navButton.classList.contains('disabled')) {
    navButton.classList.add('disabled');
    
  }
};

const updateOptions = (option) => {
  let isEnablingAdvancedOptions = false;
  let isDisablingAdvancedOptions = false;

  if (option === 'photos') {
    if (photosOption.checked) {
      videosOption.removeAttribute('disabled');
      isEnablingAdvancedOptions = true;
    }
    else {
      videosOption.setAttribute('disabled', null);
      isDisablingAdvancedOptions = true;
    }
  }
  else if (option === 'videos') {
    if (videosOption.checked) {
      photosOption.removeAttribute('disabled');
      isEnablingAdvancedOptions = photosOption.checked;
    }
    else {
      photosOption.setAttribute('disabled', null);
      isDisablingAdvancedOptions = true;
    }
  }
  else if (option === 'concurrent') {
    if (concurrentOption.checked) {
      progressUpdatesOption.removeAttribute('disabled');
      progressUpdatesOption.checked = prevShowProgressUpdatesSetting;
    }
    else {
      prevShowProgressUpdatesSetting = progressUpdatesOption.checked;
      progressUpdatesOption.checked = false;
      progressUpdatesOption.setAttribute('disabled', null);
    }
  }

  if (isEnablingAdvancedOptions) {
    showPreviewsOption.removeAttribute('disabled');

    if (videosOption.checked) {
      concurrentOption.removeAttribute('disabled');
      progressUpdatesOption.removeAttribute('disabled');
  
      showPreviewsOption.checked = prevShowPreviewsSetting;
      concurrentOption.checked = prevConcurrentSetting;
      progressUpdatesOption.checked = prevShowProgressUpdatesSetting;
    }
  }
  else if (isDisablingAdvancedOptions) {
    prevShowPreviewsSetting = showPreviewsOption.checked;
    prevConcurrentSetting = concurrentOption.checked;
    prevShowProgressUpdatesSetting = progressUpdatesOption.checked;

    if (!photosOption.checked) {
      showPreviewsOption.checked = false;
      showPreviewsOption.setAttribute('disabled', null);
    }

    concurrentOption.checked = false;
    concurrentOption.setAttribute('disabled', null);
    
    progressUpdatesOption.checked = false;
    progressUpdatesOption.setAttribute('disabled', null);
  }
};

const handlePreviewFile = (data) => {
  if (data.type === 'photo' && showPreviewsOption.checked) {
    preview.classList.remove('d-none');
    photoPreview.setAttribute('src', data.file);
  }
  else {
    preview.classList.add('d-none');
  }
};

const handleDownloadComplete = (data) => {
  waitCard.classList.add('d-none');

  handleStepChange(5);

  if (data.message) doneMessage.innerHTML = data.message;

  openMemories.addEventListener('click', () => {
    window.open(`file://${data.outputDirectory}`);
  });

  if (failedMemories.length) {
    const failedMemoriesContent = document.getElementById('failed-memories');
    const failedMemoriesList = document.createElement('ul');
    failedMemoriesList.classList.add('list-unstyled')

    const failedMemoriesDescription = document.createElement('p');
    failedMemoriesDescription.innerHTML = `${failedMemories.length} memories failed to download.<br />Metadata of the failed memories are shown below.<br /><br /><small>Why is this happening?<br />This is likely an error that occurred when something went wrong gathering a memory from Snapchat.</small>`;

    failedMemories.forEach((memory) => {
      const memoryInfo = document.createElement('li');
      memoryInfo.innerHTML = `${memory['Media Type']} - ${memory['Date']}`;
      
      failedMemoriesContent.append(memoryInfo);
      failedMemoriesList.append(memoryInfo);
    });

    failedMemoriesContent.append(failedMemoriesDescription);
    failedMemoriesContent.append(failedMemoriesList);
  }
};

const showErrorMessage = ({ message, error }) => {
  waitCard.classList.add('d-none');

  errorText.innerHTML = message;

  if (error) {
    document.querySelector('#extra-error-information pre').innerHTML = error.message;
  }

  errorCard.classList.remove('d-none');
};

navButton.addEventListener('click', () => {
  handleStepChange(step + 1);
});

fileUpload.addEventListener('change', reEnableNavButton);

downloadLocationButton.addEventListener('click', (event) => {
  event.preventDefault();
  ipcRenderer.send('chooseDownloadPath');
});

extraOptionsButton.addEventListener('click', (event) => {
  event.preventDefault();
  extraOptions.classList.remove('d-none');
  extraOptionsButton.classList.add('d-none');
});

const togglePreviewZoom = () => {
  const isPreviewAlreadyLarge = preview.style.height === '75vh';
  const height = isPreviewAlreadyLarge ? '30vh' : '75vh';
  const cursor =  isPreviewAlreadyLarge ? 'zoom-in' : 'zoom-out';

  preview.style.height = height;
  photoPreview.style.cursor = cursor;
};
