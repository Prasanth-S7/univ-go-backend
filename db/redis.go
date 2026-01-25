package db

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client

func InitRedis() {
	redisAddr := os.Getenv("REDIS_URL")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	opts, err := redis.ParseURL(redisAddr)
	if err != nil {
		// If ParseURL fails (likely no scheme), handle manual parsing for host:port/db or just host:port
		// Fallback to simple address if ParseURL fails
		fmt.Printf("Redis URL parse failed, falling back to simple addr: %v\n", err)

		// Re-implement the slash check for legacy/simple format without scheme
		redisDB := 0
		addr := redisAddr

		if strings.Contains(redisAddr, "/") {
			parts := strings.Split(redisAddr, "/")
			if len(parts) == 2 {
				addr = parts[0]
				fmt.Sscanf(parts[1], "%d", &redisDB)
			}
		}

		opts = &redis.Options{
			Addr: addr,
			DB:   redisDB,
		}
	}

	RedisClient = redis.NewClient(opts)

	ctx := context.Background()
	if err := RedisClient.Ping(ctx).Err(); err != nil {
		fmt.Printf("Failed to connect to Redis: %v\n", err)
	} else {
		fmt.Println("Connected to Redis")
	}
}
