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

// Expose some APIs to be used in the renderer process
contextBridge.exposeInMainWorld("robot", {
    onConnect: connectEvent,
    onDisconnect: disconnectEvent,
    isConnected: () => lastConnected,
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
ipcRenderer.invoke("receive-topic-value-updates", "/Diagnostics/Drivetrain/Faults", "kStringArray").then(console.log)

ipcRenderer.on("topic-value-update", (_, topic, value) => {
    console.log("Topic value update", topic, value);
})