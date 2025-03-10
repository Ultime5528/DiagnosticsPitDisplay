const { ipcRenderer, contextBridge } = require('electron');

// BEGIN NT API
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
    if(lastConnected === connected || (lastConnected === "connecting" && connected === false)) return;

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
// END NT API

let fullscreen_obj = document.createElement("button");
fullscreen_obj.id = "fullscreen";
let icon = document.createElement("span");
icon.className = "material-symbols-outlined";
fullscreen_obj.appendChild(icon);
let style = document.createElement("style");
style.innerHTML = `#fullscreen {
    position: fixed;
    z-index: 100;
    bottom: 20px;
    right: 20px;
    background-color: rgba(0,0,0,0);
    color: rgba(120,120,120,1);
    font-size: 2em;
    border: 0;
    cursor: pointer;
    opacity: 0;
    transition: 0.2s linear opacity;
}

#fullscreen:focus {
    outline:none;
}

#fullscreen:hover {
    opacity: 1;
}`;

// Fullscreen handling
document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(fullscreen_obj);
    document.head.appendChild(style);

    let fullscreen = false;

    ipcRenderer.on("fullscreen-update", (_, state) => {
        fullscreen = state;
        updateFullScreenIcon();
    });
    
    const updateFullScreenIcon = () => {
        if(fullscreen)
            icon.innerText = "fullscreen_exit";
         else 
            icon.innerText = "fullscreen";
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