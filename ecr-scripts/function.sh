#!/bin/bash

function handler() {
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
    terraform apply -input=false -auto-approve -no-color 2>&1 | tee /tmp/tf_output.log
    tf_exit_code=${PIPESTATUS[0]}

    local sns_topic_arn="${SNS_TOPIC_ARN:-}"
    if [ -n "$sns_topic_arn" ] && [ $tf_exit_code -ne 0 ]; then
        echo "Terraform apply failed. Sending notification to SNS."
        local tf_errors=$(tail -100 /tmp/tf_output.log)
        local subject="Terraform Apply Failed - $(date '+%Y-%m-%d %H:%M:%S')"
        local message="Terraform apply failed with exit code ${tf_exit_code}:${tf_errors}"

        echo "Sending failure notification to SNS topic: $sns_topic_arn"
        aws sns publish \
            --topic-arn "$sns_topic_arn" \
            --subject "$subject" \
            --message "$message" \
            --region "${AWS_REGION_CUSTOM}"
        
        # Return error message to Lambda
        echo "Terraform apply failed with exit code ${tf_exit_code}"
        
        return 1
    fi

    # Return success response
    echo '{"statusCode":200,"body":"Terraform apply completed successfully"}'
}