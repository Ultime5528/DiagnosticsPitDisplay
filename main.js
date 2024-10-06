const DEBUG = true;
const TEAM_NUMBER = 5528;

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const { NetworkTables, NetworkTablesTypeInfos } = require('@first-team-339/ntcore-ts-client');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    fullscreenable: true,
  });

  mainWindow.maximize();
  mainWindow.setIcon(path.join(__dirname, 'www', 'assets', 'img', 'icon.png'))
  mainWindow.setMenu(null)
  mainWindow.loadFile('www/index.html')
  mainWindow.webContents.openDevTools();

  mainWindow.on("enter-full-screen", () => mainWindow.webContents.send("fullscreen-update", true));
  mainWindow.on("leave-full-screen", () => mainWindow.webContents.send("fullscreen-update", false));

  ipcMain.on("exit-fullscreen", () => mainWindow.setFullScreen(false));
  ipcMain.on("enter-fullscreen", () => mainWindow.setFullScreen(true));

  const ntcore = DEBUG ? NetworkTables.getInstanceByURI("127.0.0.1") : NetworkTables.getInstanceByTeam(TEAM_NUMBER)
  ipcMain.handle("is-robot-connected", async () => !ntcore.isRobotConnecting() && ntcore.isRobotConnected())
  
  ntcore.addRobotConnectionListener((connected) => mainWindow.webContents.send("robot-connection-update", currentlyConnected = connected), true);
  ntcore.createTopic("/Tests/Status", NetworkTablesTypeInfos.kString).subscribe(value => mainWindow.webContents.send("test-status", value), true);

  let list = ntcore.createTopic("/Tests/List", NetworkTablesTypeInfos.kStringArray);
  let testList = null
  list.subscribe((value) => {
    testList = value;
    if(value) mainWindow.webContents.send("test-list", value);
  }, true);
  ipcMain.handle("get-test-list", () => testList);

  ipcMain.handle("notify-test-update", async (_, test) => {
    console.log("Subscribing to test", test);
    ntcore.createTopic(`/Tests/${test}/Status`, NetworkTablesTypeInfos.kString).subscribe(value => {
      console.log("Test update", test, value);
      mainWindow.webContents.send("test-status-update", test, value);
    }, true);
  });
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})