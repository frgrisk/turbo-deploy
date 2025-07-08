package util

import (
	"fmt"
	"time"
)

func CalculateTTL(durationValue int64, durationUnit string) (int64, error) {
	durationStr := fmt.Sprintf("%d%s", durationValue, durationUnit)
	duration, err := time.ParseDuration(durationStr)
	if err != nil {
		return 0, err
	}

	ttl := time.Now().UTC().Add(duration).Unix()
	return ttl, nil
}
