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
const videoPreview1 = document.querySelector('#preview #video1');
const videoPreview2 = document.querySelector('#preview #video2');

let step = total = downloadLocation = 0;
const failedMemories = [];

ipcRenderer.on('message', (event, data) => {

  if (data.downloadLocation) {
    downloadLocation = data.downloadLocation;
    reEnableNavButton();
  }

  if (data.total) {
    progress.classList.remove('d-none');

    total = data.total;
  }

  if (data.count) {
    const percent = `${parseInt((data.count / total) * 100)}%`;
    progressBar.style.width = percent;
    progress.innerHTML = percent; 
  }

  if (data.error) {
    showErrorMessage(data.error);
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

  if (data.failedCombiningVideos) {
    document.getElementById('failed-video-combination-message').classList.remove('d-none');
  }

  if (data.isComplete) {
    handleDownloadComplete(data);
  }
});

const handleStepChange = (i) => {
  if (step == 5) ipcRenderer.send('reload');

  else if (i !== 4) {
    document.getElementById(`step-${step}`).classList.add('d-none');

    if (step !== 0) document.getElementById(`${step}`).classList.toggle('bg-light');
    if (step !== 0) document.getElementById(`${step}`).classList.toggle('text-dark');

    document.getElementById(`step-${i}`).classList.remove('d-none');
    document.getElementById(`${i}`).classList.toggle('bg-light');
    document.getElementById(`${i}`).classList.toggle('text-dark');
    if (i === 1) navButton.innerHTML = 'Continue';
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

    ipcRenderer.send('fileSelection', {
      input: fileUpload.files[0].path,
      output: downloadLocation,
    });
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
};

const handlePreviewFile = (data) => {
  if (data.type === 'photo') {
    photoPreview.setAttribute('src', data.file);
  }
  else {
    if (!photoPreview.classList.contains('d-none')) {
      videoPreview1.setAttribute('src', data.file);

      photoPreview.classList.add('d-none');
      videoPreview1.classList.remove('d-none');
    }
    else if (videoPreview1.classList.contains('d-none')) {
      videoPreview1.setAttribute('src', data.file);

      // Delay to ensure new video has loaded (more seamless transition)
      setTimeout(() => {
        videoPreview2.classList.add('d-none');
        videoPreview1.classList.remove('d-none');
      }, 100);
    }
    else {
      videoPreview2.setAttribute('src', data.file);

      setTimeout(() => {
        videoPreview1.classList.add('d-none');
        videoPreview2.classList.remove('d-none');
      }, 100);
    }
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

const showErrorMessage = (errorMessage) => {
  waitCard.classList.add('d-none');

  errorText.innerHTML = errorMessage;
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

const togglePreviewZoom = () => {
  const isPreviewAlreadyLarge = preview.style.height === '75vh';
  const height = isPreviewAlreadyLarge ? '30vh' : '75vh';
  const cursor =  isPreviewAlreadyLarge ? 'zoom-in' : 'zoom-out';

  preview.style.height = height;
  photoPreview.style.cursor = cursor;
  videoPreview1.style.cursor = cursor;
  videoPreview2.style.cursor = cursor;
};