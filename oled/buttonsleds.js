const i2c = require('i2c-bus');
const MCP23017_ADDRESS = 0x27;
const { exec } = require('child_process');

// MCP23017 register definitions
const MCP23017_IODIRA = 0x00;
const MCP23017_IODIRB = 0x01;
const MCP23017_GPIOA = 0x12;
const MCP23017_GPIOB = 0x13;
const MCP23017_GPPUA = 0x0C;
const MCP23017_GPPUB = 0x0D;

const bus = i2c.openSync(1);

console.log("Configuring MCP23017 I/O expander.");

// Configure Port B: PB0 and PB1 as output, PB2-PB5 as input with pull-up resistors
bus.writeByteSync(MCP23017_ADDRESS, MCP23017_IODIRB, 0x3C);
bus.writeByteSync(MCP23017_ADDRESS, MCP23017_GPPUB, 0x3C);

// Configure Port A as outputs for LEDs
bus.writeByteSync(MCP23017_ADDRESS, MCP23017_IODIRA, 0x00);
console.log("MCP23017 ports configured.");

const button_map = [
    [2, 1],
    [4, 3],
    [6, 5],
    [8, 7]
];

let prev_button_state = [[1, 1], [1, 1], [1, 1], [1, 1]];

function control_leds(led_state) {
    console.log(`Setting LED state to ${led_state}.`);
    bus.writeByteSync(MCP23017_ADDRESS, MCP23017_GPIOA, led_state);
}

function executeMpcCommand(command) {
  exec(`mpc ${command}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing MPC command: ${error.message}`);
      return;
    }
    if (stdout) console.log(stdout); // Log command output (e.g., status of the player)
    if (stderr) console.error(`stderr: ${stderr}`);
  });
}

function control_leds(led_state) {
    console.log(`Setting LED state to ${led_state}.`);
    bus.writeByteSync(MCP23017_ADDRESS, MCP23017_GPIOA, led_state);
}

function read_button_matrix() {
    const button_matrix_state = [[0, 0], [0, 0], [0, 0], [0, 0]];

    for (let column = 0; column < 2; column++) {
        bus.writeByteSync(MCP23017_ADDRESS, MCP23017_GPIOB, ~(1 << column) & 0x03);
        const row_state = bus.readByteSync(MCP23017_ADDRESS, MCP23017_GPIOB) & 0x3C;

        for (let row = 0; row < 4; row++) {
            button_matrix_state[row][column] = (row_state >> (row + 2)) & 1;
        }
    }

    return button_matrix_state;
}

let platform = ''; // Ensure this is globally accessible

function detectPlatform(callback) {
    exec("volumio status", (error, stdout, stderr) => {
        if (!error) {
            platform = 'volumio';
        } else {
            platform = 'moode';
        }
        console.log(`Detected platform: ${platform}`);
        if (typeof callback === "function") {
            callback(); // Call the callback function once the platform is determined
        }
    });
}

// Modify the initial call to include the main loop of your script as a callback
detectPlatform(function() {
    check_buttons_and_update_leds();
});

function detectPlatformImproved(callback) {
    exec("systemctl status volumio", (error, stdout, stderr) => {
        if (!error) {
            platform = 'volumio';
        } else {
            exec("systemctl status moodeaudio", (error, stdout, stderr) => {
                if (!error) {
                    platform = 'moode';
                } else {
                    platform = 'unknown';
                }
                console.log(`Detected platform: ${platform}`);
                callback();
            });
        }
    });
}

function executeMpcCommandEnhanced(command) {
    exec(`mpc ${command}`, (error, stdout, stderr) => {
        console.log(`Executing command: mpc ${command}`);
        if (error) {
            console.error(`Error executing MPC command: ${error.message}`);
            return;
        }
        if (stdout) console.log(`stdout: ${stdout}`);
        if (stderr) console.error(`stderr: ${stderr}`);
    });
}

function executeCommand(command) {
    let cmd = '';
    
    if (platform === 'volumio') {
        switch (command) {
            case "play": cmd = "volumio play"; break;
            case "pause": cmd = "volumio pause"; break;
            case "next": cmd = "volumio next"; break;
            case "prev": cmd = "volumio previous"; break;
            case "repeat": cmd = "volumio repeat"; break;
            case "random": cmd = "volumio random"; break;
            case "load Favourite-Radio": 
                // Volumio specific command to play a favorite radio station
                // Adjust as necessary, may require using Volumio's REST API
                cmd = ""; 
                console.log("Load Favourite-Radio command needs to be customized for Volumio.");
                break;
            case "restart oled":
                cmd = "sudo systemctl restart oled.service";
                break;
        }
    } else if (platform === 'moode') {
        switch (command) {
            case "play":
            case "pause":
            case "next":
            case "prev":
            case "repeat":
            case "random":
                cmd = `mpc ${command}`;
                break;
            case "load Favourite-Radio":
                cmd = "mpc load Favourite-Radio"; // Adjust for actual playlist name
                break;
            case "restart oled":
                cmd = "sudo systemctl restart oled.service";
                break;
        }
    }

    if (cmd) {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${error.message}`);
                return;
            }
            if (stdout) console.log(stdout);
            if (stderr) console.error(`stderr: ${stderr}`);
        });
    }
}

function check_buttons_and_update_leds() {
    const button_matrix = read_button_matrix();

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 2; col++) {
            const button_id = button_map[row][col];
            const current_button_state = button_matrix[row][col];

            if (current_button_state === 0 && prev_button_state[row][col] !== current_button_state) {
                console.log(`Button ${button_id} pressed`);
                
                switch(button_id) {
                    case 1: executeCommand("play"); break;
                    case 2: executeCommand("pause"); break;
                    case 3: executeCommand("next"); break;
                    case 4: executeCommand("prev"); break;
                    case 5: executeCommand("repeat"); break;
                    case 6: executeCommand("random"); break;
                    case 7: executeCommand("load Favourite-Radio"); break;
                    case 8: 
                        exec("sudo systemctl restart oled.service", (error, stdout, stderr) => {
                            if (error) {
                                console.error(`Error restarting oled.service: ${error.message}`);
                                return;
                            }
                            console.log("oled.service restarted successfully.");
                        });
                        break;
                }

                // Update LED state for feedback
                const led_state = 1 << (button_id - 1);
                control_leds(led_state);
            }

            prev_button_state[row][col] = current_button_state;
        }
    }

    setTimeout(check_buttons_and_update_leds, 100); // Adjust delay as needed
}


const PLAY_LED = 1; // LED index for play button
const PAUSE_LED = 2; // LED index for pause button

function updatePlayPauseLEDs() {
    let statusCommand = '';
    if (platform === 'volumio') {
        statusCommand = "volumio status";
    } else if (platform === 'moode') {
        statusCommand = "mpc status";
    } else {
        console.log("Platform not supported for status update.");
        return;
    }

    exec(statusCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing status command: ${error.message}`);
            return;
        }
        
        // Determine the play/pause state based on the platform
        let isPlaying = false;
        if (platform === 'volumio') {
            const status = JSON.parse(stdout);
            isPlaying = status.status === 'play';
        } else if (platform === 'moode') {
            const status = stdout.split('\n').find(line => line.startsWith("[playing]"));
            isPlaying = status !== undefined;
        }
        
        // Update LEDs based on play/pause state
        const led_state = isPlaying ? (1 << (PLAY_LED - 1)) : (1 << (PAUSE_LED - 1));
        control_leds(led_state);
    });
}

// Call this function to start the status update loop
function startStatusUpdateLoop() {
    const updateInterval = 5000; // Update every 5 seconds
    setInterval(updatePlayPauseLEDs, updateInterval);
}

// Modify the detectPlatform function to include startStatusUpdateLoop in the callback
detectPlatform(function() {
    check_buttons_and_update_leds();
    startStatusUpdateLoop(); // Start updating play/pause LEDs based on current player status
});

