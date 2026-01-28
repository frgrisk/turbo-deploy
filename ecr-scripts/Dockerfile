# Dockerfile
ARG OS=x86-64
FROM --platform=linux/${OS} public.ecr.aws/lambda/provided:al2

ARG TERRAFORM_ARCH=amd64
ARG TERRAFORM_VERSION=1.14.3
ARG TERRAFORM_SHASUM=178b2a602251bb68b94732aceca2cc1023d87597cb83dba92cab31b6689edb4d

# default but allow override
ARG AWS_DEFAULT_REGION=us-east-1

ENV AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION}
ENV TF_DATA_DIR=/tmp

# Install Terraform
RUN yum install -y unzip \
    && curl -fsSL -o /tmp/terraform.zip "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_${TERRAFORM_ARCH}.zip" \
    && echo "${TERRAFORM_SHASUM} /tmp/terraform.zip" | sha256sum -c \
    && unzip -d /usr/local/bin /tmp/terraform.zip \
    && rm /tmp/terraform.zip

# Install Python and pip
RUN yum install -y python3 python3-pip gettext && yum clean all \
    && python3 -m pip install --upgrade pip

WORKDIR /var/task

# Copy your Terraform configuration files to the image
COPY . /var/task

# Install Python dependencies
RUN python3 -m venv venv \
    && . venv/bin/activate && pip3 install -r requirements.txt

ENTRYPOINT [ "/bin/bash", "entrypoint.sh" ]

CMD [ "function.handler" ]
