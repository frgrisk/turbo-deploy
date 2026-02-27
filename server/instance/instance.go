package instance

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	"github.com/frgrisk/turbo-deploy/server/decode"
	"github.com/frgrisk/turbo-deploy/server/models"
	"golang.org/x/sync/errgroup"
)

var ec2Clients map[string]*ec2.Client

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Printf("unable to load SDK config %v", err)
	}

	// region specific-clients
	deploymentEnv := os.Getenv("DEPLOYMENT_CONFIG")

	decodedDeploymentEnv, _ := decode.Base64Gzip(deploymentEnv)

	var regionConfig models.RegionConfig
	err = json.Unmarshal([]byte(decodedDeploymentEnv), &regionConfig)
	if err != nil {
		log.Printf("Error parsing deployment configuration: %v", err)
		return
	}

	ec2Clients = make(map[string]*ec2.Client)
	for regionName := range regionConfig {
		ec2Clients[regionName] = ec2.NewFromConfig(cfg, func(o *ec2.Options) {
			o.Region = regionName
		})
	}
}

func GetDeployedInstances() ([]models.DeploymentResponse, error) {
	g := new(errgroup.Group)
	var mutex sync.Mutex
	var deployments []models.DeploymentResponse

	for regionName, client := range ec2Clients {
		g.Go(func() error {
			results, err := getDeployedInstancesForRegion(regionName, client)
			if err != nil {
				return err
			}
			mutex.Lock()
			defer mutex.Unlock()
			deployments = append(deployments, results...)
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return deployments, nil
}

func getDeployedInstancesForRegion(regionName string, client *ec2.Client) ([]models.DeploymentResponse, error) {
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

	paginator := ec2.NewDescribeInstancesPaginator(client, input)
	for paginator.HasMorePages() {
		output, err := paginator.NextPage(context.Background())
		if err != nil {
			return nil, err
		}

		for _, reservation := range output.Reservations {
			for _, instance := range reservation.Instances {
				filter := []types.Filter{
					{
						Name:   aws.String("source-instance-id"),
						Values: []string{*instance.InstanceId},
					},
					{
						Name:   aws.String("is-public"),
						Values: []string{"false"},
					},
				}

				imageResult, err := GetImage(regionName, filter)
				if err != nil {
					log.Printf("failed to resolve image for instance %s: %v", *instance.InstanceId, err)
					return nil, err
				}

				var imageID string
				if len(imageResult.Images) == 0 {
					imageID = "none"
				} else {
					imageID = *imageResult.Images[0].ImageId
				}

				deployment := models.DeploymentResponse{
					InstanceID:       aws.ToString(instance.InstanceId),
					DeploymentID:     getInstanceTagValue("DeploymentID", instance.Tags),
					Hostname:         getInstanceTagValue("Name", instance.Tags),
					TimeToExpire:     getInstanceTagValue("TimeToExpire", instance.Tags),
					SnapshotID:       imageID,
					Ami:              aws.ToString(instance.ImageId),
					ServerSize:       string(instance.InstanceType),
					AvailabilityZone: aws.ToString(instance.Placement.AvailabilityZone),
					Lifecycle:        getLifecycle(instance.InstanceLifecycle),
					Status:           string(instance.State.Name),
					UserData:         splitUserData(getInstanceTagValue("UserData", instance.Tags)),
				}

				deployments = append(deployments, deployment)
			}
		}
	}

	return deployments, nil
}

func splitUserData(userData string) []string {
	return strings.Split(userData, ",")
}

func StartInstance(instanceID string, region string) error {
	input := &ec2.StartInstancesInput{
		InstanceIds: []string{instanceID},
	}

	_, err := ec2Clients[region].StartInstances(context.Background(), input)
	if err != nil {
		log.Printf("failed to start instance %s: %v", instanceID, err)
		return err
	}

	log.Printf("Instance %s started successfully", instanceID)
	return nil
}

func StopInstance(instanceID string, region string) error {
	input := &ec2.StopInstancesInput{
		InstanceIds: []string{instanceID},
	}

	_, err := ec2Clients[region].StopInstances(context.Background(), input)
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

func CaptureInstanceImage(instanceID string, region string) (string, error) {
	// get tags of the instance
	describeInstanceTags := &ec2.DescribeTagsInput{
		Filters: []types.Filter{
			{
				Name:   aws.String("resource-id"),
				Values: []string{instanceID},
			},
		},
	}

	tagsResult, err := ec2Clients[region].DescribeTags(context.Background(), describeInstanceTags)
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

	// get current time
	now := time.Now()
	date := now.Format(time.DateOnly)
	time := fmt.Sprintf("%d%d%d", now.Hour(), now.Minute(), now.Second())
	formattedName := instanceName + "_" + date + "_" + time

	// snapshot the instance
	imageInput := &ec2.CreateImageInput{
		InstanceId: aws.String(instanceID),
		Name:       aws.String(formattedName),
		TagSpecifications: []types.TagSpecification{
			{
				ResourceType: types.ResourceType("image"),
				Tags: []types.Tag{
					{
						Key:   aws.String("DeployedBy"),
						Value: aws.String("turbo-deploy"),
					},
				},
			},
		},
	}
	result, err := ec2Clients[region].CreateImage(context.Background(), imageInput)
	if err != nil {
		log.Printf("failed to create image for instance %s: %v", instanceID, err)
		return "", err
	}

	log.Printf("Image for instance %s created successfully: %s", instanceID, aws.ToString(result.ImageId))
	return aws.ToString(result.ImageId), nil
}

func GetAvailableAmis(filterMap map[string][]types.Filter, region string) ([]models.AmiAttr, error) {
	g := new(errgroup.Group)
	var amilist []models.AmiAttr
	var mutex sync.Mutex

	for _, filter := range filterMap {
		f := filter
		g.Go(func() error {
			imageResult, err := GetImage(region, f)
			if err != nil {
				log.Printf("failed to retrieve images: %v", err)
				return err
			}

			if len(imageResult.Images) == 0 {
				log.Printf("No images returned for filter group")
			} else {
				sort.Slice(imageResult.Images, func(i, j int) bool {
					timeI, _ := time.Parse(time.RFC3339, *imageResult.Images[i].CreationDate)
					timeJ, _ := time.Parse(time.RFC3339, *imageResult.Images[j].CreationDate)
					return timeI.After(timeJ)
				})
				mutex.Lock()
				defer mutex.Unlock()
				for _, image := range imageResult.Images {
					amilist = append(amilist, models.AmiAttr{
						AmiID:   *image.ImageId,
						AmiName: *image.Name,
					})
				}
			}
			return err
		})
	}

	if err := g.Wait(); err != nil {
		log.Printf("Failed to get available AMIs: %v", err)
		return nil, err
	}

	return amilist, nil
}

func GetImage(region string, filter []types.Filter) (*ec2.DescribeImagesOutput, error) {
	describeInstanceImage := &ec2.DescribeImagesInput{
		Filters: filter,
	}

	return ec2Clients[region].DescribeImages(context.Background(), describeInstanceImage)
}

func DeregisterImage(imageID string, region string) error {
	describeDeregisterImage := &ec2.DeregisterImageInput{
		ImageId:                   aws.String(imageID),
		DeleteAssociatedSnapshots: aws.Bool(true),
	}

	_, err := ec2Clients[region].DeregisterImage(context.Background(), describeDeregisterImage)
	if err != nil {
		log.Printf("failed to deregister image %s: %v", imageID, err)
		return err
	}

	log.Printf("Image %s deregistered successfully", imageID)
	return nil
}
