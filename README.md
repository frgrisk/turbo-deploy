# turbo-deploy

## Description

Turbo Deploy is a web application that can be utilized to rapidly deploy servers/instances in AWS that can be used by the user. While this repository stores the code that runs Turbo Deploy, the [terraform-aws-turbo-deploy](https://github.com/frgrisk/terraform-aws-turbo-deploy) repository is a Terraform module that contains the code that builds the AWS infrastructure that Turbo runs on.

Before starting with this repository, the user needs to build the AWS infrastructure first and foremost with the previously mentioned Terraform module. Once that is done, you may proceed with the following instructions.

## Table of Contents

- [Setting up the Web Application](#setting-up-the-web-application)
- [Using Turbo Deploy](#using-turbo-deploy)
- [Create Servers](#create-servers)
- [Server Actions (Stop/Start)](#step-1-stop-server)
- [Server Actions (Edit)](#server-actions-edit)
- [Server Actions (Delete)](#server-actions-delete)
- [Server Actions (Snapshot)](#server-actions-snapshot)
- [Example Usage](#example-usage)

## Setting up the Web Application

The Turbo Deploy Web Application is made with the use of Angular, to set it up the user simply needs to follow these steps:

1. clone this repository

   `git clone git@github.com:frgrisk/turbo-deploy.git`

2. Change to the client directory

   `cd client`

3. Change the url in src/environments/environment.prod.ts to the API gateway that you previously made with the Terraform module

   ```ts
   export const environment = {
     production: true,
     apiBaseUrl: "", //replace with actual url
   };
   ```

4. Run the ng build command

   `ng build configuration --production`

5. You now have the code to the web application generated in dist/turbo-deploy

6. Simply use your web server of choice to host the web application

## Using Turbo Deploy

Once the Turbo Infrastructure and Web Application has been set up, this is how you use Turbo Deploy.

### Create Servers

Setting up a server for your use, allowing you to configure the server to your needs.

![create deployment gif](https://github.com/frgrisk/turbo-deploy/blob/documentation/readme_assets/gifs/createdeployment.gif)

#### Step 1: Click on the New Deployment Button

This will bring you over to the form menu that allows you to choose the settings of your server and deploy it.

#### Step 2: Fill in the create deployment form

You will be presented with a few settings with it being:

- Hostname

  This will be the name of your server, it must be set without any special characters, spaces, or symbols (e.g., @, #, -, \_, etc...)

- Region

  The region where the server you wish to deploy will be placed. At the time of writing this document, this will only be limited to us-east-2.

- AMI Choice

  You will be presented with multiple AMIs (Amazon Machine Image) that you can deploy, this is the type of server that you are deploying. Choose the ones that is relevant to your use case

- Server Size

  This is the size(capability) of your server, the bigger it is the more resources it can commit to running the tasks you have given (more CPU, Memory, etc...).

  For a personal use case it is enough to run it on a t3.medium server size, while bigger ones should only be used if your workload exceeds the server’s capacity.

- Lifecycle

  There are two settings that can be chosen, on-demand and spot. For most use cases, spot is the preferred option as it is more cost-effective, though it means that your server may face interruptions.

  If that is not an option and your use case demands that the server always be up (e.g., client demo, etc...) Then you can choose to deploy an on-demand instance instead.

- Expiry

  This setting configures how long your server will live for, if this is configured then the server will automatically be terminated after the amount of time that you have set has passed. It is useful to ensure that resources are not wasted when they are not in use.

#### Step 3: Return to the main page

After a certain amount of time passes (a few minutes) you can refresh the main page and see that the server you wanted has now been deployed. You can now control the server from this interface.

### Server Actions (Stop/Start)

When your server is not in use or vice versa, then you will need to stop/start your server. Here is how you do so.

![start stop gif](https://github.com/frgrisk/turbo-deploy/blob/documentation/readme_assets/gifs/stopstart.gif)

#### Step 1: Stop Server

Press on the red square button to stop the server. When it is done you can see that the status of the server will change to “stopped.”

#### Step 2: Start Server

Press on the green arrow button to start the server. When it is done you can see the server status change to “running.”

### Server Actions (Edit)

Whenever you want to change the settings of your server (e.g., hostname, time to live, etc...) you may use this functionality. Do note however that only the change of server size and TTL will result in keeping your current server but changing its settings.

Meanwhile, changing the hostname, AMI and lifecycle will result in your server being terminated and a new one being created. What this means is that any work you have done in the previous server will not be migrated over to the new server that you have edited to.

If you want to change the lifecycle of your server and keep the data, you may take a snapshot of your current server and deploy a new one based on the AMI snapshot you have taken.

![edit deployment gif](https://github.com/frgrisk/turbo-deploy/blob/documentation/readme_assets/gifs/editdeployment.gif)

#### Step 1: Press on the edit button

Press on the pencil button in blue to edit the deployment, this will bring you over to the edit deployment form

#### Step 2: Fill in the edit deployment form

The same as in the create server step, simply fill in the form with your desired server settings. Remember that changing the AMI and Lifecycle will result in the complete replacement of your server.

#### Step 3: Return to the main dashboard

After a few minutes, you can refresh the main page and see that the server you have edited has appeared.

### Server Actions (Delete)

Once you no longer have any use for the server, it is recommended that you delete the server by using this functionality. It will take a few minutes, and your server will be removed from the dashboard.

![delete server gif](https://github.com/frgrisk/turbo-deploy/blob/documentation/readme_assets/gifs/terminate.gif)

#### Step 1: Press on the delete button

Press on the trashbin button in red to delete deployment, after a few seconds to minutes you can press on the refresh button and see that the server is gone.

### Server Actions (Snapshot)

Snapshots allow you to capture the state of your server at a specific point in time. This feature is useful for creating backups, recovering from errors, etc. By taking a snapshot, you can revert your server to a previous state if needed.

Currently, each server deployed can only have one AMI snapshot associated with it, so creating a new snapshot on your server that already has an AMI snapshot will result in the previous snapshot being deleted.

![snapshot gif](https://github.com/frgrisk/turbo-deploy/blob/documentation/readme_assets/gifs/snapshot.gif)

#### Step 1: Press on the snapshot button

Press on the camera button in black to start the process of creating an AMI snapshot.

#### Step 2: Take note of snapshot ID

After a minute you can see that the snapshot ID has appeared, take note of this ID to deploy from the AMI you have taken.

#### Step 3: Deploy new server

After a few minutes, you can now see that there is a new AMI that is based on your server, deploying this will give you a new server that is at the same state as your previous server when you took the snapshot.

### Example Usage

After a Server has been deployed, you can access the server through the hostname that has been set simply by copying the hostname and pasting it in your browser.

![example gif](https://github.com/frgrisk/turbo-deploy/blob/documentation/readme_assets/gifs/example.gif)

#### Step 1: Copy Hostname

#### Step 2: Paste in browser

#### Step 3: Arrive at server webpage
