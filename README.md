# Quadify
Toolset and sources file used for customizing RPI audio distributions with Quadify hardware support, originally made by Audiophonics and updated by Quadify

This repository holds sources and methods for installing the specific hardware found in Quadify and some utilities in a fresh distribution for audio playback on Raspberry Pi. 

## Currently supported : 
  
### Volumio
* Installation of OLED Display
* Installation of web interface with some system options, see below 

## ToolSet in a Web Interface
Some options can be configured by the user (such as OLED brightness, sleep-delay, or boot logo) in a tiny web interface powered by nodeJS. 
You can get there by using your web browser to open the **port 4150** : 
* Navigate to [http://volumio.local:4150](http://volumio.local:4150.). 
* It works with your Quadify IP as well: http://192.168.xx.xx:4150.

## Important notes : 
* **It should be generally safe to use this script on a non-fresh installation** of Volumio if something broke after an update or if you messed with the configuration. However, keep in mind that I designed this script to build and debug our custom releases, and I could not test every possible scenario where the script would run on an already customized/configured device. Remember that you use this installation script at your own risk and that some extreme cases could lead you to reflash your SD card. So be sure to back up everything important before doing anything. 

* **Most of what can be configured from the regular distro web interface is left untouched by this script**. If you use this installation method on a fresh install, you still have to configure Volumio in their WebUi (allowing MPD to control volume and such). Some distros may require the audio output to be already configured with the ES9038 driver to work. I suggest you do this in your regular distribution interface **before** running any customization script.

* **Your device must have network access to download dependencies.** This set of files is not designed for offline installation.

## Usage : 
* Update package repo list
```bash
sudo apt-get update
```

* Install Git (MoOde only)
```bash
sudo apt-get install git -y
```

* Download source files (this repository).
```bash
git clone https://github.com/theshepherdmatt/Quadify.git
```

* Enter the directory for Volumio
```bash
cd Quadify/volumio
```
or
* Enter the directory for MoOde
```bash
cd Quadify/moode
```

* Run the installation script **as root** to install all available features
```bash
sudo bash install.sh
```

* Most scripts deal with hardware configuration and will require you to reboot after completion. A successful script installation will explicitly notify you from the terminal if a reboot is needed.

## Install duration :
Some scripts and core functionalities automatically download and compile frameworks from source. This is due to the wide range of Linux flavors that are found across the audio distributions for Raspberry Pi and the different rates at which updates happen. Since the default packages and libraries natively available on those systems can vary a lot, do not expect installation time to be consistent from one distribution to another. Installing OLED#2 can take about 5 minutes on moOde audio.

Credit: This code and toolset are provided by Audiophonics.
