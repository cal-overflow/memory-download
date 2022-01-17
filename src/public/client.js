const snapLogo = document.getElementById('snap-logo-container');
const fileUpload = document.getElementById('siofu-input');
const failMessage = document.getElementById('upload-fail-message');
const waitCard = document.getElementById('step-4');
const progress = document.getElementById('percent');
const message = document.getElementById('message');
const errorCard = document.getElementById('error-card');
const errorText = document.getElementById('error-text');
const doneCard = document.getElementById('step-5');
const downloadLink = document.getElementById('download-link');
const navButton = document.getElementById('nav-button');
const tutorialCard = document.getElementById('tutorial');
const progressBar = document.getElementById('progress-bar');
const reconnectingCard = document.getElementById('reconnecting');

var socket = io();
var uploader = new SocketIOFileUpload(socket);

let step = total = originalSocketId = 0;
let processingMemories = attemptingReconnect = false;
const failedMemories = [];

navButton.addEventListener('click', () => {
  if (step < 3) {
    document.getElementById(`step-${step}`).classList.toggle('d-none');
    step++;
    document.getElementById(`step-${step}`).classList.toggle('d-none');

    if (step === 1) navButton.innerHTML = 'Continue';
    
    if (step === 3) navButton.innerHTML = 'Upload';
  }
  
  if (step >= 3 && fileUpload.value) {
    navButton.classList.toggle('d-none');
    document.getElementById(`step-3`).classList.toggle('d-none');
    tutorialCard.classList.add('d-none');
    snapLogo.classList.add('disabled');

    uploader.submitFiles(fileUpload.files);
  }
});

fileUpload.addEventListener('click', () => {
  failMessage.classList.add('invisible');
});

socket.on('uploadFail', () => {
  failMessage.classList.remove('invisible');
});

socket.on('uploadSuccess', () => {
  processingMemories = true;
  waitCard.classList.remove('d-none')
});

socket.on('message', (data) => {
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

  if (data.isComplete) {
    handleDownloadReady(data);
  }
});

socket.on('connect', () => {
  if (!originalSocketId) {
    originalSocketId = socket.id;
  }

  if (attemptingReconnect) {
    const downloadRoute = `/archive/${originalSocketId}/memories.zip`;
    fetch(downloadRoute)
    .then((res) => {
      if (res.ok) {
        reconnectingCard.classList.add('d-none');
        handleDownloadReady({downloadRoute})
      }
      else {
        showErrorMessage('Unable to re-establish connection to server.<br />Please try again');
      }
    })
    .catch((err) => {
      showErrorMessage('Unable to re-establish connection to server.<br />Please try again');
    })
    .finally(() => {
      attemptingReconnect = false;
    });
  }
});

socket.on('disconnect', () => {
  attemptingReconnect = processingMemories;

  if (!processingMemories) {
    showErrorMessage('Lost connection to the server. Please refresh the page');
  }

  navButton.classList.add('d-none');
  for (let i = 0; i <= 5; i++) {
    document.getElementById(`step-${i}`).classList.add('d-none');
  }

  if (attemptingReconnect) reconnectingCard.classList.remove('d-none');
});

const handleDownloadReady = (data) => {
  waitCard.classList.add('d-none');
  doneCard.classList.remove('d-none');

  downloadLink.setAttribute('href', data.downloadRoute);
  downloadLink.addEventListener('click', () => socket.emit('download'));

  if (failedMemories.length) {
    const failedMemoriesContent = document.getElementById('failed-memories');
    const failedMemoriesList = document.createElement('ul');

    const failedMemoriesDescription = document.createElement('p');
    failedMemoriesDescription.innerHTML = `${failedMemories.length} memories failed to download<br />Metadata of the failed memories are shown below.<br /><br /><small>Why is this happening?<br />This is likely an error that occurred when something went wrong gathering a memory from Snapchat.</small>`;

    failedMemories.forEach((memory) => {
      const memoryInfo = document.createElement('li');
      memoryInfo.innerHTML = `${memory['Media Type']} - ${memory['Date']}`;
      
      failedMemoriesContent.append(memoryInfo);
      failedMemoriesList.append(memoryInfo);
    });

    failedMemoriesContent.append(failedMemoriesDescription);
    failedMemoriesContent.append(failedMemoriesList);
  }
}

const showErrorMessage = (errorMessage) => {
  reconnectingCard.classList.add('d-none');
  waitCard.classList.add('d-none');

  errorText.innerHTML = errorMessage;
  errorCard.classList.remove('d-none');
  tutorialCard.classList.remove('d-none');
}