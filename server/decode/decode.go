package decode

import (
	"bytes"
	"compress/gzip"
	"encoding/base64"
	"fmt"
	"io"
)

// Function to decode and decompress base64 gzip string
func decodeBase64Gzip(encodedStr string) ([]byte, error) {
	// Decode base64
	data, err := base64.StdEncoding.DecodeString(encodedStr)
	if err != nil {
		return nil, fmt.Errorf("base64 decode failed: %v", err)
	}

	// Create a reader for gzip
	reader, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("gzip reader creation failed: %v", err)
	}
	defer reader.Close()

	// Read decompressed data
	decompressedData, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("gzip read failed: %v", err)
	}

	return decompressedData, nil
}