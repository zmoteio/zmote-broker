#!/bin/sh

cd ~/zmote-broker
git pull
sudo forever stop 0
sudo service zmote-broker start
sleep 3
sudo forever list
