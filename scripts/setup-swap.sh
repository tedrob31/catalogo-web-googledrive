#!/bin/bash
# Script to add 4GB Swap Space
# Usage: sudo ./setup-swap.sh

echo "Checking for existing swap..."
sudo swapon --show

if [ $(sudo swapon --show | wc -l) -gt 0 ]; then
    echo "Swap already exists. Skipping."
    exit 0
fi

echo "Creating 4GB Swap File..."
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

echo "Making Swap Permanent..."
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

echo "Tuning Swappiness (Preferred 10 for Servers)..."
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

echo "Done! Current Swap:"
sudo swapon --show
sudo free -h
