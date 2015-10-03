#!/bin/sh

if [[ "$1" == "deploy" ]]
then
	echo "Deploying..."
	ssh -l harik_klarsys_com 104.154.71.241 zmote-broker/deploy-server.sh
	exit 0
fi

cd ~/zmote-broker
git pull
sudo forever stop 0
sudo service zmote-broker start
sleep 3
sudo forever list
