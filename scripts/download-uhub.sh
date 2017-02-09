#!/usr/bin/env bash
set -eo pipefail
IFS=$'\n\t'

UHUB_VERSION=$(node -pe "require('./package.json').engines.uhub")
UHUB_SCRIPT=./.tmp/uhub-$UHUB_VERSION

echo "Downloading uhub-$UHUB_VERSION..."

# Download Uhub
if [ -f $UHUB_SCRIPT ];
then
    echo "... uhub-$UHUB_VERSION already downloaded."
else
    if [[ -z "$GITHUB_TOKEN" ]]; then
        cat <<EOF
To download uhub, you need to provide the following env:
 - GITHUB_TOKEN
EOF
        exit 1
    fi;

    if [ "$(uname)" == "Darwin" ]; then
        UHUB_DOWNLOAD=uhub_darwin_amd64
    elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
        UHUB_DOWNLOAD=uhub_linux_amd64
    elif [ "$(expr substr $(uname -s) 1 10)" == "MINGW32_NT" ]; then
        UHUB_DOWNLOAD=uhub_windows_amd64.exe
    fi

    github-releases --tag $UHUB_VERSION --filename $UHUB_DOWNLOAD --token $GITHUB_TOKEN download GitbookIO/uhub
    mv $UHUB_DOWNLOAD $UHUB_SCRIPT
    chmod +x $UHUB_SCRIPT
fi
