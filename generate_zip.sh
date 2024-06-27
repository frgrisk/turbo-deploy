#!/bin/bash

# Check if a directory argument was provided
if [ -n "$1" ]; then
    echo "Changing to directory: $1"
    cd "$1" || exit
fi

# Navigate to the correct directory and execute the commands
cd ../../
make clean
make
mkdir -p modules/turbo-deploy-module/lambda_zip
mv lambda_function.zip modules/turbo-deploy-module/lambda_zip/