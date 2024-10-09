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


let topicValueUpdateListeners = {};
// Expose some APIs to be used in the renderer process
contextBridge.exposeInMainWorld("robot", {
    onConnect: connectEvent,
    onDisconnect: disconnectEvent,
    getTopicUpdateEvent: (topic, type) => {
        if(!topicValueUpdateListeners[topic]) {
            topicValueUpdateListeners[topic] = EventMock();
            ipcRenderer.invoke("receive-topic-value-updates", topic, type)
            return topicValueUpdateListeners[topic][0];
        }

        return topicValueUpdateListeners[topic][0];
    },
    getNetworkTablesValue: async (key, type) => {
        return await ipcRenderer.invoke("get-topic-value", key, type);
    },
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

// Receive topic value updates
ipcRenderer.on("topic-value-update", (_, topic, value) => {
    if(topicValueUpdateListeners[topic]) {
        topicValueUpdateListeners[topic][1](value);
    }
})