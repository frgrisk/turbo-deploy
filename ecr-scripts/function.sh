#!/bin/bash

function handler() {
    set -ex

    echo "Starting script execution."

    VENV_PATH="/tmp/venv"
    TF_WORKING_DIR="/tmp/terraform"
    TEMPLATES_DIR="/tmp/terraform"
    export CHECKPOINT_DISABLE=1

    echo "Ensuring working directories exist."
    mkdir -p "$TF_WORKING_DIR"
    mkdir -p "$VENV_PATH"


    echo "Copying Terraform configuration to the /tmp working directory."
    cp -a /var/task/* "$TF_WORKING_DIR/"

    echo "Adjusting permissions."
    chmod -R 755 /tmp/venv
    chmod -R 755 /tmp/terraform

    source /var/task/venv/bin/activate

    echo "Changing to the Terraform working directory."
    cd "$TF_WORKING_DIR"

    # Use envsubst to replace variables in the template and save it as main.tf
    envsubst < "$TEMPLATES_DIR/main.tf.tpl" > main.tf

    echo "Initializing Terraform."
    terraform init -input=false -no-color

    echo "Applying Terraform configuration."
    terraform apply -input=false -auto-approve -no-color
}
