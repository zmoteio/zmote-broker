#!/bin/sh

sudo npm install -g forever
sudo mkdir /var/run/forever

SERVICE=zmote-broker
DESC="Implements an MQTT and update server for zMote"
TMP_FILE=/tmp/${SERVICE}.conf
INIT_SCRIPT_DEST=/etc/init.d/${SERVICE}

MONGOLAB_URI=`heroku config:get -a zmote MONGOLAB_URI`

cat > ${TMP_FILE} <<EOT
#!/bin/sh
### BEGIN INIT INFO
# Provides:          meetme-server
# Required-Start:    $local_fs $network
# Required-Stop:     $local_fs
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: $SERVICE
# Description:       $DESC
### END INIT INFO# This script is used as the init.d service on the GCE VM

export MONGOLAB_URI="$MONGOLAB_URI"
export SRC_DIR="$PWD"

case "\$1" in
  start)
  exec forever --sourceDir="\$SRC_DIR" -p /var/run/forever start index.js
  ;;

  stop)
  exec forever stop --sourceDir="\$SRC_DIR" index.js
  ;;
esac

exit 0
EOT

#copy to /etc/init.d
sudo cp $TMP_FILE $INIT_SCRIPT_DEST && \
        sudo chmod +x $INIT_SCRIPT_DEST
echo "Copied $TMP_FILE => $INIT_SCRIPT_DEST"
#Install the service
echo "Installing service..."
sudo update-rc.d ${SERVICE} defaults && echo "Success!"

echo "Installation successful!"
echo "User \"sudo service ${SERVICE} start\" to start"
exit 0
