package db

import (
	"context"
	"errors"
	"log"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/expression"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/frgrisk/turbo-deploy/server/models"
)

var client *dynamodb.Client

const (
	TableName               = "http_crud_backend"
	IDDynamoDBAttributename = "id"
)

var ErrURLNotFound = errors.New("url not found")

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Printf("unable to load SDK config %v", err)
	}

	client = dynamodb.NewFromConfig(cfg)
}

var ErrHostnameExists = errors.New("Hostname already exists")

func SaveRecord(inputStruc models.DynamoDBData) (string, error) {
	exists, err := hostnameExists(inputStruc.Hostname)
	if err != nil {
		log.Printf("Error checking hostname existence: %s", err)
		return "", err
	}
	if exists {
		return "", ErrHostnameExists
	}

	attributeValue, err := attributevalue.MarshalMap(inputStruc)
	if err != nil {
		log.Printf("Got error marshalling new movie item: %s", err)
		return "", err
	}

	_, err = client.PutItem(context.Background(), &dynamodb.PutItemInput{
		TableName: aws.String(TableName),
		Item:      attributeValue,
	})
	if err != nil {
		return "", err
	}

	return inputStruc.ID, nil
}

func hostnameExists(hostname string, excludingID ...string) (bool, error) {
	queryInput := &dynamodb.QueryInput{
		TableName:              aws.String(TableName),
		IndexName:              aws.String("HostnameIndex"),
		KeyConditionExpression: aws.String("hostname = :hostname"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":hostname": &types.AttributeValueMemberS{Value: hostname},
		},
	}

	if len(excludingID) > 0 && excludingID[0] != "" {
		queryInput.FilterExpression = aws.String("id <> :excludingID")
		queryInput.ExpressionAttributeValues[":excludingID"] = &types.AttributeValueMemberS{Value: excludingID[0]}
	}

	result, err := client.Query(context.Background(), queryInput)
	if err != nil {
		return false, err
	}

	return len(result.Items) > 0, nil
}

func GetRecord(id string) (*models.DynamoDBData, error) {
	result, err := client.GetItem(context.Background(), &dynamodb.GetItemInput{
		TableName: aws.String(TableName),
		Key: map[string]types.AttributeValue{
			IDDynamoDBAttributename: &types.AttributeValueMemberS{Value: id},
		},
	})
	if err != nil {
		log.Printf("failed to get record %v", err)
		return nil, err
	}

	if result.Item == nil {
		return nil, errors.New("record not found")
	}

	var dataToReturn models.DynamoDBData
	err = attributevalue.UnmarshalMap(result.Item, &dataToReturn)
	if err != nil {
		log.Printf("failed to unmarshal record: %v", err)
		return nil, err
	}

	return &dataToReturn, nil
}

// updates an existing record in dynamodb
func UpdateRecord(id string, updateData models.DynamoDBData) error {
	exists, err := hostnameExists(updateData.Hostname, id)
	if err != nil {
		log.Printf("Error checking hostname existence: %s", err)
		return err
	}
	if exists {
		return ErrHostnameExists
	}

	update := expression.Set(
		expression.Name("ami"), expression.Value(updateData.Ami),
	).Set(
		expression.Name("serverSize"), expression.Value(updateData.ServerSize),
	).Set(
		expression.Name("hostname"), expression.Value(updateData.Hostname),
	).Set(
		expression.Name("region"), expression.Value(updateData.Region),
	).Set(
		expression.Name("creationUser"), expression.Value(updateData.CreationUser),
	).Set(
		expression.Name("lifecycle"), expression.Value(updateData.Lifecycle),
	).Set(
		expression.Name("timeToExpire"), expression.Value(updateData.TimeToExpire),
	)

	// Build the update expression.
	expr, err := expression.NewBuilder().WithUpdate(update).Build()
	if err != nil {
		log.Printf("error building update expression: %v", err)
		return err
	}

	input := &dynamodb.UpdateItemInput{
		TableName: aws.String(TableName),
		Key: map[string]types.AttributeValue{
			IDDynamoDBAttributename: &types.AttributeValueMemberS{Value: id},
		},
		UpdateExpression:          expr.Update(),
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		ReturnValues:              types.ReturnValueUpdatedNew,
	}

	_, err = client.UpdateItem(context.Background(), input)
	if err != nil {
		return err
	}

	return nil
}

func DeleteRecord(id string) error {
	condition := expression.AttributeExists(expression.Name(IDDynamoDBAttributename))
	conditionExpression, _ := expression.NewBuilder().WithCondition(condition).Build()

	itemToDelete := &dynamodb.DeleteItemInput{
		TableName: aws.String(TableName),
		Key: map[string]types.AttributeValue{
			IDDynamoDBAttributename: &types.AttributeValueMemberS{Value: id},
		},
		ConditionExpression:       conditionExpression.Condition(),
		ExpressionAttributeNames:  conditionExpression.Names(),
		ExpressionAttributeValues: conditionExpression.Values(),
	}

	_, err := client.DeleteItem(context.Background(), itemToDelete)

	if err != nil && strings.Contains(err.Error(), "ConditionalCheckFailedException") {
		log.Printf("Item not found %v, ", err)
		return err
	}

	return err
}

func ClearAllRecords() error {
	var lastEvaluatedKey map[string]types.AttributeValue

	// added an outer for loop and lastEvaluatedKey for dynamoDB pagination
	// data scan if data exceeds a certain number of records
	for {
		scanInput := &dynamodb.ScanInput{
			TableName:            aws.String(TableName),
			ProjectionExpression: aws.String(IDDynamoDBAttributename),
			ExclusiveStartKey:    lastEvaluatedKey,
		}

		scanOutput, err := client.Scan(context.Background(), scanInput)
		if err != nil {
			log.Printf("Failed to scan DynamoDB table: %v", err)
			return err
		}

		// prepare batch write request
		var writeRequests []types.WriteRequest
		for _, item := range scanOutput.Items {
			writeRequests = append(writeRequests, types.WriteRequest{
				DeleteRequest: &types.DeleteRequest{
					Key: map[string]types.AttributeValue{
						IDDynamoDBAttributename: item[IDDynamoDBAttributename],
					},
				},
			})

			if len(writeRequests) == 25 {
				if err := executeBatchWrite(TableName, writeRequests); err != nil {
					return err
				}
				writeRequests = nil
			}
		}

		// process any write request after loop if number of items are < 25
		if len(writeRequests) > 0 {
			if err := executeBatchWrite(TableName, writeRequests); err != nil {
				return err
			}
		}

		lastEvaluatedKey = scanOutput.LastEvaluatedKey
		if lastEvaluatedKey == nil {
			break
		}
	}

	return nil
}

func executeBatchWrite(tableName string, writeRequest []types.WriteRequest) error {
	batchInput := &dynamodb.BatchWriteItemInput{
		RequestItems: map[string][]types.WriteRequest{
			tableName: writeRequest,
		},
	}

	_, err := client.BatchWriteItem(context.Background(), batchInput)
	if err != nil {
		log.Printf("Failed to batch Delete items: %v", err)
		return err
	}
	return nil
}
