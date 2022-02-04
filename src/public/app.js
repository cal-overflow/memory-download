const { ipcRenderer } = require('electron');

const fileUpload = document.getElementById('file-input');
const downloadLocationButton = document.getElementById('choose-download-location-button');
const waitCard = document.getElementById('step-4');
const progress = document.getElementById('percent');
const message = document.getElementById('message');
const errorCard = document.getElementById('error-card');
const errorText = document.getElementById('error-text');``
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
const concurrentOption = document.querySelector('form [name="concurrent"]');

const feedbackLink = document.getElementById('feedback-link');
const startOverLink = document.getElementById('start-over');

const feedbackUrl = 'http://www.christianlisle.com/contact?memoryDownload=true';

let step = photos = videos = total = downloadLocation = prevConcurrentSetting = 0;
const count = {
  allTime: {
    photos: 0,
    videos: 0
  }
};
const failedMemories = [];

ipcRenderer.on('message', (event, data) => {
  if (data.version) {
    document.getElementById('version').innerHTML = data.version;
  }

  if (data.downloadLocation) {
    downloadLocation = data.downloadLocation;
    reEnableNavButton();
  }

  if (data.total) {
    progress.classList.remove('d-none');

    if (data.photos || data.videos) {
      feedbackLink.setAttribute('href', `${feedbackUrl}&memoryTotal=${data.total}&photos=${data.photos}&videos=${data.videos}`);
    }
    
    total = data.total;
    document.getElementById('total-memories').innerHTML = total;
  }

  if (data.count) {
    let currentCount = 0;

    if (concurrentOption.checked) {
      if (!count[data.date.year]) {
        count[data.date.year] = { photos: 0, videos: 0 };
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

  if (data.failedMemory) {
    failedMemories.push(data.failedMemory);
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
        message: 'The input file provided is expired<br />Be sure to use data from your Snapchat account that was downloaded within the last 7 days',
      });
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
  if (option === 'concurrent' && photosOption.checked && videosOption.checked) {
    const prev = concurrentOption.checked;
    concurrentOption.checked = prevConcurrentSetting;
    prevConcurrentSetting = prev;
  }
  if (photosOption.checked && videosOption.checked) {
    photosOption.removeAttribute('disabled');
    videosOption.removeAttribute('disabled');
    concurrentOption.removeAttribute('disabled');
    concurrentOption.checked = prevConcurrentSetting;
  }

  if (!photosOption.checked) {
    prevConcurrentSetting = concurrentOption.checked;
    concurrentOption.checked = false;

    concurrentOption.setAttribute('disabled', null);
    videosOption.setAttribute('disabled', null);
  }
  
  if (!videosOption.checked) {
    prevConcurrentSetting = concurrentOption.checked;
    concurrentOption.checked = false;

    concurrentOption.setAttribute('disabled', null);
    photosOption.setAttribute('disabled', null);
  }
};

const handlePreviewFile = (data) => {
  if (data.type === 'photo') {
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
