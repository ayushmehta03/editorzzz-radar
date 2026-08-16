package utils

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)


var rctx=context.Background()


func HandleOtpResendBackoff(
	rdb *redis.Client,
	keyBase string,
) (time.Duration, error) {

	attemptKey := fmt.Sprintf("%s:attempts", keyBase)
	cooldownKey := fmt.Sprintf("%s:cooldown", keyBase)
	blockKey := fmt.Sprintf("%s:block", keyBase)

	blocked, err := rdb.Exists(rctx, blockKey).Result()
	if err != nil {
		return 0, err
	}

	if blocked == 1 {
		ttl, _ := rdb.TTL(rctx, blockKey).Result()
		return 0, fmt.Errorf("too many attempts. try again after %d seconds", int(ttl.Seconds()))
	}

	coolDownExist, err := rdb.Exists(rctx, cooldownKey).Result()
	if err != nil {
		return 0, err
	}

	if coolDownExist == 1 {
		ttl, _ := rdb.TTL(rctx, cooldownKey).Result()
		return 0, fmt.Errorf("please wait %d seconds before requesting again", int(ttl.Seconds()))
	}

	attempts, err := rdb.Incr(rctx, attemptKey).Result()
	if err != nil {
		return 0, err
	}

	rdb.Expire(rctx, attemptKey, time.Hour)

	var cooldown time.Duration

	switch attempts {
	case 1:
		cooldown = 60 * time.Second
	case 2:
		cooldown = 120 * time.Second
	case 3:
		cooldown = 240 * time.Second
	default:
		rdb.Set(rctx, blockKey, "1", time.Hour)
		return 0, fmt.Errorf("too many attempts. try again after 3600 seconds")
	}

	err = rdb.Set(rctx, cooldownKey, "1", cooldown).Err()
	if err != nil {
		return 0, err
	}

	return cooldown, nil
}