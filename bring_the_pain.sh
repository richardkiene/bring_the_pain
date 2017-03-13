#!/bin/bash
while :
do
    echo "Press [CTRL+C] to stop.."
    curl --insecure --cert-type pem --cert tlscert.pem --key tlskey.pem \
    "https://127.0.0.1:8080/thepain"&
done
