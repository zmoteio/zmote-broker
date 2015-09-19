# zmote-broker

This runs the MQTT broker used by zmote for external communication from and to the widget.

We use [Mosca][http://www.mosca.io/] to create the broker and handle only authentication.  

[Mosca][http://www.mosca.io/] also includes a built in HTTP server which we use to serve the OTA and filesystem updates to the widgets.  This is not strictly necessary -- any file server would do -- but quite convinient, so we have it enabled.

## Auth Notes

Widget auth credentials come straight from the associated MongoDB collection.  Authenticated widgets are allowed to publish and subsribe to only those topics that are allowed to them (see the [API documentation][1] for details).

[1]: https://github.com/zmoteio/zmote-server/blob/master/README.md

Additionally, the server ([zmote-server][2]) authenticates itself using the same auth credentials as those needed for MongoDB access.  Once again, this is a matter mainly of convinience.  Both parties need direct access to the DB anyhow, and must necessarily have these set of credentials with them.  They might as well use it to authenticate themselves to each other.

[2]:  https://github.com/zmoteio/zmote-server
