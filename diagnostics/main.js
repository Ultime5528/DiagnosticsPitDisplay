// connect ripple effect to sidebar buttons
document.querySelectorAll('.button').forEach((button) => {
    button.addEventListener('click', (e) => {
        const ripple = document.createElement('div');

        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;
        ripple.style.width = ripple.style.height = `${diameter}px`;

        ripple.classList.add('ripple');
        ripple.style.left = `${e.clientX + window.scrollX - button.offsetLeft - radius}px`;
        ripple.style.top = `${e.clientY + window.scrollY - button.offsetTop - radius}px`;
        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 601);
    });
});

// connect sidebar buttons to their respective functions
document.querySelectorAll('.sidebar-menu-item').forEach((button) => {
    button.addEventListener('click', (e) => {
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
    });
});

const parseFaultString = (subsystemName, faultString) => {
    let severity = faultString[0];
    let warning = severity === "0";
    let timestamp = faultString.split(";")[1];
    let static = faultString.split(";")[2] === "1";
    let description = faultString.split(";")[3];

    return {
        subsystemName,
        warning,
        timestamp,
        static,
        description
    }
}

let FaultElements = [];
const createFaultElement = (fault) => {
    const faultElement = document.createElement('div');
    faultElement.classList.add('problem');

    const title = document.createElement('div');
    title.classList.add('problem-title');
    title.innerText = fault.subsystemName;
    faultElement.appendChild(title);

    const description = document.createElement('div');
    description.classList.add('problem-description');

    const icon = document.createElement('div');
    icon.classList.add('problem-icon');
    const iconSpan = document.createElement('span');
    iconSpan.classList.add('material-symbols-outlined');
    iconSpan.style.color = fault.warning ? '#FFA500' : '#f44336';
    iconSpan.innerText = fault.warning ? 'warning' : 'error_outline';
    icon.appendChild(iconSpan);
    description.appendChild(icon);

    const descriptionText = document.createElement('span');
    descriptionText.innerText = fault.description;
    description.appendChild(descriptionText);

    faultElement.appendChild(description);

    const timestamp = document.createElement('div');
    timestamp.classList.add('problem-timestamp');
    timestamp.innerHTML = `Timestamp: <span id="problem-timestamp">${fault.timestamp}</span>`;
    faultElement.appendChild(timestamp);

    return faultElement;
}

// Add charts
let SubsystemList = []
let BatteryVoltage = [];
let Faults = {};
let batteryVoltageChart = new Chart(document.getElementById("battery-voltage-chart"), {
    type: 'line',
    data: {
        labels: Array.from({length: 100}, (_, i) => i),
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
let faultsSubsystemChart = new Chart(document.getElementById("faults-subsystems-chart"), {
    type: 'bar',
    data: {
        labels: [],
        datasets: [{
            label: 'Faults',
            data: [],
            borderColor: '#ff9999',
            backgroundColor: "rgba(255, 153, 153, 0.5)",
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
    document.getElementById("checks").style.display = "none";

    // update sidebar
    document.getElementById("home-sidebar-btn").classList.add("active");
    document.getElementById("diagnostics-sidebar-btn").classList.remove("active");
    document.getElementById("checks-sidebar-btn").classList.remove("active");
}

const showDiagnostics = () => {
    // update search
    window.history.pushState({}, "", "?diagnostics");

    document.getElementById("home").style.display = "none";
    document.getElementById("diagnostics").style.display = "";
    document.getElementById("checks").style.display = "none";

    // update sidebar
    document.getElementById("home-sidebar-btn").classList.remove("active");
    document.getElementById("diagnostics-sidebar-btn").classList.add("active");
    document.getElementById("checks-sidebar-btn").classList.remove("active");
}

const showChecks = () => {
    // update search
    window.history.pushState({}, "", "?checks");

    document.getElementById("home").style.display = "none";
    document.getElementById("diagnostics").style.display = "none";
    document.getElementById("checks").style.display = "";

    // update sidebar
    document.getElementById("home-sidebar-btn").classList.remove("active");
    document.getElementById("diagnostics-sidebar-btn").classList.remove("active");
    document.getElementById("checks-sidebar-btn").classList.add("active");
}

document.getElementById("home-sidebar-btn").addEventListener("click", showHome);
document.getElementById("diagnostics-sidebar-btn").addEventListener("click", showDiagnostics);
document.getElementById("checks-sidebar-btn").addEventListener("click", showChecks);

const onUpdateFaults = async () => {
    let faultCount = Object.values(Faults).reduce((acc, val) => acc + val.length, 0);

    if(faultCount > 0) {
        document.getElementById("clearfaults").style.display = "";
        document.getElementById("nofaults").style.display = "none";
    }

    document.getElementById("fault-count").innerText = faultCount;
    document.getElementById("faulty-subsystem-count").innerText = Object.keys(Faults).filter(key => Faults[key].length > 0).length;

    faultsSubsystemChart.data.labels = Object.keys(Faults);
    faultsSubsystemChart.data.datasets[0].data = Object.values(Faults).map(val => val.length);
    faultsSubsystemChart.update();
}

const onBatteryVoltageUpdate = (value) => {
    BatteryVoltage = value;

    document.getElementById("battery-voltage-count").innerText = BatteryVoltage[BatteryVoltage.length-1];

    batteryVoltageChart.data.datasets[0].data = BatteryVoltage;
    batteryVoltageChart.update();
}

const onConnect = async () => {
    console.log("Robot connected");

    // Acquire subsystem list
    SubsystemList = await robot.getNetworkTablesValue("/Diagnostics/SubsystemList", "kStringArray")
    document.getElementById("subsystem-count").innerText = SubsystemList.length;
    
    // Acquire faults for every subsystem
    for(const subsystem of SubsystemList) {
        Faults[subsystem] = await robot.getNetworkTablesValue(`/Diagnostics/Subsystems/${subsystem}/Faults`, "kStringArray");
    }
    for(const subsystem of SubsystemList) {
        for(const fault of Faults[subsystem]) {
            const faultData = parseFaultString(subsystem, fault);
            document.getElementById("faults").appendChild(createFaultElement(faultData));
        }
    }
    onUpdateFaults();
    
    // Register fault update events for each subsystem.
    for(const subsystem of SubsystemList) {
        robot.getTopicUpdateEvent(`/Diagnostics/Subsystems/${subsystem}/Faults`, "kStringArray").addEventListener((value) => {
            // compare the new faults with the old ones
            let newFaults = value.filter(fault => !Faults[subsystem].includes(fault));
            for(const fault of newFaults) {
                const faultData = parseFaultString(subsystem, fault);
                document.getElementById("faults").appendChild(createFaultElement(faultData));
            }

            Faults[subsystem] = value;
            onUpdateFaults();
        });
    }
    
    // Set bottom bar as connected
    document.getElementById("robot-status").classList.remove("loading");
    document.getElementById("robot-status").classList.remove("disconnected");
    document.getElementById("robot-status").classList.add("connected");
}

// Get initial battery voltage value
robot.getNetworkTablesValue("/Diagnostics/BatteryVoltage", "kDoubleArray").then(onBatteryVoltageUpdate);

// Update battery graph every time the battery voltage history changes
robot.getTopicUpdateEvent("/Diagnostics/BatteryVoltage", "kDoubleArray").addEventListener((value) => {
    onBatteryVoltageUpdate(value);
});

const onDisconnect = (first) => {
    console.log("Robot disconnected");

    if(!first) window.location.reload();

    // Set bottom bar as disconnected
    document.getElementById("robot-status").classList.remove("loading");
    document.getElementById("robot-status").classList.remove("connected");
    document.getElementById("robot-status").classList.add("disconnected");
}

robot.onConnect.addEventListener(onConnect);

robot.onDisconnect.addEventListener(onDisconnect);

robot.isConnected() ? onConnect() : onDisconnect(true);

window.location.search.includes("home") ? showHome() : window.location.search.includes("checks") ? showChecks() : window.location.search.includes("diagnostics") ? showDiagnostics() : showHome();