let animationTimeout = null;

const showNoRobot = () => {
    clearTimeout(animationTimeout);
    animationTimeout = setTimeout(() => {
        document.getElementById("no-robot-prompt").style.opacity = 1;
    }, 200);
    document.getElementById("waiting-tests-prompt").style.opacity = 0;
    document.getElementById("initializing-tests").style.opacity = 0;
    document.getElementById("running-tests").style.opacity = 0;
    document.getElementById("tests-success").style.opacity = 0;
}

const showConnected = () => {
    clearTimeout(animationTimeout);
    animationTimeout = setTimeout(() => {
        document.getElementById("waiting-tests-prompt").style.opacity = 1;
    }, 200);
    document.getElementById("no-robot-prompt").style.opacity = 0;
    document.getElementById("initializing-tests").style.opacity = 0;
    document.getElementById("running-tests").style.opacity = 0;
    document.getElementById("tests-success").style.opacity = 0;
}

const showInitializing = () => {
    clearTimeout(animationTimeout);
    animationTimeout = setTimeout(() => {
        document.getElementById("initializing-tests").style.opacity = 1;
        
    }, 200);
    document.getElementById("waiting-tests-prompt").style.opacity = 0;
    document.getElementById("no-robot-prompt").style.opacity = 0;
    document.getElementById("running-tests").style.opacity = 0;
    document.getElementById("tests-success").style.opacity = 0;
}

const showRunning = () => {
    clearTimeout(animationTimeout);
    animationTimeout = setTimeout(() => {
        document.getElementById("running-tests").style.opacity = 1;
    }, 200);
    document.getElementById("waiting-tests-prompt").style.opacity = 0;
    document.getElementById("no-robot-prompt").style.opacity = 0;
    document.getElementById("initializing-tests").style.opacity = 0;
    document.getElementById("tests-success").style.opacity = 0;
}

const showSuccess = () => {
    clearTimeout(animationTimeout);
    animationTimeout = setTimeout(() => {
        document.getElementById("tests-success").style.opacity = 1;
    }, 200);
    document.getElementById("waiting-tests-prompt").style.opacity = 0;
    document.getElementById("no-robot-prompt").style.opacity = 0;
    document.getElementById("initializing-tests").style.opacity = 0;
    document.getElementById("running-tests").style.opacity = 0;
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
        if(!state) state = "waiting";
        if(!stateToIcon(state)) { console.error("Invalid state for test: " + name, "       ", state); return; }
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
            if(this.state === "waiting") return;
            this.updateTime();
        }, 100);

    }

    setState(newState) {
        if(!stateToIcon(newState)) return;
        this.iconElement.classList.remove(this.state);
        this.state = newState;
        this.iconElement.innerText = stateToIcon(newState);
        this.iconElement.classList.add(newState);

        if(newState === "passed") {
            clearInterval(this.timer);
        } else {
            this.timeStarted = new Date().getTime();
        }
    }

    setTimeElapsed(seconds) {
        this.timeStarted = new Date().getTime()-seconds*1000;
    }

    updateTime() {
        if(this.state !== "running") return;
        if(((new Date().getTime() - this.timeStarted) / 1000) > 60) {
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

let tests = {};

const onConnect = () => {
    console.log("Robot connected");
    showConnected();
};

const onDisconnect = () => {
    Object.values(tests).forEach(test => test.destroy());
    tests = {};
    showNoRobot();
    console.log("Robot disconnected");
};

robot.onConnect.addEventListener(onConnect);
robot.onDisconnect.addEventListener(onDisconnect);

robot.isConnected() ? onConnect() : onDisconnect();

/*
let task1 = new Test("Test 1");
task1.setState("running");
task1.setTimeElapsed(-1);
task1.updateTime();
task1.setState("failed");
task1.destroy();
*/