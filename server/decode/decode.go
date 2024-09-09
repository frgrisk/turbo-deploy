package decode

import (
	"bytes"
	"compress/gzip"
	"encoding/base64"
	"io"
	"log"
)

// Function to decode and decompress base64 gzip string
func DecodeBase64Gzip(encodedStr string) (string, error) {

	// // Decode base64 string
	decoded, err := base64.StdEncoding.DecodeString(encodedStr)
	if err != nil {
		log.Printf("Failed to decode bas64 string")
		return "", err
	}

	// Create a gzip reader
	gzr, err := gzip.NewReader(bytes.NewReader(decoded))
	if err != nil {
		log.Printf("Failed to create a gzip reader")
		return "", err
	}

	// Read result from gzip reader
	result, err := io.ReadAll(gzr)
	if err != nil {
		log.Printf("Failed to read from reader")
		return "", err
	}

	return string(result), nil
}