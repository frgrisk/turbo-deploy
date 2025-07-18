package models

type DynamoDBData struct {
	ID                string   `dynamodbav:"id"`
	Ami               string   `dynamodbav:"ami"`
	ServerSize        string   `dynamodbav:"serverSize"`
	Hostname          string   `dynamodbav:"hostname"`
	Region            string   `dynamodbav:"region"`
	Lifecycle         string   `dynamodbav:"lifecycle"`
	CreationUser      string   `dynamodbav:"creationUser"`
	SnapShot          string   `dynamodbav:"snapShot"`
	ContentDeployment string   `dynamodbav:"contentDeployment"`
	UserData          []string `dynamodbav:"userData"`
	TimeToExpire      int64    `dynamodbav:"timeToExpire"`
}

type Response struct {
	ReturnedResponse string `json:"record_id"`
}

type Payload struct {
	Ami               string   `json:"ami"`
	InstanceID        string   `json:"instanceId"`
	ServerSize        string   `json:"serverSize"`
	Hostname          string   `json:"hostname"`
	Region            string   `json:"region"`
	Lifecycle         string   `json:"lifeCycle"`
	CreationUser      string   `json:"creationUser"`
	SnapShot          string   `json:"snapShot"`
	ContentDeployment string   `json:"contentDeployment"`
	TTLUnit           string   `json:"ttlUnit"`
	TimeToExpire      string   `json:"timeToExpire"`
	UserData          []string `json:"userData"`
	TTLValue          int64    `json:"ttlValue"`
}

type Config struct {
	Ami         []AmiAttr `json:"amis"`
	Region      string    `json:"regions"`
	ServerSizes []string  `json:"serverSizes"`
	UserData    []string  `json:"userData"`
}

type TempConfig struct {
	Region      string   `json:"regions"`
	ServerSizes []string `json:"serverSizes"`
	Ami         []string `json:"amis"`
}

type AmiAttr struct {
	AmiID   string `json:"amiIds"`
	AmiName string `json:"amiNames"`
}

type DeploymentResponse struct {
	DeploymentID     string   `json:"deploymentId"`  // Represents dynamoDB id that created this instance
	InstanceID       string   `json:"ec2InstanceId"` // Represents ec2 instance id
	Ami              string   `json:"ami"`
	ServerSize       string   `json:"serverSize"`
	SnapshotID       string   `json:"snapshotId"`
	Hostname         string   `json:"hostname"`
	AvailabilityZone string   `json:"availabilityZone"`
	Lifecycle        string   `json:"lifecycle"`
	Status           string   `json:"status"`
	TimeToExpire     string   `json:"timeToExpire"`
	UserData         []string `json:"userData"`
}
