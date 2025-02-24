let DEBUG = false;
let SECOND_SCREEN = false;

const DEBUG_LOGGING = true;

const { app, BrowserWindow, ipcMain } = require('electron')

if (require('electron-squirrel-startup')) app.quit();

const { NetworkTables } = require('ntcore-ts-client');
const path = require('node:path')
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

let ntcore;
let listener;
let connecting = true;
let connected = false;
let disconnect;
let l;
let topics = {};
const listenerFunction = (isConnected) => {
  if(DEBUG_LOGGING) console.log("[NT] Connection status changed to: " + isConnected);
  if(!connected && isConnected && connecting) {
    connecting = false;
    connected = true;
    if(DEBUG_LOGGING) console.log("[NT] Connected to robot");
    BrowserWindow.getAllWindows().forEach(win => win.webContents.send("robot-connection-update", true))
  } else if(connected && !isConnected) {
    connected = false;
    if(DEBUG_LOGGING) console.log("[NT] Disconnected from robot");
    BrowserWindow.getAllWindows().forEach(win => win.webContents.send("robot-connection-update", false))
  } else if(connecting && !isConnected) {
    if(DEBUG_LOGGING) console.log("[NT] Failure to connect to robot");
    BrowserWindow.getAllWindows().forEach(win => win.webContents.send("robot-connection-update", false))
  }
  if(!isConnected) {
    if(l) clearTimeout(l);
    if(DEBUG_LOGGING) console.log("[NT] Attempting to reconnect to robot");
    l = setTimeout(() => {
      l = null;
      if(connected) return;
      if(disconnect) disconnect();
      connecting = true;
      connected = false;
      ntcore.changeURI(DEBUG ? "127.0.0.1" : "10.55.28.2");
      ntcore.client.messenger.socket.stopAutoConnect();
    }, 100)
  }
}
const connectNT = () => {
  ntcore = NetworkTables.getInstanceByURI(DEBUG ? "127.0.0.1" : "10.55.28.2");
  ntcore.client.messenger.socket.stopAutoConnect();
  listener = ntcore.addRobotConnectionListener(listenerFunction);
  if(connected) ntcore.client.messenger.socket.close();
  listenerFunction(false);
  disconnect = () => {
    if(connected) ntcore.client.messenger.socket.close();
  }
}

ipcMain.handle("is-robot-connected", () => connected);
ipcMain.handle("debug-mode", (_, value) => {
  if(DEBUG === value) return;
  DEBUG = value;
  if(disconnect) disconnect();
  connecting = true;
  connected = false;
  ntcore.changeURI(DEBUG ? "127.0.0.1" : "10.55.28.2");
  ntcore.client.messenger.socket.stopAutoConnect();
  return true;
});
ipcMain.handle("is-debug-mode", () => DEBUG);
ipcMain.handle("get-topic-value", async (_, topicname) => {
  if(DEBUG_LOGGING) console.log("[NT] get-topic-value "+topicname)
  return await new Promise((resolve, reject) => {
    try {
      if(!topics[topicname]) {
        topics[topicname] = [ntcore.createTopic(topicname), null];
        let hasSentFirstValue = false;
        topics[topicname][0].subscribe((value) => {
          topics[topicname][1] = value;
          if(DEBUG_LOGGING) console.log("[NT] topic-value-update "+topicname+" "+value)
          if(!hasSentFirstValue) { resolve(value); hasSentFirstValue = true; }
        });
      } else {
        resolve(topics[topicname][1]);
      }
    } catch(e) {
      reject(e);
    }
  });
});
ipcMain.handle("subscribe-to-topic", (_, topicname) => {
  if(DEBUG_LOGGING) console.log("[NT] subscribe-to-topic "+topicname)
  if(!topics[topicname]) {
    topics[topicname] = [ntcore.createTopic(topicname), null];
    topics[topicname][0].subscribe((value) => {
      topics[topicname][1] = value;
      if(DEBUG_LOGGING) console.log("[NT] topic-value-update "+topicname+" "+value)
      BrowserWindow.getAllWindows().forEach(win => win.webContents.send("topic-value-update", topicname, value));
    });
  }
});
ipcMain.handle("set-topic-value", () => console.error("Deprecated function called: set-topic-value"));
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
  mainWindow.webContents.openDevTools();

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

  //secondaryWindow.webContents.openDevTools();

  secondaryWindow.on("enter-full-screen", () => secondaryWindow.webContents.send("fullscreen-update", true));
  secondaryWindow.on("leave-full-screen", () => secondaryWindow.webContents.send("fullscreen-update", false));

  secondaryWindow.on("closed", () => {
    if(SECOND_SCREEN && mainWindow)
    createSecondWindow();
  });
}

app.whenReady().then(() => {
  connectNT();
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
  listener();
  disconnect();
  if (process.platform !== 'darwin') app.quit()
})