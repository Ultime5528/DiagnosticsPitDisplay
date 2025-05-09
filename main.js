const { app, BrowserWindow, ipcMain, Menu } = require('electron')
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

let oldConsoleLog = console.log;
let logs = [];
console.log = (...args) => {
  if(mainWindow) mainWindow.webContents.send("log", ...args);
  logs.push("[LOG - "+(new Date().toLocaleString())+"] "+args.join(" "));
  oldConsoleLog(...args);
}

let DEBUG = false;
let SECOND_SCREEN = store.get("secondScreen");

ipcMain.handle("get-version", () => require('./package.json').version);
ipcMain.handle("is-debug-mode", () => DEBUG);
ipcMain.handle("debug-mode", (_, value) => {
  if(DEBUG === value) return;
  DEBUG = value;
  BrowserWindow.getAllWindows().forEach(win => win.webContents.send("robot-connection-update", false));
  listenerFunction(getNTCore().client.messenger.socket.isConnected());
  return true;
});
ipcMain.handle("get-secondary-screen", () => SECOND_SCREEN);
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


let topics = {};

const listenerFunction = (isConnected) => {
  console.log("[NT] Connection status changed to: " + isConnected);

  let status = {
    isConnected: getNTCore().client.messenger.socket.isConnected(),
    isConnecting: getNTCore().client.messenger.socket.isConnecting(),
    isClosed: getNTCore().client.messenger.socket.isClosed(),
    isClosing: getNTCore().client.messenger.socket.isClosing()
  }

  if(status.isConnecting) {
    console.log("[NT] Connection status is connecting");
    connected = false;
    BrowserWindow.getAllWindows().forEach(win => win.webContents.send("robot-connection-update", "connecting"))
  }
  if(status.isConnected) {
    console.log("[NT] Connection status is connected");
    connected = true;
    BrowserWindow.getAllWindows().forEach(win => win.webContents.send("robot-connection-update", true))
  }
  if(status.isClosed || status.isClosing) {
    console.log("[NT] Connection status is closed");
    connected = false;
    BrowserWindow.getAllWindows().forEach(win => win.webContents.send("robot-connection-update", false))
  }
}
const getNTCore = () => DEBUG ? ntcoresim : ntcore;
let ntcore = NetworkTables.getInstanceByURI("10.55.28.2");
let ntcoresim = NetworkTables.getInstanceByURI("127.0.0.1");
let listenerrobot = ntcore.addRobotConnectionListener(listenerFunction);
let listenersim = ntcoresim.addRobotConnectionListener(listenerFunction);
let listener = () => {
  listenerrobot();
  listenersim();
}
let disconnect = () => {
  ntcore.client.messenger.socket.close();
  ntcoresim.client.messenger.socket.close();
}

ipcMain.handle("is-robot-connected", () => getNTCore().client.messenger.socket.isConnected());
ipcMain.handle("get-topic-value", (_, topicname) => {
  console.log("[NT] get-topic-value "+topicname)
  return new Promise((resolve, reject) => {
    try {
      if(!topics[topicname]) {
        topics[topicname] = [getNTCore().createTopic(topicname), null];
        let hasSentFirstValue = false;
        topics[topicname][0].subscribe((value) => {
          topics[topicname][1] = value;
          console.log("[NT] topic-value-update "+topicname+" "+value)
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
  console.log("[NT] subscribe-to-topic "+topicname)
  if(!topics[topicname]) {
    topics[topicname] = [getNTCore().createTopic(topicname), null];
    topics[topicname][0].subscribe((value) => {
      topics[topicname][1] = value;
      console.log("[NT] topic-value-update "+topicname+" "+value)
      BrowserWindow.getAllWindows().forEach(win => win.webContents.send("topic-value-update", topicname, value));
    });
  }
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

  let menu = [
    {
      label: "File",
      submenu: [
        {
          label: "About",
          click: () => mainWindow.webContents.send("show-about")
        },
        {
          label: "Settings",
          click: () => mainWindow.webContents.send("show-about")
        },
        {
          label: "Exit",
          click: () => app.quit()
        }
      ]
    },
    
    {
      label: "Developper",
      submenu: [
        {
          label: "Toggle devtools",
          click: () => {
            mainWindow.webContents.toggleDevTools();
            if(secondaryWindow) secondaryWindow.webContents.toggleDevTools();
          }
        },
        {
          label: "Export",
          submenu: [
            {
              label: "Export dump",
              click: () => mainWindow.webContents.send("export-all")
            },
            {
              label: "Export logs",
              click: () => mainWindow.webContents.send("export-logs", logs)
            },
          ]
        },
      ]
    }
  ]
  mainWindow.setMenu(Menu.buildFromTemplate(menu))
  mainWindow.loadFile('main/index.html');

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (process.platform !== 'darwin') app.quit()
  });
}
let secondaryWindow;
ipcMain.on("exit-fullscreen", () => {if(secondaryWindow) secondaryWindow.setFullScreen(false)});
ipcMain.on("enter-fullscreen", () => {if(secondaryWindow) secondaryWindow.setFullScreen(true)});
function createSecondWindow() {
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
  listener();
  disconnect();
  if (process.platform !== 'darwin') app.quit()
})

console.log("Launching DiagnosticsPitDisplay v"+require('./package.json').version);
