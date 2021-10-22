#!/bin/bash

# Enable bash auto-completion
source ~/.bashrc

# Copy the cached node_modules to share them with the host
# Issue reference: https://www.reddit.com/r/docker/comments/915gxp/making_a_node_containers_node_modules_accessible/
cp -r /install/node_modules/. /code/node_modules/
cp /install/package-lock.json /code/package-lock.json

make dev
