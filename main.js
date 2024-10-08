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
      preload: path.join(__dirname, 'preloaddiagnostics.js')
    },
    maximize: true,
    title: "Ultime 5528 - System Diagnostics",
    icon: path.join(__dirname, 'www', 'assets', 'img', 'icon.png'),
  })

  mainWindow.setMenu(null)
  mainWindow.loadFile('diagnostics/index.html')
  mainWindow.webContents.openDevTools();

  /*const secondaryWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    fullscreenable: true,
    maximize: true,
    title: "Ultime 5528 - System Diagnostics",
    icon: path.join(__dirname, 'www', 'assets', 'img', 'icon.png')
  });

  

  secondaryWindow.setMenu(null)
  secondaryWindow.loadFile('www/index.html')
  secondaryWindow.webContents.openDevTools();

  secondaryWindow.on("enter-full-screen", () => secondaryWindow.webContents.send("fullscreen-update", true));
  secondaryWindow.on("leave-full-screen", () => secondaryWindow.webContents.send("fullscreen-update", false));

  ipcMain.on("exit-fullscreen", () => secondaryWindow.setFullScreen(false));
  ipcMain.on("enter-fullscreen", () => secondaryWindow.setFullScreen(true));*/

  const ntcore = DEBUG ? NetworkTables.getInstanceByURI("127.0.0.1") : NetworkTables.getInstanceByTeam(TEAM_NUMBER)
  ipcMain.handle("is-robot-connected", async () => !ntcore.isRobotConnecting() && ntcore.isRobotConnected())
  
  ntcore.addRobotConnectionListener((connected) => {
    currentlyConnected = connected;
    mainWindow.webContents.send("robot-connection-update", connected);
    //secondaryWindow.webContents.send("robot-connection-update", connected);
  }, true);

  let topics = {}
  const registerTopic = (topic, topicType) => {
    topics[topic] = [ntcore.createTopic(topic, NetworkTablesTypeInfos[topicType]), false];
    topics[topic][0].subscribe((value) => {
      if(topics[topic][1] === true) {
        mainWindow.webContents.send("topic-value-update", topic, value);
        //secondaryWindow.webContents.send("topic-value-update", topic, value);
      }
    }, true);
  };
  ipcMain.handle("get-topic-value", async (_, topic, topicType) => {
    if(topics[topic]) return topics[topic].getValue();
    registerTopic(topic, topicType);
    return topics[topic].getValue();
  });
  ipcMain.handle("receive-topic-value-updates", async (_, topic, topicType) => {
    if(topics[topic]) return topics[topic][1] = true;
    else registerTopic(topic, topicType);

    return topics[topic][1] = true;
  });
  /*ntcore.createTopic("/Tests/Status", NetworkTablesTypeInfos.kString).subscribe(value => secondaryWindow.webContents.send("test-status", value), true);

  let list = ntcore.createTopic("/Tests/List", NetworkTablesTypeInfos.kStringArray);
  let testList = null
  list.subscribe((value) => {
    testList = value;
    if(value) secondaryWindow.webContents.send("test-list", value);
  }, true);
  ipcMain.handle("get-test-list", () => testList);

  ipcMain.handle("notify-test-update", async (_, test) => {
    console.log("Subscribing to test", test);
    ntcore.createTopic(`/Tests/${test}/Status`, NetworkTablesTypeInfos.kString).subscribe(value => {
      console.log("Test update", test, value);
      secondaryWindow.webContents.send("test-status-update", test, value);
    }, true);
  });*/
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