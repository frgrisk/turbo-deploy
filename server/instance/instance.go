package instance

import (
	"context"
	"log"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	"github.com/frgrisk/turbo-deploy/server/models"
)

var ec2Client *ec2.Client

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Printf("unable to load SDK config %v", err)
	}

	ec2Client = ec2.NewFromConfig(cfg)
}

func GetDeployedInstances() ([]models.DeploymentResponse, error) {
	input := &ec2.DescribeInstancesInput{
		Filters: []types.Filter{
			{
				Name:   aws.String("tag:DeployedBy"),
				Values: []string{"turbo-deploy"},
			},
			{
				Name:   aws.String("instance-state-name"),
				Values: []string{"pending", "running", "stopping", "stopped"},
			},
		},
	}

	var deployments []models.DeploymentResponse

	paginator := ec2.NewDescribeInstancesPaginator(ec2Client, input)
	for paginator.HasMorePages() {
		output, err := paginator.NextPage(context.Background())
		if err != nil {
			return nil, err
		}

		for _, reservation := range output.Reservations {
			for _, instance := range reservation.Instances {
				// Retrieve volume IDs from the instance
				var volumeIDs []string
				for _, blockDevice := range instance.BlockDeviceMappings {
					volumeIDs = append(volumeIDs, aws.ToString(blockDevice.Ebs.VolumeId))
				}

				// Check for snapshots and get the latest snapshot ID for the volumes
				snapshotID := "None"
				var latestSnapshot *types.Snapshot
				for _, volumeID := range volumeIDs {
					snapshotInput := &ec2.DescribeSnapshotsInput{
						Filters: []types.Filter{
							{
								Name:   aws.String("volume-id"),
								Values: []string{volumeID},
							},
						},
					}
					snapshots, err := ec2Client.DescribeSnapshots(context.Background(), snapshotInput)
					if err != nil {
						log.Printf("Error retrieving snapshots for volume %s: %v", volumeID, err)
						continue
					}
					for i := range snapshots.Snapshots {
						snapshot := snapshots.Snapshots[i]
						if latestSnapshot == nil || snapshot.StartTime.After(*latestSnapshot.StartTime) {
							latestSnapshot = &snapshots.Snapshots[i]
						}
					}

				}

				if latestSnapshot != nil {
					snapshotID = aws.ToString(latestSnapshot.SnapshotId)
				}
				deployment := models.DeploymentResponse{
					InstanceID:       aws.ToString(instance.InstanceId),
					DeploymentID:     getInstanceTagValue("DeploymentID", instance.Tags),
					Hostname:         getInstanceTagValue("Name", instance.Tags),
					TimeToExpire:     getInstanceTagValue("TimeToExpire", instance.Tags),
					SnapshotID:       snapshotID,
					Ami:              aws.ToString(instance.ImageId),
					ServerSize:       string(instance.InstanceType),
					AvailabilityZone: aws.ToString(instance.Placement.AvailabilityZone),
					Lifecycle:        getLifecycle(instance.InstanceLifecycle),
					Status:           string(instance.State.Name),
				}

				deployments = append(deployments, deployment)
			}
		}
	}

	return deployments, nil
}

func StartInstance(instanceID string) error {
	input := &ec2.StartInstancesInput{
		InstanceIds: []string{instanceID},
	}

	_, err := ec2Client.StartInstances(context.Background(), input)
	if err != nil {
		log.Printf("failed to start instance %s: %v", instanceID, err)
		return err
	}

	log.Printf("Instance %s started successfully", instanceID)
	return nil
}

func StopInstance(instanceID string) error {
	input := &ec2.StopInstancesInput{
		InstanceIds: []string{instanceID},
	}

	_, err := ec2Client.StopInstances(context.Background(), input)
	if err != nil {
		log.Printf("failed to stop instance %s: %v", instanceID, err)
		return err
	}

	log.Printf("Instance %s stopped successfully", instanceID)
	return nil
}

func getInstanceTagValue(tagKey string, tags []types.Tag) string {
	for _, tag := range tags {
		if *tag.Key == tagKey {
			return *tag.Value
		}
	}
	return ""
}

func getLifecycle(lifecycle types.InstanceLifecycleType) string {
	if lifecycle == "" {
		return "on-demand"
	}
	return string(lifecycle)
}

func CaptureInstanceImage(instanceID string) (string, error) {	
	// get tags of the instance
	describeInstanceTags := &ec2.DescribeTagsInput{
		Filters: []types.Filter{
			{
				Name:   aws.String("resource-id"),
				Values: []string{instanceID},
			},
		},
	}

	tagsResult, err := ec2Client.DescribeTags(context.Background(), describeInstanceTags)
	if err != nil {
		log.Printf("failed to describe tags for instance %s: %v", instanceID, err)
		return "", err
	}

	instanceName := "None"
	for _, tags := range tagsResult.Tags {
		if *tags.Key == "Name" {
			instanceName = *tags.Value
		}
	}

	// check if an image for that instance already exists
	filter := []types.Filter{
		{
			Name:   aws.String("name"),
			Values: []string{instanceName},
		},
		{
			Name: aws.String("is-public"),
			Values: []string{"false"},
		},
	}

	imageResult, err := getImage(filter)
	if err != nil {
		log.Printf("failed to resolve image for instance %s: %v", instanceID, err)
		return "", err
	}

	// if it exists deregister it
	if len(imageResult.Images) == 0 {
		log.Printf("No images returned for deregistering")
	} else {
		describeDeregisterImage := &ec2.DeregisterImageInput{
			ImageId: imageResult.Images[0].ImageId,
		}
		log.Printf("The id of the image is %s, deregistering...", *imageResult.Images[0].ImageId)
		_, err := ec2Client.DeregisterImage(context.Background(), describeDeregisterImage)
		if err != nil {
			log.Printf("failed to deregister image for instance %s: %v", instanceID, err)
			return "", err
		}
	}

	// snapshot the instance
	imageInput := &ec2.CreateImageInput{
		InstanceId: aws.String(instanceID),
		Name: aws.String(instanceName),
		TagSpecifications: []types.TagSpecification{
			{
				ResourceType: types.ResourceType("image"),
				Tags: []types.Tag{
					{
						Key: aws.String("DeployedBy"),
						Value: aws.String("turbo-deploy"),
					},
				},
			},
		},
	}
	result, err := ec2Client.CreateImage(context.Background(), imageInput)
	if err != nil {
		log.Printf("failed to create image for instance %s: %v", instanceID, err)
		return "", err
	}

	log.Printf("Image for instance %s created successfully: %s", instanceID, aws.ToString(result.ImageId))
	return aws.ToString(result.ImageId), nil
}

func GetAvailableAmis(amilist []string) ([]string, error) {
	// check if an image for that instance already exists
	filter := []types.Filter{
		{
			Name: aws.String("is-public"),
			Values: []string{"false"},
		},
		{
			Name:   aws.String("tag:DeployedBy"),
			Values: []string{"turbo-deploy"},
		},
	}

	imageResult, err := getImage(filter)
	if err != nil {
		log.Printf("failed to retrieve images: %v", err)
	}

	// if it exists grab it
	if len(imageResult.Images) == 0 {
		log.Printf("No images returned for extra listing")
	} else {
		for i := range imageResult.Images {
			image := imageResult.Images[i]
			log.Printf("Image %s found, appending to the list...", *image.ImageId)
			amilist = append(amilist, *image.ImageId)
		}
	}

	return amilist, nil
}

func getImage(filter []types.Filter) (*ec2.DescribeImagesOutput, error) {
	describeInstanceImage := &ec2.DescribeImagesInput{
		Filters: filter,
	}

	imageResult, err := ec2Client.DescribeImages(context.Background(), describeInstanceImage)
	if err != nil {
		return nil,err
	}

	return imageResult, nil
}