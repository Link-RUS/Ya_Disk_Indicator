#!/usr/bin/env bash

cd "${0%/*}"

if [ -d build ]; then
    rm -rf build
fi

mkdir -p build/{lib,icons,po}
cp src/metadata.json build/metadata.json
cp src/*.js build/
cp src/lib/*.js build/lib/
cp data/*.svg build/icons/
cp po/*.po build/po/