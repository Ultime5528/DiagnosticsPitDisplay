// connect ripple effect to sidebar buttons
const registerRippleButton = (button) => {
    button.addEventListener('click', (e) => {
        const ripple = document.createElement('div');

        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;
        ripple.style.width = ripple.style.height = `${diameter}px`;

        ripple.classList.add('ripple');
        ripple.style.left = `${e.clientX + window.scrollX - button.offsetLeft - radius - 50}px`;
        ripple.style.top = `${e.clientY + window.scrollY - button.offsetTop - radius}px`;
        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 601);
    });
}

document.querySelectorAll('.button').forEach(registerRippleButton);
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

const createCheckElement = (subsystem, onStartCheck) => {
    const checkElement = document.createElement('div');
    checkElement.classList.add('check');

    const title = document.createElement('div');
    title.classList.add('check-title');
    title.innerText = subsystem;
    checkElement.appendChild(title);

    const status = document.createElement('div');
    status.classList.add('check-status');

    const icon = document.createElement('span');
    icon.classList.add('material-symbols-outlined');
    let color = '#2196F3';
    icon.style.color = color;
    icon.innerText = 'pending';
    status.appendChild(icon);

    /*const button = document.createElement('div');
    button.classList.add('button');
    button.innerText = 'Executer le check (Run check)';
    registerRippleButton(button);
    button.addEventListener('click', onStartCheck);
    status.appendChild(button);*/

    checkElement.appendChild(status);

    document.getElementById("checks-list").appendChild(checkElement);

    return {
        element: checkElement,
        icon,
        onStartCheck
    };
}

// Add charts
let SubsystemList = [];
let BatteryVoltage = [];
let Faults = {};
let SubsystemStatuses = {};
let ChecksSubsystemsElems = {};
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
            borderColor: [], //'#ff9999' error , //#FFA500 warning
            backgroundColor: [], //"rgba(255, 153, 153, 0.5)", error, //"rgba(255, 165, 0, 0.5)" warning
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

document.getElementById("clearfaults").addEventListener("click", async () => {
    for(const subsystem of SubsystemList) {
        await robot.setNetworkTablesValue(`/Diagnostics/Subsystems/${subsystem}/Faults`, []);
        await robot.setNetworkTablesValue(`/Diagnostics/Subsystems/${subsystem}/Status`, parseInt(0));
        Faults[subsystem] = [];
    }

    document.getElementById("faults").innerHTML = "";
});

document.getElementById("home-sidebar-btn").addEventListener("click", showHome);
document.getElementById("diagnostics-sidebar-btn").addEventListener("click", showDiagnostics);
document.getElementById("checks-sidebar-btn").addEventListener("click", showChecks);

const onUpdateFaults = async () => {
    let faultCount = Object.values(Faults).reduce((acc, val) => acc + val.length, 0);

    if(faultCount > 0) {
        document.getElementById("clearfaults").style.display = "";
        document.getElementById("nofaults").style.display = "none";
    } else {
        document.getElementById("clearfaults").style.display = "none";
        document.getElementById("nofaults").style.display = "";
    }

    document.getElementById("fault-count").innerText = faultCount;
    document.getElementById("faulty-subsystem-count").innerText = Object.keys(Faults).filter(key => Faults[key].length > 0).length;

    // change color for each subsystem on faultsSubsystemChart labels based on status
    let borderColors = [];
    let backgroundColors = [];
    for(const subsystem of Object.keys(Faults)) {
        borderColors.push(SubsystemStatuses[subsystem] === 0 ? "rgba(0,0,0,0)" : SubsystemStatuses[subsystem] === 1 ? '#FFA500' : '#ff9999');
        backgroundColors.push(SubsystemStatuses[subsystem] === 0 ? "rgba(0,0,0,0)" : SubsystemStatuses[subsystem] === 1 ? "rgba(255, 165, 0, 0.5)" : "rgba(255, 153, 153, 0.5)");
    }

    faultsSubsystemChart.data.labels = Object.keys(Faults);
    faultsSubsystemChart.data.datasets[0].borderColor = borderColors;
    faultsSubsystemChart.data.datasets[0].backgroundColor = backgroundColors;
    faultsSubsystemChart.data.datasets[0].data = Object.values(Faults).map(val => val.length);
    faultsSubsystemChart.update();
}

const onBatteryVoltageUpdate = (value) => {
    if(value === null) return;

    BatteryVoltage = value;

    document.getElementById("battery-voltage-count").innerText = BatteryVoltage[BatteryVoltage.length-1];

    batteryVoltageChart.data.datasets[0].data = BatteryVoltage;
    batteryVoltageChart.update();
}

const onConnect = async () => {
    console.log("Robot connected");

    let onIsTestUpdate = (value) => {
        if(value) {
            document.getElementById("robot-not-test-mode").style.display = "none";
        } else {
            document.getElementById("robot-not-test-mode").style.display = "";
        }
    }
    robot.getTopicUpdateEvent("/Diagnostics/IsInTest").addEventListener(onIsTestUpdate);
    onIsTestUpdate(await robot.getNetworkTablesValue("/Diagnostics/IsInTest"));

    // Acquire subsystem list
    SubsystemList = await robot.getNetworkTablesValue("/Diagnostics/SubsystemList")
    document.getElementById("subsystem-count").innerText = SubsystemList.length;
    
    // Acquire faults for every subsystem
    for(const subsystem of SubsystemList) {
        Faults[subsystem] = await robot.getNetworkTablesValue(`/Diagnostics/Subsystems/${subsystem}/Faults`);
        SubsystemStatuses[subsystem] = await robot.getNetworkTablesValue(`/Diagnostics/Subsystems/${subsystem}/Status`);

        // Register fault update events for each subsystem.
        robot.getTopicUpdateEvent(`/Diagnostics/Subsystems/${subsystem}/Faults`).addEventListener(async (value) => {
            Faults[subsystem] = value;
            
            document.getElementById("faults").innerHTML = "";
            for(const fault of value) document.getElementById("faults").appendChild(createFaultElement(parseFaultString(subsystem, fault)));
            onUpdateFaults();
        });

        // Create check element for each subsystem
        ChecksSubsystemsElems[subsystem] = createCheckElement(subsystem, () => {
            return new Promise(async resolve => {
                console.log(`Running check for ${subsystem}`);

                // Setup
                await robot.setNetworkTablesValue("/Diagnostics/Subsystems/"+subsystem+"/Status", 3);
                let topicEvent = robot.getTopicUpdateEvent("/SmartDashboard/Diagnostics/Tests/Test"+subsystem+"/running")
                let handler = async (value) => {
                    topicEvent.removeEventListener(handler);
                    if(value === false) {
                        resolve();
                        let highestSeverity = 0;
                        for(const fault of Faults[subsystem]) {
                            let severity = parseFaultString(subsystem, fault).warning ? 1 : 2;
                            if(severity > highestSeverity) highestSeverity = severity;
                        }
                        if(SubsystemStatuses[subsystem] === 3) await robot.setNetworkTablesValue("/Diagnostics/Subsystems/"+subsystem+"/Status", highestSeverity);
                    }
                }
                topicEvent.addEventListener(handler);
    
                // Start test
                robot.setNetworkTablesValue("/SmartDashboard/Diagnostics/Tests/Test"+subsystem+"/running", true);
            })
        });

        ChecksSubsystemsElems[subsystem].icon.innerText = SubsystemStatuses[subsystem] === 0 ? 'check' : SubsystemStatuses[subsystem] === 1 ? 'warning' : SubsystemStatuses[subsystem] === 2 ? "error_outline" : 'autorenew';
        ChecksSubsystemsElems[subsystem].icon.style.color = SubsystemStatuses[subsystem] === 0 ? '#4CAF50' : SubsystemStatuses[subsystem] === 1 ? '#FFA500' : SubsystemStatuses[subsystem] === 2 ? "#f44336" : '#f4f436';

        // Register status update events for each subsystem.
        robot.getTopicUpdateEvent(`/Diagnostics/Subsystems/${subsystem}/Status`).addEventListener(async (value) => {
            SubsystemStatuses[subsystem] = value;
            ChecksSubsystemsElems[subsystem].icon.innerText = SubsystemStatuses[subsystem] === 0 ? 'check' : SubsystemStatuses[subsystem] === 1 ? 'warning' : SubsystemStatuses[subsystem] === 2 ? "error_outline" : 'autorenew';
        ChecksSubsystemsElems[subsystem].icon.style.color = SubsystemStatuses[subsystem] === 0 ? '#4CAF50' : SubsystemStatuses[subsystem] === 1 ? '#FFA500' : SubsystemStatuses[subsystem] === 2 ? "#f44336" : '#f4f436';
        });
    }

    // Setup checks screen
    document.getElementById("loading-checks").style.display = "none";
    document.getElementById("run-all-checks").style.display = "";

    // Create fault elements
    for(const subsystem of SubsystemList) for(const fault of Faults[subsystem]) document.getElementById("faults").appendChild(createFaultElement(parseFaultString(subsystem, fault)));
    
    document.getElementById("loading-faults").style.display = "none";
    onUpdateFaults();
    
    
    
    // Set bottom bar as connected
    document.getElementById("robot-status").classList.remove("loading");
    document.getElementById("robot-status").classList.remove("disconnected");
    document.getElementById("robot-status").classList.add("connected");
}
let runningTests = false;
document.getElementById("run-all-checks").addEventListener("click", async () => {
    if(runningTests) return;
    document.getElementById("run-all-checks").disabled = true;
    runningTests = true;
    for(const subsystem of SubsystemList) {
        ChecksSubsystemsElems[subsystem].icon.innerText = 'pending';
        ChecksSubsystemsElems[subsystem].icon.style.color = '#2196F3';
    }
    for(const subsystem of SubsystemList) {
        await ChecksSubsystemsElems[subsystem].onStartCheck();
    }
    runningTests = false;
    document.getElementById("run-all-checks").disabled = false;
});

// Get initial battery voltage value
robot.getNetworkTablesValue("/Diagnostics/BatteryVoltage").then(onBatteryVoltageUpdate);

// Update battery graph every time the battery voltage history changes
robot.getTopicUpdateEvent("/Diagnostics/BatteryVoltage").addEventListener((value) => {
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

document.getElementById("home-sidebar-btn").style.transition = "none";
document.getElementById("diagnostics-sidebar-btn").style.transition = "none";
document.getElementById("checks-sidebar-btn").style.transition = "none";

window.location.search.includes("home") ? showHome() : window.location.search.includes("checks") ? showChecks() : window.location.search.includes("diagnostics") ? showDiagnostics() : showHome();

setTimeout(() => {
    document.getElementById("home-sidebar-btn").style.transition = "";
    document.getElementById("diagnostics-sidebar-btn").style.transition = "";
    document.getElementById("checks-sidebar-btn").style.transition = "";
}, 200)
