#!/bin/bash


APIGW_URL="$1"

if [ -z "$APIGW_URL" ]; then
  echo "Usage: $0 <api-gateway-url>"
  echo "Example: $0 https://xvvlrqk2i6.execute-api.ap-southeast-1.amazonaws.com/Prod/"
  exit 1
fi

# init data
curl -X POST "${APIGW_URL}items/" -d '{"id":"1","name":"Sample test item"}'
curl -X POST "${APIGW_URL}items/" -d '{"id":"2","name":"Second test item"}'

index=0
while true; do
  sleep 1
  ((index++))
  # scenario1: getallitems
  curl -X GET "${APIGW_URL}items/"
  # scenario2: getbyid
  curl -X GET "${APIGW_URL}items/1/"
  # scenario3: putitem
  curl -X POST "${APIGW_URL}items/" -d '{"id":"3","name":"Third test item"}'
done
