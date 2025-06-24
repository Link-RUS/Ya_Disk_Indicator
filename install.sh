#!/usr/bin/env bash

cd "${0%/*}"

EXT_NAME="Yandex Disk Indicator"
EXT_UUID="Ya_Disk_Indicator@pingvin"

echo "Packing extension..."
gnome-extensions pack ./build \
    --extra-source=lib \
    --extra-source=icons \
    --podir=po \
    --force \

if [ $? -ne 0 ]; then 
    echo "Error occur during compilation of Gnome Extension ${EXT_NAME}."
    echo "Press any key to exit..."
    read -n1
    exit $?
fi

echo "Installing extension..."
gnome-extensions install $EXT_UUID.shell-extension.zip --force

if [ $? -ne 0 ]; then 
    read -n1
    exit $?
fi

echo "Gnome Extension $EXT_NAME was succesfully installed."
echo "Restart the shell (or logout) to be able to enable the extension."
echo "Press any key to exit..."
read -n1
exit 0