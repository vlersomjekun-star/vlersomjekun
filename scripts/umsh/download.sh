#!/bin/sh
# Shkarkon regjistrin publik te UMSH (1 kerkese e vetme)
curl -L -o "$(dirname "$0")/regjistri.html" "https://urdhrimjekeve.org.al/regjistri-i-mjekeve.html"
