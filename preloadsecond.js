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
    getTopicUpdateEvent: (topic) => {
        if(!topicValueUpdateListeners[topic]) {
            topicValueUpdateListeners[topic] = EventMock();
            return topicValueUpdateListeners[topic][0];
        }

        return topicValueUpdateListeners[topic][0];
    },
    setNetworkTablesValue: async (key, value) => {
        return await ipcRenderer.invoke("set-topic-value", key, value);
    },
    getNetworkTablesValue: async (key, type) => {
        return await ipcRenderer.invoke("get-topic-value", key);
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

// Hide cursor when idle on page
let idleTimeout;
document.addEventListener('mousemove', () => {
    document.body.style.cursor = "auto";
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
        document.body.style.cursor = "none";
    }, 1500);
});