#!/bin/sh

# Function to install dependencies for Volumio
install_dep_volumio() {
    if apt-get -qq install build-essential > /dev/null 2>&1; then
        echo "Build-essential package is installed."
    else
        printf "This version of Volumio lacks some dependencies for software compilation.\nTrying to workaround using this technique : https://community.volumio.org/t/cannot-install-build-essential-package/46856/16 ...\n"
        if bash Workaround_BuildEssentials.sh > /dev/null 2>> install_log.txt; then
            echo "... OK"
            return 1
        else
            echo "... Failed again. The OLED display will not be installed."
            exit 1
        fi
    fi
}

# Main installation script
case "$1" in
    'volumio')
        CURRENT_USER=$(whoami)
        start_time="$(date +"%T")"
        echo "* Installing: Quadify OLED#2" > install_log.txt
        install_dep_volumio
        # Installing npm dependencies
        for package in async i2c-bus pi-spi onoff date-and-time socket.io-client@2.1.1; do
            sudo -u volumio npm install "$package" > /dev/null 2>> install_log.txt
        done

        # Enable spi-dev module to allow hardware interfacing
        echo "spi-dev" | sudo tee -a /etc/modules > /dev/null
        echo "dtparam=spi=on" | sudo tee -a /boot/userconfig.txt > /dev/null

        # Ensure SPI buffer size is set
        if [ ! -f "/etc/modprobe.d/spidev.conf" ] || ! grep -q 'bufsiz=8192' /etc/modprobe.d/spidev.conf; then
            echo "options spidev bufsiz=8192" | sudo tee -a /etc/modprobe.d/spidev.conf > /dev/null
        fi

        # Register & enable OLED service
        printf "[Unit]\nDescription=OLED Display Service\nAfter=volumio.service\n[Service]\nWorkingDirectory=%s\nExecStart=/usr/bin/node %s/index.js volumio\nExecStop=/usr/bin/node %s/off.js\nStandardOutput=null\nType=simple\nUser=volumio\n[Install]\nWantedBy=multi-user.target" "$PWD" "$PWD" "$PWD" | sudo tee /etc/systemd/system/oled.service > /dev/null
        sudo systemctl enable oled > /dev/null 2>> install_log.txt
        echo "OLED service enabled (/etc/systemd/system/oled.service)"

        # Start service if spidev is loaded
        if lsmod | grep -q "spidev"; then
            sudo systemctl start oled
            echo "Display should turn on."
            echo "*End of installation: Quadify OLED#2 (spidev module is already loaded, so no reboot is required)"
        else
            echo "*End of installation: Quadify OLED#2 (spidev module is NOT loaded: a reboot is required)"
        fi

        echo "Started at $start_time, finished at $(date +"%T")" >> install_log.txt
        exit 0
        ;;

    'moode')
        CURRENT_USER=$(whoami)
        start_time="$(date +"%T")"
        echo "* Installing: Quadify OLED#2" > install_log.txt
        # Installing npm dependencies
        sudo -u "$CURRENT_USER" npm install async i2c-bus pi-spi onoff date-and-time socket.io-client > /dev/null 2>> install_log.txt

        # Enable spi-dev module to allow hardware interfacing
        echo "spi-dev" | sudo tee -a /etc/modules > /dev/null
        echo "dtparam=spi=on" | sudo tee -a /boot/config.txt > /dev/null

        # Ensure SPI buffer size is set
        if [ ! -f "/etc/modprobe.d/spidev.conf" ] || ! grep -q 'bufsiz=8192' /etc/modprobe.d/spidev.conf; then
            echo "options spidev bufsiz=8192" | sudo tee -a /etc/modprobe.d/spidev.conf > /dev/null
        fi

        # Register & enable OLED service
        printf "[Unit]\nDescription=OLED Display Service\nAfter=mpd.service\nRequires=mpd.service\n[Service]\nWorkingDirectory=%s\nExecStart=/usr/bin/node %s/index.js moode\nExecStop=/usr/bin/node %s/off.js\nStandardOutput=null\nType=simple\nUser=%s\n[Install]\nWantedBy=multi-user.target" "$PWD" "$PWD" "$PWD" "$CURRENT_USER" | sudo tee /etc/systemd/system/oled.service > /dev/null
        sudo systemctl enable oled > /dev/null 2>> install_log.txt
        echo "OLED service enabled (/etc/systemd/system/oled.service)"

        # Start service if spidev is loaded
        if lsmod | grep -q "spidev"; then
            sudo systemctl start oled
            echo "Display should turn on, if not give it a reboot."
            echo "*End of installation: Quadify OLED#2 (spidev module is already loaded, so no reboot is required)"
        else
            echo "*End of installation: Quadify OLED#2 (spidev module is NOT loaded: a reboot is required)"
        fi

        echo "Started at $start_time, finished at $(date +"%T")" >> install_log.txt
        exit 0
        ;;
esac
