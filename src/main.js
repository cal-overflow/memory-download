const path = require('path');
const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const { downloadMemories } = require('./memoryDownloader');

const isDebugging = process.env.DEBUG_MODE;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  win.loadFile('src/public/index.html');

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (process.platform === 'darwin' && 'file://' === url.substring(0, 7)) {
      shell.showItemInFolder(url.substring(7, url.length));
    }
    else shell.openExternal(url);

    return { action: 'deny' };
  });

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('message', {version: app.getVersion()});
  });

  return win;
};

app.whenReady().then(() => {
  const window = createWindow();

  app.on('window-all-closed', () => {
    // Close the application entirely given all windows closed (with the exception of macOS-darwin)
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  ipcMain.on('beginDownload', (event, {input, output, options}) => {
    if (isDebugging) console.log(`${input} selected as input\n${output} selected as download location`);

    window.webContents.send('message', {message: 'Beginning download'});

    downloadMemories(input, output, options, sendMessage)
    .then(() => {
      if (isDebugging) console.log('Download complete');
    })
    .catch((err) => {
      if (isDebugging) console.log(`An error occurred while downloading memories. Error: ${err.message}`);

      window.webContents.send('message', {error: 'An unknown error occurred while processing your memories.<br />Please try again'});
    });
  });

  ipcMain.on('chooseDownloadPath', () => {
    dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Select'
    })
    .then((res) => {
      window.webContents.send('message', {
        downloadLocation: res.filePaths[0]
      });

    });
  });

  ipcMain.on('reload', () => {
    if (isDebugging) console.log('Reloading the window');

    window.reload();
  });

  const sendMessage = (data) => window.webContents.send('message', data);
});

