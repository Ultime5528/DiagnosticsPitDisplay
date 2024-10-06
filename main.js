const TEAM_NUMBER = 5528;
const DEBUG = true;

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const { NetworkTables, NetworkTablesTypeInfos } = require('@first-team-339/ntcore-ts-client');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.setIcon(path.join(__dirname, 'www', 'assets', 'img', 'icon.png'))

  mainWindow.setMenu(null)

  mainWindow.loadFile('www/index.html')

  mainWindow.webContents.openDevTools()

  let ntcore = DEBUG ? NetworkTables.getInstanceByURI("127.0.0.1") : NetworkTables.getInstanceByTeam(TEAM_NUMBER)
  
  ipcMain.handle("robot-get-status", async (event) => {
    return !ntcore.isRobotConnecting() && ntcore.isRobotConnected();
  });

  ntcore.createTopic("/Tests/Status", NetworkTablesTypeInfos.kString).subscribe(value => mainWindow.webContents.send("test-status-update", value), true);
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