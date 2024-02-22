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

function check_buttons_and_update_leds() {
    const button_matrix = read_button_matrix();

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 2; col++) {
            const button_id = button_map[row][col];
            const current_button_state = button_matrix[row][col];

            if (current_button_state === 0 && prev_button_state[row][col] !== current_button_state) {
                console.log(`Button ${button_id} pressed`);
                
                switch(button_id) {
                    case 1: executeMpcCommand("play"); break;
                    case 2: executeMpcCommand("pause"); break;
                    case 3: executeMpcCommand("next"); break;
                    case 4: executeMpcCommand("prev"); break;
                    case 5: executeMpcCommand("repeat"); break;
                    case 6: executeMpcCommand("random"); break;
                    case 7: executeMpcCommand("load Favourite-Radio"); break;
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
    exec("mpc status", (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing MPC command: ${error.message}`);
            return;
        }
        
        // Parse MPC status to check if playing or paused
        const statusLines = stdout.split('\n');
        const status = statusLines.find(line => line.startsWith("[playing]"));
        const isPlaying = status !== undefined;
        
        // Update LEDs based on play/pause state
        const led_state = isPlaying ? (1 << (PLAY_LED - 1)) : (1 << (PAUSE_LED - 1));
        control_leds(led_state);
    });
}

// Call the function to update play/pause LEDs every few seconds
setInterval(updatePlayPauseLEDs, 5000); // Adjust interval as needed


// Start the main loop
check_buttons_and_update_leds();
