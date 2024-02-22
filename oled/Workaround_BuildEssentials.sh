#!/bin/bash

# Define the APT sources list file
SRC=/etc/apt/sources.list

# Backup the original sources list in case something goes wrong
cp $SRC $SRC.backup

# Check if 'buster' is not already in the sources list
if ! grep -q 'buster' $SRC; then
    # Add the Debian Buster repositories for package installation
    echo "Adding Buster sources..."
    echo 'deb http://raspbian.raspberrypi.org/raspbian/ buster main contrib non-free rpi' | sudo tee -a $SRC
fi

# Update the package lists
apt update

# Install the required packages
apt -y install binutils libstdc++-6-dev gcc-8 gcc g++-8 g++

# Remove the Buster sources to prevent future compatibility issues
sed -i '/buster/d' $SRC

# Update the package lists after removing the Buster sources
apt update

echo "Installation complete. Buster sources removed."

