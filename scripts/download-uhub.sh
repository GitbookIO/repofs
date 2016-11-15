#!/usr/bin/env bash
set -eo pipefail
IFS=$'\n\t'

UHUB_VERSION=2.5.6

# Download Uhub
if [ "$(uname)" == "Darwin" ]; then
    UHUB_NAME=uhub_darwin_amd64
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    UHUB_NAME=uhub_linux_amd64
elif [ "$(expr substr $(uname -s) 1 10)" == "MINGW32_NT" ]; then
    UHUB_NAME=uhub_windows_amd64.exe
fi

if [ -f uhub ];
then
    echo "uhub already exist."
else
    echo "Downloading uhub"

    if [[ -z "$GITHUB_TOKEN" ]]; then
        cat <<EOF
To download uhub, you need to provide the following env:
 - GITHUB_TOKEN
EOF
        exit 1
    fi;

    github-releases --tag $UHUB_VERSION --filename $UHUB_NAME --token $GITHUB_TOKEN download GitbookIO/uhub
    mv $UHUB_NAME uhub
    chmod +x uhub
fi
