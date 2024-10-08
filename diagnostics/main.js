// connect ripple effect to sidebar buttons
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

const showHome = () => {
    document.getElementById("home").style.display = "";
    document.getElementById("diagnostics").style.display = "none";
    document.getElementById("checks").style.display = "none";

    // update sidebar
    document.getElementById("home-sidebar-btn").classList.add("active");
    document.getElementById("diagnostics-sidebar-btn").classList.remove("active");
    document.getElementById("checks-sidebar-btn").classList.remove("active");
}

const showDiagnostics = () => {
    document.getElementById("home").style.display = "none";
    document.getElementById("diagnostics").style.display = "";
    document.getElementById("checks").style.display = "none";

    // update sidebar
    document.getElementById("home-sidebar-btn").classList.remove("active");
    document.getElementById("diagnostics-sidebar-btn").classList.add("active");
    document.getElementById("checks-sidebar-btn").classList.remove("active");
}

const showChecks = () => {
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

const onConnect = () => {
    console.log("Robot connected");

    
    document.getElementById("robot-status").classList.remove("loading");
    document.getElementById("robot-status").classList.remove("disconnected");
    document.getElementById("robot-status").classList.add("connected");
}

const onDisconnect = () => {
    console.log("Robot disconnected");

    document.getElementById("robot-status").classList.remove("loading");
    document.getElementById("robot-status").classList.remove("connected");
    document.getElementById("robot-status").classList.add("disconnected");
}

robot.onConnect.addEventListener(onConnect);

robot.onDisconnect.addEventListener(onDisconnect);

robot.isConnected() ? onConnect() : onDisconnect();