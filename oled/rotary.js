const { Gpio } = require('onoff');
const { exec } = require('child_process');
const queue = require('async/queue');

// GPIO setup
const clk = new Gpio(13, 'in', 'both');
const dt = new Gpio(5, 'in', 'both');
const sw = new Gpio(6, 'in', 'falling', { debounceTimeout: 10 });

let clkLastState = clk.readSync();
let lastDirection = null;
let stepCounter = 0;
const stepsPerAction = 4; // Adjust based on desired sensitivity
const debounceDelay = 5; // Shorter delay to quickly respond to changes

// Command execution queue
const execQueue = queue((task, completed) => {
    exec(task.command, (error, stdout, stderr) => {
        if (error) console.error(`exec error: ${error}`);
        if (stdout) console.log(`stdout: ${stdout}`);
        if (stderr) console.error(`stderr: ${stderr}`);
        completed();
    });
}, 1);

let platform = '';
exec("volumio status", (error, stdout, stderr) => {
    if (!error) {
        platform = 'volumio';
    } else {
        platform = 'moode';
    }
    console.log(`Detected platform: ${platform}`);
});

const handleRotation = () => {
    const clkState = clk.readSync();
    const dtState = dt.readSync();

    if (clkState !== clkLastState) {
        const direction = clkState !== dtState ? 'Clockwise' : 'Counter-Clockwise';

        // Check if direction changed
        if (lastDirection && direction !== lastDirection) {
            // Reset counter if direction changed
            stepCounter = 1;
        } else {
            // Increment counter if direction is consistent
            stepCounter++;
        }

        // Update last direction
        lastDirection = direction;

        // Execute command if enough steps in the same direction are accumulated
        if (stepCounter >= stepsPerAction) {
            const command = direction === 'Clockwise' ? (platform === 'volumio' ? 'volumio volume plus' : 'mpc volume +5') : (platform === 'volumio' ? 'volumio volume minus' : 'mpc volume -5');
            console.log(`${direction}: ${command}`);
            execQueue.push({ command });
            stepCounter = 0; // Reset counter after executing an action
        }
    }
    clkLastState = clkState;
};

const handleButtonPress = () => {
    console.log('Button Pressed');
    const command = platform === 'volumio' ? 'volumio toggle' : 'mpc toggle';
    execQueue.push({ command });
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
