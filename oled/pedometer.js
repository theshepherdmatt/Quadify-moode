const spiDevice = require('spi-device');
const { exec } = require('child_process');

// Function to adjust sensitivity with a more responsive curve
const adjustSensitivity = (rawValue) => {
  const fraction = rawValue / 1023;
  const adjustedFraction = Math.pow(fraction, 3); // Cubic function for more sensitivity
  return Math.round(adjustedFraction * 100);
};

// Function to read from the MCP3008 channel
const readChannel = (channel) => {
  return new Promise((resolve, reject) => {
    const mcp3008 = spiDevice.open(0, 1, { maxSpeedHz: 1350000 }, (err) => {
      if (err) reject(err);

      const message = [{
        sendBuffer: Buffer.from([1, (8 + channel) << 4, 0]),
        receiveBuffer: Buffer.alloc(3),
        byteLength: 3,
        speedHz: 1350000
      }];

      mcp3008.transfer(message, (err, msg) => {
        if (err) {
          reject(err);
        } else {
          const result = msg[0].receiveBuffer;
          const value = ((result[1] & 3) << 8) + result[2];
          resolve(value);
        }
        mcp3008.close((err) => {
          if (err) console.error('Failed to close SPI device', err);
        });
      });
    });
  });
};

// Function to set volume
const adjustVolumeWithMPC = (volume) => {
  exec(`mpc volume ${volume}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`Volume set to ${volume} with MPC: ${stdout}`);
    if (stderr) console.log(`stderr: ${stderr}`);
  });
};

let lastVolume = -1;
let stableReadings = 0;
const volumeChangeThreshold = 2;
const confirmationThreshold = 2;
const pollingInterval = 500;
const debounceThreshold = 10; // Threshold to ignore minor fluctuations
let debounceCounter = 0; // Counter to track debounce period

// Polling function with debounce logic
const startPolling = () => {
  const channel = 0;
  setInterval(async () => {
    try {
      const value = await readChannel(channel);
      const adjustedValue = adjustSensitivity(value);
      if (Math.abs(adjustedValue - lastVolume) > volumeChangeThreshold) {
        if (debounceCounter < debounceThreshold) {
          debounceCounter++; // Increment debounce counter
        } else {
          stableReadings++;
          if (stableReadings >= confirmationThreshold) {
            console.log(`Potentiometer Value: ${value}, Adjusting volume to: ${adjustedValue}`);
            adjustVolumeWithMPC(adjustedValue);
            lastVolume = adjustedValue;
            stableReadings = 0;
            debounceCounter = 0; // Reset debounce counter
          }
        }
      } else {
        stableReadings = 0; // Reset stable readings counter
        debounceCounter = 0; // Reset debounce counter if readings are not changing significantly
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }, pollingInterval);
};

process.stdin.resume();
console.log('Script is running, press CTRL+C to exit');

process.on('SIGINT', () => {
  console.log('Exiting...');
  process.exit();
});

startPolling();
