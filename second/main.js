
const CustomGetTopicUpdateEvent = (topic) => {
    const event = robot.getTopicUpdateEvent(topic);
    let oldAddEventListener = event.addEventListener;
    event.addEventListener = (callback) => { robot.getNetworkTablesValue(topic).then((value) => value != null ? callback(value) : () => {}); return oldAddEventListener(callback); };
    return event
}
let BatteryVoltage = [];
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

const onBatteryVoltageUpdate = (value) => {
    if (value === null) return;

    if(value.length !== 0) {
        document.getElementById("battery-voltage-chart").style.display = "";
        document.getElementById("no-data").style.display = "none";
        batteryVoltageChart.data.datasets[0].data = value;
        batteryVoltageChart.update();
    } else {
        document.getElementById("battery-voltage-chart").style.display = "none";
        document.getElementById("no-data").style.display = "";
    }
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
}

const ComponentAlertTypes = {
    INFO: 0,
    WARNING: 1,
    ERROR: 2
}

let Components = {};
const onConnect = async () => {
    console.log("Robot connected");

    CustomGetTopicUpdateEvent("/SmartDashboard/DiagnosticsModule/BatteryVoltage").addEventListener(onBatteryVoltageUpdate);

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
            }

            Components[component].componentContainer = document.createElement("div");
            Components[component].componentContainer.classList.add("boite");

            let componentContent = document.createElement("div");
            componentContent.classList.add("contenu");
            Components[component].componentContainer.appendChild(componentContent);

            let componentTitle = document.createElement("h2");
            componentTitle.innerText = component;

            let componentErrors = document.createElement("span");
            componentErrors.classList.add("b-erreur");
            let componentWarnings = document.createElement("span");
            componentWarnings.classList.add("b-avertissement");
            let componentInfos = document.createElement("span");
            componentInfos.classList.add("b-infos");

            componentContent.appendChild(componentTitle);

            componentContent.appendChild(componentErrors);
            componentContent.appendChild(componentWarnings);
            componentContent.appendChild(componentInfos);

            document.getElementById("diagnostique").appendChild(Components[component].componentContainer);

            Components[component].setInfos = (count) => {
                if(count !== 0) {
                    componentInfos.innerHTML = "<b>"+count+"</b>";
                    componentInfos.style.display = "";
                    Components[component].componentContainer.classList.add("infos");
                } else {
                    componentInfos.style.display = "none";
                    Components[component].componentContainer.classList.remove("infos");
                }
            }
            Components[component].setErrors = (count) => {
                if(count !== 0) {
                    componentErrors.innerHTML = "<b>"+count+"</b>";
                    componentErrors.style.display = "";
                    Components[component].componentContainer.classList.add("erreur");
                } else {
                    componentErrors.style.display = "none";
                    Components[component].componentContainer.classList.remove("erreur");
                }
            }
            Components[component].setWarnings = (count) => {
                if(count !== 0) {
                    componentWarnings.innerHTML = "<b>"+count+"</b>";
                    componentWarnings.style.display = "";
                    Components[component].componentContainer.classList.add("avertissement");
                } else {
                    componentWarnings.style.display = "none";
                    Components[component].componentContainer.classList.remove("avertissement");
                }
            }
            const onUpdateAlerts = () => {
                Components[component].setInfos(Components[component].alerts.info.length);
                Components[component].setWarnings(Components[component].alerts.warning.length);
                Components[component].setErrors(Components[component].alerts.error.length);
            }
            CustomGetTopicUpdateEvent("/SmartDashboard/"+component+"/Alerts/infos").addEventListener(infos => onUpdateAlerts(Components[component].alerts.info = infos.map(alert => new Alert(alert, "info"))));
            CustomGetTopicUpdateEvent("/SmartDashboard/"+component+"/Alerts/warnings").addEventListener(warnings => onUpdateAlerts(Components[component].alerts.warning = warnings.map(alert => new Alert(alert, "warning"))));
            CustomGetTopicUpdateEvent("/SmartDashboard/"+component+"/Alerts/errors").addEventListener(errors => onUpdateAlerts(Components[component].alerts.error = errors.map(alert => new Alert(alert, "error"))));
        });
    });
}

const onDisconnect = (first) => {
    console.log("Robot disconnected");

    if (!first) window.location.reload();
}

robot.onConnect.addEventListener(onConnect);
robot.onDisconnect.addEventListener(onDisconnect);

robot.isConnected() ? onConnect() : onDisconnect(true);