package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	ginadapter "github.com/awslabs/aws-lambda-go-api-proxy/gin"
	"github.com/frgrisk/turbo-deploy/server/db"
	"github.com/frgrisk/turbo-deploy/server/decode"
	"github.com/frgrisk/turbo-deploy/server/instance"
	"github.com/frgrisk/turbo-deploy/server/models"
	"github.com/frgrisk/turbo-deploy/server/timeutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

var (
	r         *gin.Engine // Declare r at the package level
	ginLambda *ginadapter.GinLambda
)

func init() {
	gin.SetMode(gin.ReleaseMode)
	r = gin.Default()

	// // construct hostname for cors
	// domainEnv := os.Getenv("ROUTE53_DOMAIN_NAME")
	// hostEnv := os.Getenv("WEBSERVER_HOSTNAME")
	// httpPortEnv := os.Getenv("WEBSERVER_HTTP_PORT")
	// httpsPortEnv := os.Getenv("WEBSERVER_HTTPS_PORT")
	// fullName := fmt.Sprintf("%s.%s", hostEnv, domainEnv)

	// // setup allowed origins
	// config := cors.DefaultConfig()
	// config.AllowOrigins = []string{fmt.Sprintf("http://%s:%s", fullName, httpPortEnv), fmt.Sprintf("https://%s:%s", fullName, httpsPortEnv), fmt.Sprintf("https://%s", fullName), fmt.Sprintf("https://%s", fullName)}
	// r.Use(cors.New(config))

	SetupRoutes(r)
	ginLambda = ginadapter.New(r)
}

func Start() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Printf("Server listening on port %s...\n", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}

func Handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return ginLambda.ProxyWithContext(ctx, req)
}

func SetupRoutes(r *gin.Engine) {
	// EC2 Instance Request Management
	r.POST("/instance-request", CreateInstanceRequest)
	r.GET("/instance-request/:id", GetInstanceRequest)
	r.DELETE("/instance-request/:id", DeleteInstanceRequest)
	r.DELETE("/instance-requests", DeleteAllInstanceRequests)
	r.PUT("/instance-request/:id", UpdateInstanceRequest)

	// Deployed EC2 Instances
	r.GET("/deployments", GetDeployedRequest)
	r.POST("/start-instance/:region/:id", StartInstanceRequest)
	r.POST("/stop-instance/:region/:id", StopInstanceRequest)

	// AWS Data requests
	r.GET("/awsdata", GetAWSData)

	// Capture instance Ami
	r.PUT("/instance-ami/:id", CaptureInstanceAMI)
	r.GET("/instance-ami/:id", CheckAMILimit)
	r.DELETE("/instance-ami/:id", DeleteInstanceAMI)
}

func CreateInstanceRequest(c *gin.Context) {
	var req models.Payload

	err := c.BindJSON(&req)
	if err != nil {
		if err := c.AbortWithError(http.StatusInternalServerError, err); err != nil {
			log.Printf("Failed to abort with error: %v", err)
		}
		return
	}

	// get hostname and concat with domain
	domainEnv := os.Getenv("ROUTE53_DOMAIN_NAME")
	hostname := req.Hostname + "." + domainEnv

	// Convert request to DynamoDBData struct
	data := models.DynamoDBData{
		ID:                uuid.New().String()[:8],
		Ami:               req.Ami,
		ServerSize:        req.ServerSize,
		Hostname:          hostname,
		Region:            req.Region,
		CreationUser:      req.CreationUser,
		Lifecycle:         req.Lifecycle,
		SnapShot:          req.SnapShot,
		ContentDeployment: req.ContentDeployment,
		UserData:          req.UserData,
	}

	if req.TTLValue > 0 && req.TTLUnit != "" {
		ttl, err := timeutil.CalculateTTL(req.TTLValue, req.TTLUnit)
		if err != nil {
			log.Printf("Failed to calculate TTL: %v", err)
			return
		}
		data.TimeToExpire = ttl
	}

	record, err := db.SaveRecord(data)
	if err != nil {
		if errors.Is(err, db.ErrHostnameExists) {
			c.JSON(http.StatusConflict, gin.H{"error": "Hostname already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save record"})
		return
	}

	response := models.Response{ReturnedResponse: record}
	c.JSON(http.StatusCreated, response)
}

const pathParameterName = "id"

func GetInstanceRequest(c *gin.Context) {
	id := c.Param(pathParameterName)
	record, err := db.GetRecord(id)
	if err != nil {
		if errors.Is(err, db.ErrURLNotFound) {
			if err := c.AbortWithError(http.StatusNotFound, err); err != nil {
				log.Printf("Failed to abort with error: %v", err)
			}

			return
		}
		if err := c.AbortWithError(http.StatusInternalServerError, err); err != nil {
			log.Printf("Failed to abort with error: %v", err)
		}
		return
	}

	// remove domain from hostname
	domainEnv := os.Getenv("ROUTE53_DOMAIN_NAME")
	record.Hostname = strings.TrimSuffix(record.Hostname, "."+domainEnv)

	c.JSON(http.StatusOK, record)
}

func UpdateInstanceRequest(c *gin.Context) {
	// needs some change and fix here
	var req models.Payload

	err := c.BindJSON(&req)
	if err != nil {
		if err := c.AbortWithError(http.StatusInternalServerError, err); err != nil {
			log.Printf("Failed to abort with error: %v", err)
		}
		return
	}

	id := c.Param(pathParameterName)
	log.Println("update request for id:", id)

	// get hostname and concat with domain
	domainEnv := os.Getenv("ROUTE53_DOMAIN_NAME")
	hostname := req.Hostname + "." + domainEnv

	// Convert request to DynamoDBData struct
	data := models.DynamoDBData{
		ID:                id,
		Ami:               req.Ami,
		ServerSize:        req.ServerSize,
		Hostname:          hostname,
		Region:            req.Region,
		CreationUser:      req.CreationUser,
		Lifecycle:         req.Lifecycle,
		SnapShot:          req.SnapShot,
		ContentDeployment: req.ContentDeployment,
		UserData:          req.UserData,
	}

	if req.TTLValue > 0 && req.TTLUnit != "" {
		ttl, err := timeutil.CalculateTTL(req.TTLValue, req.TTLUnit)
		if err != nil {
			log.Printf("Failed to calculate TTL: %v", err)
			return
		}
		data.TimeToExpire = ttl
	}

	err = db.UpdateRecord(id, data)
	if err != nil {
		if errors.Is(err, db.ErrURLNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Record not found."})
			return
		}
		if errors.Is(err, db.ErrHostnameExists) {
			c.JSON(http.StatusConflict, gin.H{"error": "Hostname already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save record"})
		return
	}

	log.Println("successfully updated record for", id)
	c.Status(http.StatusNoContent)
}

func DeleteInstanceRequest(c *gin.Context) {
	id := c.Param(pathParameterName)

	log.Println("delete request for id", id)

	err := db.DeleteRecord(id)
	if err != nil {
		if errors.Is(err, db.ErrURLNotFound) {
			if err := c.AbortWithError(http.StatusNotFound, err); err != nil {
				log.Printf("Failed to abort with error: %v", err)
			}
			return
		}
		if err := c.AbortWithError(http.StatusInternalServerError, err); err != nil {
			log.Printf("Failed to abort with error: %v", err)
		}
		return
	}

	log.Println("successfully deleted", id)
	c.Status(http.StatusNoContent)
}

func DeleteAllInstanceRequests(c *gin.Context) {
	err := db.ClearAllRecords()
	if err != nil {
		if errors.Is(err, db.ErrURLNotFound) {
			if err := c.AbortWithError(http.StatusNotFound, err); err != nil {
				log.Printf("Failed to abort with error: %v", err)
			}
			return
		}
		if err := c.AbortWithError(http.StatusInternalServerError, err); err != nil {
			log.Printf("Failed to abort with error: %v", err)
		}
		return
	}
	log.Println("successfully deleted")
	c.Status(http.StatusNoContent)
}

func GetAWSData(c *gin.Context) {
	// read env variable
	deploymentEnv := os.Getenv("DEPLOYMENT_CONFIG")
	userdataEnv := os.Getenv("USER_SCRIPTS")

	config := models.RegionConfig{}

	decodedDeploymentEnv, _ := decode.Base64Gzip(deploymentEnv)

	// get deployment configuration
	err := json.Unmarshal([]byte(decodedDeploymentEnv), &config)
	if err != nil {
		log.Printf("Error parsing environment variable: %v", err)
		abortWithLog(c, http.StatusInternalServerError, err)
		return
	}

	// Append snapshot filter to the map
	mandatoryFilters := []types.Filter{
		{
			Name:   aws.String("is-public"),
			Values: []string{"false"},
		},
		{
			Name:   aws.String("tag:DeployedBy"),
			Values: []string{"turbo-deploy"},
		},
		{
			Name:   aws.String("state"),
			Values: []string{"available"},
		},
	}

	for regionName, region := range config {
		region.AMIFilters["snapshot-ami"] = mandatoryFilters
		config[regionName] = region
	}

	response := models.RegionConfigResponse{}
	for regionName, region := range config {
		amis, err := instance.GetAvailableAmis(region.AMIFilters, regionName)
		if err != nil {
			log.Printf("Failed to get AMIs for region %s: %v", regionName, err)
			abortWithLog(c, http.StatusInternalServerError, err)
			return
		}

		response[regionName] = models.RegionResponse{
			Ami:           amis,
			InstanceTypes: region.InstanceTypes,
		}
	}

	var userScripts []string
	err = json.Unmarshal([]byte(userdataEnv), &userScripts)
	if err != nil {
		log.Printf("Error parsing user scripts: %v", err)
		abortWithLog(c, http.StatusInternalServerError, err)
		return
	}

	c.JSON(http.StatusOK, models.LaunchResponse{
		Regions:     response,
		UserScripts: userScripts,
	})
}

func abortWithLog(c *gin.Context, statusCode int, err error) {
	if abortErr := c.AbortWithError(statusCode, err); abortErr != nil {
		//nolint:gosec
		log.Printf("Failed to abort with status %d: %v", statusCode, abortErr)
	}
}

func GetEC2InstanceTypes(ctx context.Context) ([]string, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		log.Printf("Failed to load AWS SDk Config: %v", err)
		return nil, err
	}

	ec2Client := ec2.NewFromConfig(cfg)

	input := &ec2.DescribeInstanceTypesInput{
		Filters: []types.Filter{
			{
				Name:   aws.String("processor-info.supported-architecture"),
				Values: []string{"x86_64"},
			},
		},
	}

	response, err := ec2Client.DescribeInstanceTypes(ctx, input)
	if err != nil {
		log.Printf("Failed to describe EC2 instance types: %v", err)
		return nil, err
	}

	instanceTypes := make([]string, 0, len(response.InstanceTypes))
	for _, it := range response.InstanceTypes {
		instanceTypes = append(instanceTypes, string(it.InstanceType))
	}

	return instanceTypes, nil
}

func GetDeployedRequest(c *gin.Context) {
	instances, err := instance.GetDeployedInstances()
	if err != nil {
		log.Printf("Failed to get deployed instances: %v", err)
		if abortErr := c.AbortWithError(http.StatusInternalServerError, err); abortErr != nil {
			log.Printf("Failed to abort with error: %v", abortErr)
		}
		return
	}

	c.JSON(http.StatusOK, instances)
}

func StartInstanceRequest(c *gin.Context) {
	instanceID := c.Param(pathParameterName)
	region := c.Param("region")

	if err := instance.StartInstance(instanceID, region); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusOK)
}

func StopInstanceRequest(c *gin.Context) {
	instanceID := c.Param(pathParameterName)
	region := c.Param("region")

	if err := instance.StopInstance(instanceID, region); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusOK)
}

func CheckAMILimit(c *gin.Context) {
	maxAMIsAllowed := 3

	instanceID := c.Param(pathParameterName)
	region := c.Query("region")
	log.Println("capture instance image request for instance:", instanceID)

	// check if an image for that instance already exists
	filter := []types.Filter{
		{
			Name:   aws.String("source-instance-id"),
			Values: []string{instanceID},
		},
		{
			Name:   aws.String("is-public"),
			Values: []string{"false"},
		},
	}

	imageResult, err := instance.GetImage(region, filter)
	if err != nil {
		log.Printf("failed to resolve image for instance %s: %v", instanceID, err)
	}

	if len(imageResult.Images) >= maxAMIsAllowed {
		// Sort images by creation date to find the oldest (ascending order)
		sort.Slice(imageResult.Images, func(i, j int) bool {
			timeI, _ := time.Parse(time.RFC3339, *imageResult.Images[i].CreationDate)
			timeJ, _ := time.Parse(time.RFC3339, *imageResult.Images[j].CreationDate)
			return timeI.Before(timeJ) // Oldest first
		})

		oldestImage := imageResult.Images[0]
		oldestImageID := *oldestImage.ImageId
		oldestImageDate := *oldestImage.CreationDate
		oldestImageName := aws.ToString(oldestImage.Name)
		amiLimitHit := true

		c.JSON(http.StatusOK, gin.H{
			"oldest_image_id":   oldestImageID,
			"oldest_image_name": oldestImageName,
			"oldest_image_date": oldestImageDate,
			"ami_limit_hit":     amiLimitHit,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ami_limit_hit": false,
	})
}

func DeleteInstanceAMI(c *gin.Context) {
	recordID := c.Param(pathParameterName)
	region := c.Query("region")
	imageID := c.Query("image_id")

	log.Println("delete ami request for id:", recordID)

	log.Printf("Attempting to delete image with ID: %s", imageID)

	log.Printf("The value of region is: %v", region)

	if err := instance.DeregisterImage(imageID, region); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusOK)
}

func CaptureInstanceAMI(c *gin.Context) {
	var req models.Payload

	err := c.BindJSON(&req)
	if err != nil {
		if err := c.AbortWithError(http.StatusInternalServerError, err); err != nil {
			log.Printf("Failed to abort with error: %v", err)
		}
		return
	}

	id := c.Param(pathParameterName)
	log.Println("create ami request for record:", id)

	req.Region = strings.TrimRight(req.Region, "abcdefghijklmnopqrstuvwxyz")

	var amiID string
	if amiID, err = instance.CaptureInstanceImage(req.InstanceID, req.Region); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Print("After snapshot")

	timeToLive, err := strconv.ParseInt(req.TimeToExpire, 10, 64)
	if err != nil {
		log.Printf("Failed to parse ttl with error %v", err)
	}

	// Convert request to DynamoDBData struct
	data := models.DynamoDBData{
		ID:                id,
		Ami:               req.Ami,
		ServerSize:        req.ServerSize,
		Hostname:          req.Hostname,
		Region:            req.Region,
		CreationUser:      req.CreationUser,
		Lifecycle:         req.Lifecycle,
		SnapShot:          amiID,
		ContentDeployment: req.ContentDeployment,
		TimeToExpire:      timeToLive,
		UserData:          req.UserData,
	}

	// Update the DynamoDB row to include the captured snapshot ID
	if err := db.UpdateRecord(id, data); err != nil {
		log.Printf("Failed to update snapshot ID: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update snapshot ID"})
		return
	}
	c.Status(http.StatusOK)
}
