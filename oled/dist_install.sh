#!/bin/sh

# Function to install Node.js and npm
install_node_and_npm() {
    echo "Checking for Node.js and npm installation..."
    if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
        echo "Node.js and npm are already installed."
    else
        echo "Node.js or npm not found. Installing..."
        sudo apt-get update
        sudo apt-get install -y nodejs npm
        # Check again after attempting installation
        if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
            echo "Node.js and npm have been successfully installed."
        else
            echo "Failed to install Node.js and npm. Please check your package manager settings or install them manually."
            exit 1
        fi
    fi
}

# Function to install dependencies for Volumio
install_dep_volumio() {
    if apt-get -qq install build-essential > /dev/null 2>&1; then
        echo "Build-essential package is installed."
    else
        printf "This version of Volumio lacks some dependencies for software compilation.\nTrying to workaround using this technique: https://community.volumio.org/t/cannot-install-build-essential-package/46856/16 ...\n"
        if bash Workaround_BuildEssentials.sh > /dev/null 2>> install_log.txt; then
            echo "... OK"
            return 1
        else
            echo "... Failed again. The OLED display will not be installed."
            exit 1
        fi
    fi
}

# Ensure Node.js and npm are installed before proceeding
install_node_and_npm

# Main installation script
case "$1" in
    'volumio')
        start_time="$(date +"%T")"
        echo "* Installing: Quadify OLED#2 for Volumio" > install_log.txt
        install_dep_volumio
        # Installing npm dependencies
        npm install async i2c-bus pi-spi onoff date-and-time socket.io-client@2.1.1

        # Enable spi-dev module to allow hardware interfacing
        echo "spi-dev" | sudo tee -a /etc/modules > /dev/null
        echo "dtparam=spi=on" | sudo tee -a /boot/userconfig.txt > /dev/null
        # Ensure SPI buffer size is set
        if [ ! -f "/etc/modprobe.d/spidev.conf" ] || ! grep -q 'bufsiz=8192' /etc/modprobe.d/spidev.conf; then
            echo "options spidev bufsiz=8192" | sudo tee -a /etc/modprobe.d/spidev.conf > /dev/null
        fi

        # Register & enable OLED service for Volumio
        printf "[Unit]\nDescription=OLED Display Service\nAfter=volumio.service\n[Service]\nWorkingDirectory=%s\nExecStart=/usr/bin/node %s/index.js volumio\nExecStop=/usr/bin/node %s/off.js\nStandardOutput=null\nType=simple\nUser=volumio\n[Install]\nWantedBy=multi-user.target" "$PWD" "$PWD" "$PWD" | sudo tee /etc/systemd/system/oled.service > /dev/null
        sudo systemctl enable oled > /dev/null 2>> install_log.txt

        # Start service if spidev is loaded
        if lsmod | grep -q "spidev"; then
            sudo systemctl start oled
            echo "OLED service enabled and started for Volumio."
        else
            echo "OLED service enabled for Volumio, but spidev module is NOT loaded: a reboot is required."
        fi
        ;;

    'moode')
        start_time="$(date +"%T")"
        echo "* Installing: Quadify OLED#2 for Moode" > install_log.txt
        # Installing npm dependencies
        npm install async i2c-bus pi-spi onoff date-and-time socket.io-client spi-device 

        # Enable spi-dev module to allow hardware interfacing
        echo "spi-dev" | sudo tee -a /etc/modules > /dev/null
        echo "dtparam=spi=on" | sudo tee -a /boot/config.txt > /dev/null
        # Ensure SPI buffer size is set
        if [ ! -f "/etc/modprobe.d/spidev.conf" ] || ! grep -q 'bufsiz=8192' /etc/modprobe.d/spidev.conf; then
            echo "options spidev bufsiz=8192" | sudo tee -a /etc/modprobe.d/spidev.conf > /dev/null
        fi

        # Register & enable OLED service for Moode with a delay
        printf "[Unit]\nDescription=OLED Display Service for Moode\nAfter=mpd.service\nRequires=mpd.service\n[Service]\nWorkingDirectory=%s\nExecStartPre=/bin/sleep 15\nExecStart=/usr/bin/node %s/index.js moode\nExecStop=/usr/bin/node %s/off.js\nStandardOutput=null\nType=simple\nUser=root\n[Install]\nWantedBy=multi-user.target" "$PWD" "$PWD" "$PWD" | sudo tee /etc/systemd/system/oled.service > /dev/null
        sudo systemctl enable oled > /dev/null 2>> install_log.txt

        # Register & enable OLED service
        #printf "[Unit]\nDescription=OLED Display Service\nAfter=mpd.service\nRequires=mpd.service\n[Service]\nWorkingDirectory=%s\nExecStart=/usr/bin/node %s/index.js moode\nExecStop=/usr/bin/node %s/off.js\nStandardOutput=null\nType=simple\nUser=%s\n[Install]\nWantedBy=multi-user.target" "$PWD" "$PWD" "$PWD" "$CURRENT_USER" | sudo tee /etc/systemd/system/oled.service > /dev/null
        printf "[Unit]\nDescription=OLED Display Service for Moode\nAfter=mpd.service\nRequires=mpd.service\n[Service]\nWorkingDirectory=%s\nExecStartPre=/bin/sleep 15\nExecStart=/usr/bin/node %s/index.js moode\nExecStop=/usr/bin/node %s/off.js\nStandardOutput=null\nType=simple\nUser=%s\n[Install]\nWantedBy=multi-user.target\n" "$PWD" "$PWD" "$PWD" "$USER" | sudo tee /etc/systemd/system/oled.service > /dev/null && sudo systemctl enable oled > /dev/null 2>> install_log.txt
	sudo systemctl enable oled > /dev/null 2>> install_log.txt
        echo "OLED service enabled (/etc/systemd/system/oled.service)"

        echo "OLED service for Moode has been configured with a startup delay. Please reboot if necessary."
        ;;
esac

echo "Installation started at $start_time, finished at $(date +"%T")" >> install_log.txt
