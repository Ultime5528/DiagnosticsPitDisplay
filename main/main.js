// connect ripple effect to sidebar buttons
document.querySelectorAll('.sidebar-menu-item').forEach((button) => button.addEventListener('click', (e) => {
    const ripple = document.createElement('div');

    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    ripple.style.width = ripple.style.height = `${diameter}px`;

    ripple.classList.add('ripple');
    ripple.style.left = `${e.clientX - button.offsetLeft - radius}px`;
    ripple.style.top = `${e.clientY - button.offsetTop - radius}px`;
    button.appendChild(ripple);

    setTimeout(() => {
        ripple.remove();
    }, 601);
}));

const CustomGetTopicUpdateEvent = (topic) => {
    const event = robot.getTopicUpdateEvent(topic);
    let oldAddEventListener = event.addEventListener;
    event.addEventListener = (callback) => { robot.getNetworkTablesValue(topic).then((value) => value != null ? callback(value) : () => {}); return oldAddEventListener(callback); };
    return event
}

class Alert {
    constructor(description, type) {
        this.description = description;
        this.type = type;
    }

    getType() {
        return this.type;
    }

    getDescription() {
        return this.description;
    }

    generateElement() {
        let alertDiv = document.createElement("div");
        alertDiv.classList.add("alert");

        let spanAlertIcon = document.createElement("span");
        spanAlertIcon.classList.add("material-symbols-outlined");
        spanAlertIcon.classList.add("alert-icon");
        switch(this.type) {
            case "info":
                spanAlertIcon.innerHTML = "info";
                spanAlertIcon.style.color = "#1e90ff";
                break;
            case "warning":
                spanAlertIcon.innerHTML = "warning";
                spanAlertIcon.style.color = "#FFA500";
                break;
            case "error":
                spanAlertIcon.innerHTML = "error_outline";
                spanAlertIcon.style.color = "#f44336";
                break;
            default:
                spanAlertIcon.innerHTML = "info";
                spanAlertIcon.style.color = "#1e90ff";
                break;
        }

        let spanAlertName = document.createElement("span");
        spanAlertName.classList.add("alert-name");
        spanAlertName.innerText = this.description;

        alertDiv.appendChild(spanAlertIcon);
        alertDiv.appendChild(spanAlertName);

        return alertDiv;
    }
}

// Add charts
let BatteryVoltage = [];
let Components = {};
let batteryVoltageChart = new Chart(document.getElementById("battery-voltage-chart"), {
    type: 'line',
    data: {
        labels: Array.from({ length: 100 }, (_, i) => i),
        datasets: [{
            label: 'Battery Voltage',
            data: BatteryVoltage,
            borderColor: '#f4f436',
            tension: 0.1,
            pointRadius: 0,
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            x: {
                ticks: {
                    color: 'rgba(0,0,0,0)'
                },
                grid: {
                    color: 'rgb(70,70,70)'
                }
            },
            y: {
                ticks: {
                    color: '#ffffff'
                },
                grid: {
                    color: 'rgb(70,70,70)'
                }
            }
        }
    }
});
let alertsComponentsChart = new Chart(document.getElementById("alerts-components-chart"), {
    type: 'bar',
    data: {
        labels: [],
        datasets: [{
            label: 'Alerts',
            data: [],
            borderColor: [], //#ff9999 error , //#FFA500 warning, //#1e90ff info
            backgroundColor: [], //"rgba(255, 153, 153, 0.5)", error, //"rgba(255, 165, 0, 0.5)" warning, //"rgba(30, 144, 255, 0.5)" info
            borderWidth: 1
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            x: {
                ticks: {
                    color: '#ffffff'
                },
                grid: {
                    color: 'rgb(70,70,70)'
                }
            },
            y: {
                ticks: {
                    color: '#ffffff'
                },
                grid: {
                    color: 'rgb(70,70,70)'
                }
            }
        }
    }
});

const showHome = () => {
    // update search
    window.history.pushState({}, "", "?home");

    document.getElementById("home").style.display = "";
    document.getElementById("diagnostics").style.display = "none";

    // update sidebar
    document.getElementById("home-sidebar-btn").classList.add("active");
    document.getElementById("diagnostics-sidebar-btn").classList.remove("active");
}

const showDiagnostics = () => {
    // update search
    window.history.pushState({}, "", "?diagnostics");

    document.getElementById("home").style.display = "none";
    document.getElementById("diagnostics").style.display = "";

    // update sidebar
    document.getElementById("home-sidebar-btn").classList.remove("active");
    document.getElementById("diagnostics-sidebar-btn").classList.add("active");
}
let oldState = window.location.search;
const showSettings = () => {
    oldState = window.location.search;
    window.history.pushState({}, "", "?settings+"+oldState);
    document.getElementById("settings-overlay").style = "opacity: 1;";
}

document.getElementById("home-sidebar-btn").addEventListener("click", showHome);
document.getElementById("diagnostics-sidebar-btn").addEventListener("click", showDiagnostics);
document.getElementById("settings-sidebar-btn").addEventListener("click", showSettings);

document.getElementById("debug-mode").addEventListener("change", (e) => {
    robot.setDebugMode(e.target.checked);
});
document.getElementById("second-screen").addEventListener("change", (e) => {
    robot.setSecondaryScreen(e.target.checked);
});
document.getElementById("close-settings-btn").addEventListener("click", () => {
    window.history.pushState({}, "", oldState);
    document.getElementById("settings-overlay").style.opacity = 0;
    setTimeout(() => {
        document.getElementById("settings-overlay").style.display = "none";
    }, 100);
});

const ComponentAlertTypes = {
    INFO: 0,
    WARNING: 1,
    ERROR: 2
}

const onBatteryVoltageUpdate = (value) => {
    if (value === null) return;

    if(value.length === 0) {
        document.getElementById("battery-voltage-count").innerText = "Indisponible (Mettre le robot en test)";

        batteryVoltageChart.data.datasets[0].data = value;
        batteryVoltageChart.update();
    } else {
        document.getElementById("battery-voltage-count").innerText = parseInt(value[value.length - 1]*100)/100;

        batteryVoltageChart.data.datasets[0].data = value;
        batteryVoltageChart.update();
    }
}

const onConnect = async () => {
    console.log("Robot connected");

    CustomGetTopicUpdateEvent("/SmartDashboard/DiagnosticsModule/BatteryVoltage").addEventListener(onBatteryVoltageUpdate);
    CustomGetTopicUpdateEvent("/SmartDashboard/DiagnosticsModule/ComponentCount").addEventListener(value => document.getElementById("components-count").innerText = value);

    // Acquire component list
    CustomGetTopicUpdateEvent("/SmartDashboard/DiagnosticsModule/Components").addEventListener(components => {
        Object.values(Components).forEach(component => component.componentContainer.remove());
        Components = {};
        components.forEach(component => {
            Components[component] = {
                alerts: {
                    info: [],
                    warning: [],
                    error: []
                },
                minimized: false,
                componentContainer: document.createElement("div")
            }

            Components[component].componentContainer.classList.add("component");
            let componentHeaderDiv = document.createElement("div");
            componentHeaderDiv.classList.add("component-header");
            
            let toggleComponentContainer = document.createElement("div");
            
            let spanToggleArrow = document.createElement("span");
            spanToggleArrow.classList.add("material-symbols-outlined");
            spanToggleArrow.classList.add("toggle-arrow");
            spanToggleArrow.innerHTML = "expand_more";
            toggleComponentContainer.appendChild(spanToggleArrow);
            
            let componentName = document.createElement("span");
            componentName.classList.add("component-name");
            componentName.innerText = component;
            toggleComponentContainer.appendChild(componentName);
            componentHeaderDiv.appendChild(toggleComponentContainer);
            
            let componentStatusSpan = document.createElement("span");
            componentStatusSpan.classList.add("component-status");
            componentStatusSpan.classList.add("material-symbols-outlined");
            componentStatusSpan.innerHTML = "pending";
            componentStatusSpan.style.color = "#1e90ff";
            componentHeaderDiv.appendChild(componentStatusSpan);

            let componentBody = document.createElement("div");
            componentBody.classList.add("component-body");

            Components[component].componentContainer.appendChild(componentHeaderDiv);
            Components[component].componentContainer.appendChild(componentBody);
            Components[component].componentBody = componentBody;
            Components[component].setComponentStatus = (status) => {
                switch(status) {
                    case ComponentAlertTypes.ERROR:
                        componentStatusSpan.innerHTML = "error_outline";
                        componentStatusSpan.style.color = "#f44336";
                        break;
                    case ComponentAlertTypes.WARNING:
                        componentStatusSpan.innerHTML = "warning";
                        componentStatusSpan.style.color = "#FFA500";
                        break;
                    case ComponentAlertTypes.INFO:
                        componentStatusSpan.innerHTML = "info";
                        componentStatusSpan.style.color = "#1e90ff";
                        break;
                    default:
                        componentStatusSpan.innerHTML = "check_circle";
                        componentStatusSpan.style.color = "#4CAF50";
                        break;
                }
            }
            Components[component].createAlert = (alert) => {
                let element = alert.generateElement();
                componentBody.appendChild(element);
            }
            document.getElementById("alerts").appendChild(Components[component].componentContainer);
            
            spanToggleArrow.addEventListener("click", () => {
                Components[component].minimized = !Components[component].minimized;
                if(Components[component].minimized) {
                    spanToggleArrow.innerHTML = "expand_less";
                    componentBody.style.display = "none";
                } else {
                    spanToggleArrow.innerHTML = "expand_more";
                    if(Components[component].alerts.error.length + Components[component].alerts.warning.length + Components[component].alerts.info.length !== 0) {
                        componentBody.style.display = "";
                    }
                }
            });
            const onUpdateAlerts = () => {
                // change color for each subsystem on alertsComponentsChart labels based on status
                // also update stats on dashboard
                let borderColors = [];
                let backgroundColors = [];

                let alertCount = 0;
                let faultyComponents = 0;
                for (const component_name of Object.keys(Components)) {
                    let highestSeverity = null;
                    alertCount += Components[component_name].alerts.error.length + Components[component_name].alerts.warning.length + Components[component_name].alerts.info.length;
                    
                    if(Components[component_name].alerts.error.length > 0) {
                        highestSeverity = ComponentAlertTypes.ERROR;
                        faultyComponents++;
                    } else if(Components[component_name].alerts.warning.length > 0) {
                        highestSeverity = ComponentAlertTypes.WARNING;
                        faultyComponents++;
                    } else if(Components[component_name].alerts.info.length > 0) {
                        highestSeverity = ComponentAlertTypes.INFO;
                    }
                    Components[component_name].setComponentStatus(highestSeverity);
                    switch(highestSeverity) {
                        case ComponentAlertTypes.ERROR:
                            borderColors.push('#f44336');
                            backgroundColors.push("rgba(255, 153, 153, 0.5)");
                            break;
                        case ComponentAlertTypes.WARNING:
                            borderColors.push('#FFA500');
                            backgroundColors.push("rgba(255, 165, 0, 0.5)");
                            break;
                        case ComponentAlertTypes.INFO:
                            borderColors.push('#1e90ff');
                            backgroundColors.push("rgba(30, 144, 255, 0.5)");
                            break;
                        default:
                            borderColors.push('rgb(0,0,0)');
                            backgroundColors.push("rgb(0,0,0)");
                            break;
                    }

                    if(Components[component_name].alerts.error.length + Components[component_name].alerts.warning.length + Components[component_name].alerts.info.length === 0) {
                        Components[component_name].componentBody.style.display = "none";
                    } else if(!Components[component_name].minimized) {
                        Components[component_name].componentBody.style.display = "";

                    }
    
                    Components[component_name].componentBody.innerHTML = "";
                    for(const alert of Components[component_name].alerts.error) Components[component_name].createAlert(alert);
                    for(const alert of Components[component_name].alerts.warning) Components[component_name].createAlert(alert);
                    for(const alert of Components[component_name].alerts.info) Components[component_name].createAlert(alert);
                }

                document.getElementById("alert-count").innerText = alertCount;
                document.getElementById("faulty-components-count").innerText = faultyComponents;

                alertsComponentsChart.data.labels = Object.keys(Components);
                alertsComponentsChart.data.datasets[0].borderColor = borderColors;
                alertsComponentsChart.data.datasets[0].backgroundColor = backgroundColors;
                alertsComponentsChart.data.datasets[0].data = Object.values(Components).map(val => val.alerts.error.length + val.alerts.warning.length + val.alerts.info.length);
                alertsComponentsChart.update();

                // Update diagnostics page
                document.getElementById("loading-alerts").style.display = "none";
            }

            CustomGetTopicUpdateEvent("/SmartDashboard/"+component+"/Alerts/infos").addEventListener(infos => onUpdateAlerts(Components[component].alerts.info = infos.map(alert => new Alert(alert, "info"))));
            CustomGetTopicUpdateEvent("/SmartDashboard/"+component+"/Alerts/warnings").addEventListener(warnings => onUpdateAlerts(Components[component].alerts.warning = warnings.map(alert => new Alert(alert, "warning"))));
            CustomGetTopicUpdateEvent("/SmartDashboard/"+component+"/Alerts/errors").addEventListener(errors => onUpdateAlerts(Components[component].alerts.error = errors.map(alert => new Alert(alert, "error"))));

            onUpdateAlerts();
        });
    });

    // Set bottom bar as connected
    document.getElementById("robot-status").classList.remove("loading");
    document.getElementById("robot-status").classList.remove("disconnected");
    document.getElementById("robot-status").classList.add("connected");
    document.getElementById("robot-status").classList.remove("connecting");
}

const onDisconnect = (first) => {
    console.log("Robot disconnected");

    if (!first) window.location.reload();

    // Set bottom bar as disconnected
    document.getElementById("robot-status").classList.remove("loading");
    document.getElementById("robot-status").classList.remove("connected");
    document.getElementById("robot-status").classList.add("disconnected");
    document.getElementById("robot-status").classList.remove("connecting");
    
}

const onConnecting = () => {
    // Set bottom bar as connecting
    document.getElementById("robot-status").classList.remove("loading");
    document.getElementById("robot-status").classList.remove("connected");
    document.getElementById("robot-status").classList.remove("disconnected");
    document.getElementById("robot-status").classList.add("connecting");
}

robot.onConnect.addEventListener(onConnect);
robot.onDisconnect.addEventListener(onDisconnect);
robot.onConnecting.addEventListener(onConnecting)

robot.isConnected() ? onConnect() : robot.isConnecting() ? onConnecting() : onDisconnect(true);
window.location.search == "?home" ? showHome() : window.location.search == "?diagnostics" ? showDiagnostics() : window.location.search.includes("settings") ? (() => {
    window.location.search.includes("home") ? showHome() : window.location.search.includes("diagnostics") ? showDiagnostics() : showHome();
    window.history.pushState({}, "", "?settings+"+window.location.search);
    document.getElementById("settings-overlay").style = "opacity: 1;"
})() : showHome();
robot.isDebugMode().then(debug => {
    document.getElementById("debug-mode").checked = debug;
});
robot.getSecondaryScreen().then(secondary => {
    document.getElementById("second-screen").checked = secondary;
});
robot.onShowAbout.addEventListener(showSettings);
function saveFile(content, filename, contenttype) {
    const element = document.createElement("a");
    const file = new Blob([content], {type: contenttype});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    element.click();
}

robot.onExportRequest.addEventListener(async () => {
    let alerts = {}

    Object.keys(Components).forEach((componentName) => {
        alerts[componentName] = []
        let insertFunc = (alert) => {
            alerts[componentName].push({
                type: alert.getType(),
                description: alert.getDescription()
            })
        };
        Components[componentName].alerts.info.forEach(insertFunc);
        Components[componentName].alerts.error.forEach(insertFunc);
        Components[componentName].alerts.warning.forEach(insertFunc);
    })

    saveFile(JSON.stringify({
        componentCount: Object.keys(Components).length,
        components: Object.keys(Components),
        status: robot.isConnected() ? "connected" : "disconnected",
        simulation: await robot.isDebugMode(),
        alerts: alerts,
        batteryVoltage: batteryVoltageChart.data.datasets[0].data,
    }), "DiagnosticsPitDisplayDump-"+(new Date().toLocaleString())+".json", "application/json")
})
