#!/bin/bash
set -e  # Exit on any error

# Configuration - modify these variables as needed
S3_BUCKET="turbo-deploy-lambda-zip-bucket"
S3_KEY="lambda/lambda_function.zip"
AWS_REGION="ap-southeast-5"  # Optional: specify region

# Check if S3 bucket exists, create if it doesn't
echo "Checking if S3 bucket exists..."
if aws s3api head-bucket --bucket ${S3_BUCKET} --region ${AWS_REGION} 2>/dev/null; then
    echo "Bucket ${S3_BUCKET} already exists"
else
    echo "Bucket ${S3_BUCKET} does not exist. Creating..."
    aws s3api create-bucket --bucket ${S3_BUCKET} \
    --region ${AWS_REGION} \
    --create-bucket-configuration LocationConstraint=${AWS_REGION}
    
    if [ $? -eq 0 ]; then
        echo "Successfully created bucket ${S3_BUCKET}"
        
        # Enable versioning (recommended for Lambda artifacts)
        echo "Enabling versioning on bucket..."
        aws s3api put-bucket-versioning \
            --bucket ${S3_BUCKET} \
            --versioning-configuration Status=Enabled \
            --region ${AWS_REGION}
        
        echo "Bucket configured successfully"
    else
        echo "Failed to create bucket!"
        exit 1
    fi
fi

# Build the Go binary
echo "Building Lambda function..."
make

# Upload to S3
echo "Uploading lambda_function.zip to S3..."
aws s3 cp ./lambda_function.zip \
    s3://${S3_BUCKET}/${S3_KEY} \
    --region ${AWS_REGION}

# Clean up local zip file
rm ./lambda_function.zip