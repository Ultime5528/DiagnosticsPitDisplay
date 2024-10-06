const { ipcRenderer, contextBridge } = require('electron')

// Event Class that does exactly what we need.
const EventMock = () => {
    let listeners = [];

    return [{
        addEventListener: (listener) => listeners.push(listener),
        removeEventListener: (listener) => listeners = listeners.filter(l => l !== listener),
        
    }, (...args) => listeners.forEach(l => l(...args))]
}

// Create some events
let [connectEvent, dispatchConnectEvent] = EventMock();
let [disconnectEvent, dispatchDisconnectEvent] = EventMock();
let [testsUpdateEvent, dispatchTestsUpdateEvent] = EventMock();
let [receiveTestListEvent, dispatchReceiveTestListEvent] = EventMock();
let [testUpdateEvent, dispatchTestUpdateEvent] = EventMock();
let [testFaultsUpdateEvent, dispatchTestFaultsUpdateEvent] = EventMock();

let testUpdateHandlers = {}

// Expose some APIs to be used in the renderer process
contextBridge.exposeInMainWorld("robot", {
    onConnect: connectEvent,
    onDisconnect: disconnectEvent,
    onTestsUpdate: testsUpdateEvent,
    onReceiveTestList: receiveTestListEvent,
    onTestUpdate: testUpdateEvent,
    onTestFaultsUpdate: testFaultsUpdateEvent,
    isConnected: () => lastConnected,
    getCurrentTestState: () => testsStatus,
    getTestList: async () => await ipcRenderer.invoke("get-test-list"),
    subscribeTestUpdate: async (test, callback) => {
        if(testUpdateHandlers[test]) return;
        testUpdateHandlers[test] = callback;
        ipcRenderer.invoke("notify-test-update", test);
    }
})

ipcRenderer.invoke("is-robot-connected").then(connected => {
    lastConnected = connected;
});

// Dispatch robot connection events
let lastConnected = null;
ipcRenderer.on("robot-connection-update", (_, connected) => {
    if(lastConnected === connected) return;

    if(connected) {
        dispatchConnectEvent();
    } else {
        dispatchDisconnectEvent();
    }

    lastConnected = connected;
})

// Dispatch tests update events
let testsStatus = "waiting";
ipcRenderer.on('test-status', (_, status) => {
    dispatchTestsUpdateEvent(testsStatus = status);
});

// Receive test list
ipcRenderer.on('test-list', (_, list) => {
    dispatchReceiveTestListEvent(list);
});

// Receive test status update
ipcRenderer.on("test-status-update", (_, test, status) => {
    dispatchTestUpdateEvent(test, status);
});

// Receive test faults update
ipcRenderer.on("test-faults-update", (_, test, faults) => {
    dispatchTestFaultsUpdateEvent(test, faults);
});

// Fullscreen handling
document.addEventListener('DOMContentLoaded', () => {
    let fullscreen = false;

    ipcRenderer.on("fullscreen-update", (_, state) => {
        fullscreen = state;
        updateFullScreenIcon();
    });

    const updateFullScreenIcon = () => {
        if(fullscreen) {
            document.querySelector("#fullscreen > span").innerText = "fullscreen_exit";
        } else {
            document.querySelector("#fullscreen > span").innerText = "fullscreen";
        }
    }

    document.getElementById('fullscreen').addEventListener('click', () => {
        if(fullscreen) 
            ipcRenderer.send('exit-fullscreen');
        else
            ipcRenderer.send('enter-fullscreen');
    });

    updateFullScreenIcon();
});

// Handle test update
ipcRenderer.on("test-update", (_, test, status) => {
    if(testUpdateHandlers[test]) testUpdateHandlers[test](status);
});

// Hide cursor when idle on page
let idleTimeout;
document.addEventListener('mousemove', () => {
    document.body.style.cursor = "auto";
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
        document.body.style.cursor = "none";
    }, 1500);
});