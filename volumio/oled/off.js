const oled = require('./oled.js');
const opts = {
	width: 256,
	height: 64,
	dcPin: 24,
	rstPin : 25,
	contrast : 0,
	flip : true,
	device: "/dev/spidev0.0",
};

const OLED = new oled(opts);
OLED.begin(()=>{
	OLED.turnOffDisplay();
});

