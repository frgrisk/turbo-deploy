package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

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
	"github.com/gin-contrib/cors"
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

	// construct hostname for cors
	domainEnv := os.Getenv("ROUTE53_DOMAIN_NAME")
	hostEnv := os.Getenv("WEBSERVER_HOSTNAME")
	httpPortEnv := os.Getenv("WEBSERVER_HTTP_PORT")
	httpsPortEnv := os.Getenv("WEBSERVER_HTTPS_PORT")
	fullName := fmt.Sprintf("%s.%s", hostEnv, domainEnv)

	// setup allowed origins
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{fmt.Sprintf("http://%s:%s", fullName, httpPortEnv), fmt.Sprintf("https://%s:%s", fullName, httpsPortEnv), fmt.Sprintf("https://%s", fullName), fmt.Sprintf("https://%s", fullName)}
	r.Use(cors.New(config))

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
	r.POST("/start-instance/:id", StartInstanceRequest)
	r.POST("/stop-instance/:id", StopInstanceRequest)

	// AWS Data requests
	r.GET("/awsdata", GetAWSData)

	// Capture instance Snapshot
	r.PUT("/capture-instance-snapshot/:id", CaptureInstanceSnapshot)
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
	configEnv := os.Getenv("MY_AMI_ATTR")
	regionEnv := os.Getenv("MY_REGION")
	filterEnv := os.Getenv("AMI_FILTERS")
	userdataEnv := os.Getenv("USER_SCRIPTS")

	tempConfig := models.TempConfig{}
	config := models.Config{}

	// get list of userdata scripts from the env
	err := json.Unmarshal([]byte(userdataEnv), &config.UserData)
	if err != nil {
		log.Printf("Error parsing environment variable: %v", err)
		abortWithLog(c, http.StatusInternalServerError, err)
		return
	}

	// get list of AMIs from the env
	err = json.Unmarshal([]byte(configEnv), &tempConfig)
	if err != nil {
		log.Printf("Error parsing environment variable: %v", err)
		abortWithLog(c, http.StatusInternalServerError, err)
		return
	}

	// Remove empty strings from the Ami config and add any amis to amilist
	i := 0
	var amilist []models.AmiAttr
	for _, ami := range tempConfig.Ami {
		if ami != "" {
			tempConfig.Ami[i] = ami
			amiID := models.AmiAttr{
				AmiID: ami,
			}
			amilist = append(amilist, amiID)
			i++
		}
	}

	amilist = instance.GetAMIName(amilist)

	decodedFilter, _ := decode.Base64Gzip(filterEnv)

	var filterMap map[string][]types.Filter

	// get list of AMIs from the filters provided by user
	err = json.Unmarshal([]byte(decodedFilter), &filterMap)
	if err != nil {
		log.Printf("Error parsing environment variable: %v", err)
		abortWithLog(c, http.StatusInternalServerError, err)
		return
	}

	// manually add mandatory filter to the map
	filterMap["snapshot-ami"] = []types.Filter{
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

	// add the amis retrieved based on filters given
	amilist, err = instance.GetAvailableAmis(amilist, filterMap)
	if err != nil {
		log.Printf("Failed to get list of AMIs: %v", err)
		return
	}

	config.Region = regionEnv
	config.ServerSizes = tempConfig.ServerSizes
	config.Ami = amilist

	c.JSON(http.StatusOK, config)
}

func abortWithLog(c *gin.Context, statusCode int, err error) {
	if abortErr := c.AbortWithError(statusCode, err); abortErr != nil {
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
	ctx := c.Request.Context() // Extract the standard context from Gin's context
	if err := PopulateSpotTagResponse(ctx); err != nil {
		log.Printf("Failed to populate tags for deployed instances: %v", err)
		if abortErr := c.AbortWithError(http.StatusInternalServerError, err); abortErr != nil {
			log.Printf("Failed to abort with error: %v", abortErr)
		}
		return
	}

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

	if err := instance.StartInstance(instanceID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusOK)
}

func StopInstanceRequest(c *gin.Context) {
	instanceID := c.Param(pathParameterName)

	if err := instance.StopInstance(instanceID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusOK)
}

func PopulateSpotTagResponse(ctx context.Context) error {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		log.Printf("Failed to load AWS SDk Config: %v", err)
		return err
	}

	ec2Client := ec2.NewFromConfig(cfg)

	// Get all EC2 instances
	instancesResp, err := ec2Client.DescribeInstances(ctx, &ec2.DescribeInstancesInput{})
	if err != nil {
		log.Printf("error describing EC2 instances: %v", err)
		return err
	}

	// Get all Spot instance requests
	spotResp, err := ec2Client.DescribeSpotInstanceRequests(ctx, &ec2.DescribeSpotInstanceRequestsInput{})
	if err != nil {
		log.Printf("error describing EC2 spot instances: %v", err)
		return err
	}

	// Create a map to associate spot instance request IDs with their tags
	requestTags := make(map[string][]types.Tag)
	for _, request := range spotResp.SpotInstanceRequests {
		requestTags[*request.SpotInstanceRequestId] = request.Tags
	}

	for _, reservation := range instancesResp.Reservations {
		for _, instance := range reservation.Instances {
			// check if the instance is a spot instance and has a corresponding spot req
			if instance.InstanceLifecycle == types.InstanceLifecycleTypeSpot && instance.SpotInstanceRequestId != nil {
				spotRequestID := *instance.SpotInstanceRequestId
				if tags, ok := requestTags[spotRequestID]; ok {
					// Check if instance already has tags; if not, apply them
					if len(instance.Tags) == 0 {
						_, err := ec2Client.CreateTags(ctx, &ec2.CreateTagsInput{
							Resources: []string{*instance.InstanceId},
							Tags:      tags,
						})
						if err != nil {
							log.Printf("Failed to create tags for instance %s: %v", *instance.InstanceId, err)
							return err
						}
						log.Printf("Tags from Spot Request %s have been applied to Instance %s", spotRequestID, *instance.InstanceId)
					}
				}
			}
		}
	}
	return nil
}

func CaptureInstanceSnapshot(c *gin.Context) {
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

	var snapshotID string
	if snapshotID, err = instance.CaptureInstanceImage(req.InstanceID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

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
		SnapShot:          snapshotID,
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
