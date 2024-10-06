const { ipcRenderer, contextBridge } = require('electron')

contextBridge.exposeInMainWorld("robot", {
    getIsConnected: async () => await ipcRenderer.invoke('robot-get-status'),
    getCurrentTestState: () => testsStatus
})
let testsStatus = "waiting";
ipcRenderer.on('test-status-update', (event, tests) => {
    testsStatus = tests;
});
