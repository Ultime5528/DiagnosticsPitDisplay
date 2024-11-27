let animationTimeout = null;

const showNoRobot = () => {
    clearTimeout(animationTimeout);
    animationTimeout = setTimeout(() => {
        document.getElementById("no-robot-prompt").style.opacity = 1;
    }, 200);
    document.getElementById("waiting-tests-prompt").style.opacity = 0;
    document.getElementById("robot-connected").style.opacity = 0;
    document.getElementById("running-tests").style.opacity = 0;
    document.getElementById("tests-success").style.opacity = 0;
    document.getElementById("tests-failure").style.opacity = 0;
}

const showWaiting = () => {
    clearTimeout(animationTimeout);
    animationTimeout = setTimeout(() => {
        document.getElementById("waiting-tests-prompt").style.opacity = 1;
    }, 200);
    document.getElementById("no-robot-prompt").style.opacity = 0;
    document.getElementById("robot-connected").style.opacity = 0;
    document.getElementById("running-tests").style.opacity = 0;
    document.getElementById("tests-success").style.opacity = 0;
    document.getElementById("tests-failure").style.opacity = 0;
}

const showConnected = () => {
    clearTimeout(animationTimeout);
    animationTimeout = setTimeout(() => {
        document.getElementById("robot-connected").style.opacity = 1;

    }, 200);
    document.getElementById("waiting-tests-prompt").style.opacity = 0;
    document.getElementById("no-robot-prompt").style.opacity = 0;
    document.getElementById("running-tests").style.opacity = 0;
    document.getElementById("tests-success").style.opacity = 0;
    document.getElementById("tests-failure").style.opacity = 0;
}

const showRunning = () => {
    clearTimeout(animationTimeout);
    animationTimeout = setTimeout(() => {
        document.getElementById("running-tests").style.opacity = 1;
    }, 200);
    document.getElementById("waiting-tests-prompt").style.opacity = 0;
    document.getElementById("no-robot-prompt").style.opacity = 0;
    document.getElementById("robot-connected").style.opacity = 0;
    document.getElementById("tests-success").style.opacity = 0;
    document.getElementById("tests-failure").style.opacity = 0;
}

const showSuccess = () => {
    clearTimeout(animationTimeout);
    animationTimeout = setTimeout(() => {
        document.getElementById("tests-success").style.opacity = 1;
    }, 200);
    document.getElementById("waiting-tests-prompt").style.opacity = 0;
    document.getElementById("no-robot-prompt").style.opacity = 0;
    document.getElementById("robot-connected").style.opacity = 0;
    document.getElementById("running-tests").style.opacity = 0;
    document.getElementById("tests-failure").style.opacity = 0;
}

const showFailure = () => {
    clearTimeout(animationTimeout);
    animationTimeout = setTimeout(() => {
        document.getElementById("tests-failure").style.opacity = 1;
    }, 200);
    document.getElementById("waiting-tests-prompt").style.opacity = 0;
    document.getElementById("no-robot-prompt").style.opacity = 0;
    document.getElementById("robot-connected").style.opacity = 0;
    document.getElementById("running-tests").style.opacity = 0;
    document.getElementById("tests-success").style.opacity = 0;
}

function stateToIcon(state) {
    switch (state) {
        case "running":
            return "autorenew";
        case "passed":
            return "check";
        case "failed":
            return "error";
        case "waiting":
            return "pending";
        default:
            return false;
    }
}

class Test {
    constructor(name, state) {
        if (!state) state = "waiting";
        if (!stateToIcon(state)) { console.error("Invalid state for test: " + name, "       ", state); return; }
        this.name = name;
        this.state = state;

        let testElement = document.createElement("tr");
        let testNameElement = document.createElement("td");
        let testStateElement = document.createElement("td");
        let testStateIconElement = document.createElement("span");
        testStateIconElement.classList.add("material-symbols-outlined");
        testStateIconElement.classList.add(this.state);
        testStateElement.appendChild(testStateIconElement);
        testStateIconElement.innerText = stateToIcon(this.state);
        let testTimeElement = document.createElement("td");
        testTimeElement.innerText = "-";

        testNameElement.innerText = this.name;
        testElement.appendChild(testNameElement);

        testElement.appendChild(testStateElement);
        testElement.appendChild(testTimeElement);

        document.querySelector("tbody").appendChild(testElement);

        this.element = testElement;
        this.durationElement = testTimeElement;
        this.stateElement = testStateElement;
        this.iconElement = testStateIconElement;

        this.timeStarted = new Date().getTime();

        this.timer = setInterval(() => {
            if (this.state === "waiting") return;
            this.updateTime();
        }, 10);

    }

    setState(newState) {
        if (!stateToIcon(newState)) return console.log("invalid state ", newState);
        this.iconElement.classList.remove(this.state);
        this.state = newState;
        this.iconElement.innerText = stateToIcon(newState);
        this.iconElement.classList.add(newState);

        if(newState === "running") this.timeStarted = new Date().getTime();
    }

    setTimeElapsed(seconds) {
        this.timeStarted = new Date().getTime() - seconds * 1000;
    }

    updateTime() {
        if (this.state !== "running") return;
        if (((new Date().getTime() - this.timeStarted) / 1000) > 60) {
            let minutes = ((new Date().getTime() - this.timeStarted) / 1000 / 60).toFixed(0);
            let seconds = ((new Date().getTime() - this.timeStarted) / 1000 % 60).toFixed(1);
            this.durationElement.innerText = minutes + "m " + seconds + "s";
        } else {
            this.durationElement.innerText = ((new Date().getTime() - this.timeStarted) / 1000).toFixed(1) + "s";
        }
    }

    destroy() {
        this.element.remove();
        clearInterval(this.timer);
    }
}

function subsystemStatusToState(status) {
    switch (status) {
        case 0:
            return "passed";
        case 1:
            return "failed";
        case 2:
            return "failed";
        case 3:
            return "running";
        default:
            return "waiting";
    }
}

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

const subsystemStatusToInt = (status) => {
    return status === "ok" ? 0 : status === "warning" ? 1 : status === "error" ? 2 : 3;
}

const intToSubsystemStatus = (status) => {
    return status === 0 ? "ok" : status === 1 ? "warning" : status === 2 ? "error" : "running_test";
}


let tests = {};
let SubsystemList = [];
let SubsystemStatuses = {};
const onConnect = async () => {
    console.log("Robot connected");
    showConnected();

    let onIsInTestUpdate = (value) => {
        if (value) {
            showWaiting();
        } else {
            showConnected();
        }
    }
    robot.getTopicUpdateEvent("/Diagnostics/IsInTest").addEventListener(onIsInTestUpdate);
    onIsInTestUpdate(await robot.getNetworkTablesValue("/Diagnostics/IsInTest"));


    let onSubsystemListUpdate = (value) => {
        SubsystemList = value;

        for (const subsystem of SubsystemList) {
            tests[subsystem] = new Test(subsystem);
            let onStatusUpdate = async (status) => {
                let faults = await robot.getNetworkTablesValue("/Diagnostics/Subsystems/" + subsystem + "/Faults");
                status = faults.length > 0 ? 1 : subsystemStatusToInt(status);
                SubsystemStatuses[subsystem] = subsystemStatusToInt(status);
                tests[subsystem].setState(subsystemStatusToState(subsystemStatusToInt(status)));
            }
            robot.getTopicUpdateEvent("/Diagnostics/Subsystems/" + subsystem + "/Status").addEventListener(onStatusUpdate);

            let onUpdateRunning = (running) => {
                tests[subsystem].updateTime();
                if (running) {
                    tests[subsystem].setState("running");
                } else
                    tests[subsystem].setState(subsystemStatusToState(SubsystemStatuses[subsystem]));
            }
            robot.getTopicUpdateEvent("/SmartDashboard/Diagnostics/Tests/Test" + subsystem + "/running").addEventListener(onUpdateRunning);
            robot.getNetworkTablesValue("/SmartDashboard/Diagnostics/Tests/Test" + subsystem + "/running").then(onUpdateRunning);
        }
    }
    onSubsystemListUpdate(await robot.getNetworkTablesValue("/Diagnostics/SubsystemListTests"));

    let onAllRunningUpdate = async (running) => {
        if (running) {
            Object.values(tests).forEach(test => {
                test.setTimeElapsed(0);
                test.updateTime();
                test.setState("waiting")
            });
            showRunning();
        } else {
            await new Promise(res => setTimeout(res, 1000));
            if (Object.values(SubsystemStatuses).every(status => status === 0))
                showSuccess();
            else
                showFailure();
        }
    }
    robot.getTopicUpdateEvent("/Diagnostics/IsRunningTests").addEventListener(onAllRunningUpdate);

};

const onDisconnect = (first) => {
    if (!first) window.location.reload();
    console.log("Robot disconnected");
    showNoRobot();
};

robot.onConnect.addEventListener(onConnect);
robot.onDisconnect.addEventListener(onDisconnect);

robot.isConnected() ? onConnect() : onDisconnect(true);

/*
let task1 = new Test("Test 1");
task1.setState("running");
task1.setTimeElapsed(-1);
task1.updateTime();
task1.setState("failed");
task1.destroy();
*/