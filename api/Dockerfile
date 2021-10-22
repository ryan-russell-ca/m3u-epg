FROM amazonlinux:2 AS base

RUN curl -sL https://rpm.nodesource.com/setup_17.x | bash
RUN yum -y install nodejs make bash-completion unzip less

FROM base AS devdependencies

# Add environment vars for development mode
ENV NODE_ENV=development

# Cache folder for node_modules
# This cache is needed for the dev entrypoint in order to share the container node_modules with the host
# Issue reference: https://www.reddit.com/r/docker/comments/915gxp/making_a_node_containers_node_modules_accessible/
WORKDIR /install
COPY package*.json ./

RUN npm install --unsafe-perm=true --depth 0

FROM devdependencies AS development 

# Bash completion useful in dev to aucomplete command from the Makefile
RUN source /etc/profile.d/bash_completion.sh
RUN echo -e "complete -W \"\`grep -oE '^[a-zA-Z0-9_-]+:([^=]|$)' Makefile | sed 's/[^a-zA-Z0-9_-]*$//'\`\" make\n" >> ~/.bashrc

WORKDIR /code
COPY ./ /code/

# Copy node_modules (the result of `npm install` command) under the /code
# directory structure to make sure the files are found in the expected location.
COPY --from=devdependencies /install/node_modules ./node_modules

##
## For releases
##
FROM development AS release
ENV NODE_ENV=production
