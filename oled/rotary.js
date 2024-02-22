const { Gpio } = require('onoff');
const { exec } = require('child_process');
const queue = require('async/queue');

// GPIO setup
const clk = new Gpio(13, 'in', 'both');
const dt = new Gpio(5, 'in', 'both');
const sw = new Gpio(6, 'in', 'falling', { debounceTimeout: 10 });

let clkLastState = clk.readSync();
let debounceTimer;

// Command execution queue
const execQueue = queue((task, completed) => {
    exec(task.command, (error, stdout, stderr) => {
        if (error) console.error(`exec error: ${error}`);
        if (stdout) console.log(`stdout: ${stdout}`);
        if (stderr) console.error(`stderr: ${stderr}`);
        completed();
    });
}, 1); // Single concurrency to ensure commands are executed one at a time

const handleRotation = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const clkState = clk.readSync();
        const dtState = dt.readSync();

        if (clkState !== clkLastState) {
            const command = dtState !== clkState ? 'mpc volume +5' : 'mpc volume -5';
            console.log(command.includes('+5') ? 'Clockwise' : 'Counter-Clockwise');
            execQueue.push({command});
        }
        clkLastState = clkState;
    }, 10); // Adjust debounce time as needed
};

const handleButtonPress = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        console.log('Button Pressed');
        execQueue.push({command: 'mpc toggle'});
    }, 10); // Adjust debounce time as needed
};

// Event watchers setup
clk.watch((err) => {
    if (err) {
        console.error('Error', err);
        return;
    }
    handleRotation();
});

sw.watch((err) => {
    if (err) {
        console.error('Error', err);
        return;
    }
    handleButtonPress();
});

process.on('SIGINT', () => {
    clk.unexport();
    dt.unexport();
    sw.unexport();
    process.exit();
});
