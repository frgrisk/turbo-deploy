# Makefile to build and package a Go Lambda function

# Set the output binary name
BINARY_NAME=lambda_function

# Set the ZIP file name
ZIP_FILE=lambda_function.zip

# Default make target
all: clean build zip hash

local-build:
	@echo "local compilation"
	go build -o turbo-deploy

run:
	./turbo-deploy serve

build:
	@echo "Compiling code to binary"
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o ${BINARY_NAME} .
	@echo "Renaming binary to 'bootstrap' as required by AWS Lambda"
	mv ${BINARY_NAME} bootstrap

# Create a zip file
zip:
	@echo "Packaging binary and config file into ZIP file"
	zip ${ZIP_FILE} bootstrap config.json
	@echo "Cleanup: Removing temporary 'bootstrap' binary"
	rm bootstrap

# Calculate the source code hash for Terraform
hash:
	@echo "Calculating source code hash for Terraform"
	@openssl dgst -sha256 $(ZIP_FILE) | sed 's/^.* //'

# Clean up ZIP file and binary
clean: 
	@echo "Cleaning ZIP file and binary"
	rm -rf ${ZIP_FILE} ${BINARY_NAME} bootstrap

.PHONY: build zip hash all clean
