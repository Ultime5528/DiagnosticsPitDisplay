const DEBUG = false;
const TEAM_NUMBER = 5528;

const { app, BrowserWindow, ipcMain } = require('electron')

if (require('electron-squirrel-startup')) app.quit();

const path = require('node:path')
const ntClient = require('wpilib-nt-client');

const client = new ntClient.Client();

let topics = {};
let connected = true;
const onConnect = (isConnected, err) => {
  if(err && !isConnected || connected !== isConnected && !isConnected) {
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send("robot-connection-update", false));
    topics = {};
    setTimeout(() => client.start(onConnect, DEBUG ? "localhost" : `10.55.28.2`), 300);
  }
  connected = isConnected;
}

onConnect(false);

let listener = client.addListener((entryKey, entryValue, entryValueType, callbackType, entryID) => {
  if(callbackType === "delete" && topics[entryKey]) delete topics[entryKey];
  if(callbackType === "flagChange" || callbackType === "delete") return;

  if(callbackType === "add") {
    topics[entryKey] = {
      value: entryValue,
      type: entryValueType,
      entryID: entryID
    }
  } else if(callbackType === "update") {
    topics[entryKey].value = entryValue;
  }

  if(entryKey === "/Diagnostics/Ready" && entryValue === true) {
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send("robot-connection-update", true));
  }

  BrowserWindow.getAllWindows().forEach(w => w.webContents.send("topic-value-update", entryKey, entryValue));
})

const isConnected = () => connected;
ipcMain.handle("is-robot-connected", isConnected)

ipcMain.handle("get-topic-value", async (_, topic) => {
  if(!isConnected()) return null;
  if(topics[topic]) return topics[topic].value;
  console.error("(GET) Topic not found: " + topic);
  return null;
});

ipcMain.handle("set-topic-value", async (_, topic, value) => {
  if(!isConnected()) return null;
  if(!topics[topic]) {
    client.Assign(value, topic);
    return;
  };

  client.Update(topics[topic].entryID, value);
});

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    maximize: true,
    title: "Ultime 5528 - System Diagnostics",
    icon: path.join(__dirname, "icons", 'icon.png'),
  })

  mainWindow.setMenu(null)
  mainWindow.loadFile('main/index.html')
  //mainWindow.webContents.openDevTools();

  const secondaryWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preloadsecond.js'),
    },
    fullscreenable: true,
    maximize: true,
    title: "Ultime 5528 - System Diagnostics",
    icon: path.join(__dirname, "icons", 'icon.png')
  });

  secondaryWindow.setMenu(null)
  secondaryWindow.loadFile('second/index.html');

  secondaryWindow.on("enter-full-screen", () => secondaryWindow.webContents.send("fullscreen-update", true));
  secondaryWindow.on("leave-full-screen", () => secondaryWindow.webContents.send("fullscreen-update", false));

  ipcMain.on("exit-fullscreen", () => secondaryWindow.setFullScreen(false));
  ipcMain.on("enter-fullscreen", () => secondaryWindow.setFullScreen(true));
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  client.removeListener(listener);
  client.stop();
  client.destroy();

  if (process.platform !== 'darwin') app.quit()
})