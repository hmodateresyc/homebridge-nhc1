# homebridge-nhc1
Homebridge plugin for Niko Home Control

# Install
     npm install -g homebridge-nhc1

[Configuration example](config.json)

# Description

This plugin loads your entire configuration from your local Niko Home Control v1 server (not tested on v2).

It supports managing `Lights`, `Dimmers`, and `Blinds`.

Blinds have a default operation time of 30 seconds, which can be customized individually in the configuration.

You can also exclude specific IDs from accessories, for example, to exclude scenes.
