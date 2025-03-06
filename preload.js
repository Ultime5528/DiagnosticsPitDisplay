const { ipcRenderer, contextBridge } = require('electron');

// Event Class that does exactly what we need.
const EventMock = () => {
    let listeners = [];

    let self = {
        addEventListener: (listener) => listeners.push(listener),
        removeEventListener: (listener) => listeners = listeners.filter(l => l !== listener),
        handleOnce: (listener) => {
            let handler = (...args) => {
                listener(...args);
                self.removeEventListener(handler);
            }

            self.addEventListener(handler)
        }
    }

    return [self, (...args) => listeners.forEach(l => l(...args))]
}

// Create some events
let [connectingEvent, dispatchConnectingEvent] = EventMock();
let [connectEvent, dispatchConnectEvent] = EventMock();
let [disconnectEvent, dispatchDisconnectEvent] = EventMock();

let topicValueUpdateListeners = {};
// Expose some APIs to be used in the renderer process
contextBridge.exposeInMainWorld("robot", {
    onConnecting: connectingEvent,
    onConnect: connectEvent,
    onDisconnect: disconnectEvent,
    getTopicUpdateEvent: (topic) => {
        ipcRenderer.invoke("subscribe-to-topic", topic);
        if(!topicValueUpdateListeners[topic]) {
            topicValueUpdateListeners[topic] = EventMock();
            return topicValueUpdateListeners[topic][0];
        }

        return topicValueUpdateListeners[topic][0];
    },
    setNetworkTablesValue: async (key, value) => {
        return await ipcRenderer.invoke("set-topic-value", key, value);
    },
    getNetworkTablesValue: async (key) => {
        return await ipcRenderer.invoke("get-topic-value", key);
    },
    isConnected: () => lastConnected === true,
    isConnecting: () => lastConnected === "connecting",
    setDebugMode: (value) => ipcRenderer.invoke("debug-mode", value),
    setSecondaryScreen: async (value) => await ipcRenderer.invoke("set-secondary-screen", value),
    isDebugMode: async () => await ipcRenderer.invoke("is-debug-mode"),
    getSecondaryScreen: async () => await ipcRenderer.invoke("get-secondary-screen")
})

ipcRenderer.invoke("is-robot-connected").then(connected => {
    lastConnected = connected;
});

// Dispatch robot connection events
let lastConnected = null;
ipcRenderer.on("robot-connection-update", (_, connected) => {
    if(lastConnected === connected) return;

    if(connected === true) {
        dispatchConnectEvent();
    } else if(connected === false) {
        dispatchDisconnectEvent();
    } else if(connected === "connecting") {
        dispatchConnectingEvent();
    }
    lastConnected = connected;
})

// Receive topic value updates
ipcRenderer.on("topic-value-update", (_, topic, value) => {
    if(topicValueUpdateListeners[topic]) topicValueUpdateListeners[topic][1](value);
})
