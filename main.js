let DEBUG = false;
let SECOND_SCREEN = false;

const { app, BrowserWindow, ipcMain } = require('electron')
if (require('electron-squirrel-startup')) app.quit();

const Store = require('./store.js');
const store = new Store({
  // We'll call our data file 'user-preferences'
  configName: 'user-preferences',
  defaults: {
    secondScreen: false
  }
});
SECOND_SCREEN = store.get("secondScreen");

ipcMain.handle("set-secondary-screen", (_, value) => {
  if(SECOND_SCREEN === value) return;
  SECOND_SCREEN = value;
  store.set("secondScreen", value);
  if(SECOND_SCREEN) {
    createSecondWindow();
  } else {
    secondaryWindow.close();
    secondaryWindow = null;
  }
  
  return true;
});

ipcMain.handle("get-secondary-screen", () => SECOND_SCREEN);

const path = require('node:path')
const ntClient = require('wpilib-nt-client');

const client = new ntClient.Client();

let topics = {};
let connected = false;
let listener
let clientListener = (entryKey, entryValue, entryValueType, callbackType, entryID) => {
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
}
const onConnect = (isConnected, err) => {
  if(err && !isConnected || connected !== isConnected && !isConnected || err === "reconnect") {
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send("robot-connection-update", false));
    topics = {};
    client.removeListener(listener);
    listener = client.addListener(clientListener)
    setTimeout(() => client.start(onConnect, DEBUG ? "localhost" : `10.55.28.2`), 300);
  }
  connected = isConnected;
  if(connected) {
    client.getKeys().forEach(key => {
      const entry = client.getEntry(client.getKeyID(key));
      topics[key] = {
        value: entry.val,
        type: entry.typeID,
        entryID: entry.entryID
      }
      if(key === "/Diagnostics/Ready" && entry.val === true) BrowserWindow.getAllWindows().forEach(w => w.webContents.send("robot-connection-update", true));
    });
  }
}

onConnect(false, "reconnect");

const isConnected = () => connected;
ipcMain.handle("is-robot-connected", isConnected)
ipcMain.handle("debug-mode", (_, value) => {
  if(DEBUG === value) return;
  client.removeListener(listener);
  client.stop();
  client.destroy();
  topics = {};
  onConnect(false, "reconnect");
  DEBUG = value
  return true;
});
ipcMain.handle("is-debug-mode", () => DEBUG);
ipcMain.handle("get-topic-value", async (_, topic) => {
  if(!isConnected()) return null;
  if(topics[topic]) return topics[topic].value;
  try {
    const entryID = client.getKeyID(topic);
    const entry = client.getEntry(entryID);
    if(entry) {
      topics[topic] = {
        val: entry.val,
        type: entry.typeID,
        entryID: entryID
      }
      return entry.val;
    }
  } catch(e) {
    console.error(e);
  }
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
let mainWindow;
function createMainWindow() {
  mainWindow = new BrowserWindow({
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
  mainWindow.loadFile('main/index.html');
  //mainWindow.webContents.openDevTools();

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (process.platform !== 'darwin') app.quit()
  });
}
let secondaryWindow;
ipcMain.on("exit-fullscreen", () => {if(secondaryWindow) secondaryWindow.setFullScreen(false)});
ipcMain.on("enter-fullscreen", () => {if(secondaryWindow) secondaryWindow.setFullScreen(true)});
function createSecondWindow () {
  secondaryWindow = new BrowserWindow({
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

  secondaryWindow.on("closed", () => {
    if(SECOND_SCREEN && mainWindow)
    createSecondWindow();
  });
}

app.whenReady().then(() => {
  createMainWindow()
  if(SECOND_SCREEN) createSecondWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      if(SECOND_SCREEN) createSecondWindow();
    }
  })
})

app.on('window-all-closed', function () {
  client.removeListener(listener);
  client.stop();
  client.destroy();

  if (process.platform !== 'darwin') app.quit()
})