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
    setNetworkTablesValue: async (key, type, value) => {
        return await ipcRenderer.invoke("set-topic-value", key, type, value);
    },
    getNetworkTablesValue: async (key, type) => {
        return await ipcRenderer.invoke("get-topic-value", key, type);
    },
    registerTopic: async (key, type) => {
        return await ipcRenderer.invoke("register-topic", key, type);
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
    if(topicValueUpdateListeners[topic]) topicValueUpdateListeners[topic][1](value);
})
