package utils

import (
	"os"
	"strconv"
)

type Config struct {
	GoEnv             string
	DbHost            string
	DbPort            int
	DbUser            string
	DbPassword        string
	DbName            string
	JwtKey            string
	CookieDomain      string
	RedisUrl          string
	Port              string
	DbConnMaxLifeTime int
	DbConnMaxIdleTime int
	DbMaxOpenConn     int
	DbMaxIdleConn     int
}

func LoadFromEnv() (*Config, error) {
	cfg := &Config{
		GoEnv: GetEnvValue("development", "GO_ENV").(string),

		DbHost:     GetEnvValue("localhost", "DB_HOST").(string),
		DbPort:     GetEnvValue(5432, "DB_PORT").(int),
		DbUser:     GetEnvValue("postgres", "DB_USER").(string),
		DbPassword: GetEnvValue("password", "DB_PASSWORD").(string),
		DbName:     GetEnvValue("univapp", "DB_NAME").(string),

		JwtKey:       GetEnvValue("secret", "JWT_KEY").(string),
		CookieDomain: GetEnvValue("localhost", "COOKIE_DOMAIN").(string),

		RedisUrl: GetEnvValue("redis://localhost:6379", "REDIS_URL").(string),

		DbConnMaxLifeTime: GetEnvValue(300, "DB_CONN_MAX_LIFETIME").(int),
		DbConnMaxIdleTime: GetEnvValue(60, "DB_CONN_MAX_IDLE_TIME").(int),
		DbMaxOpenConn:     GetEnvValue(25, "DB_MAX_OPEN_CONNS").(int),
		DbMaxIdleConn:     GetEnvValue(25, "DB_MAX_IDLE_CONNS").(int),

		Port: GetEnvValue("4500", "PORT").(string),
	}

	return cfg, nil
}

func GetEnvValue(defaultValue interface{}, key string) interface{} {
	var valueStr string
	if v, exists := os.LookupEnv(key); exists {
		valueStr = v
	}
	if valueStr == "" {
		return defaultValue
	}

	//Parse the value based on the type of the default value
	switch defaultValue.(type) {
	case string:
		return valueStr
	case int:
		if intValue, err := strconv.Atoi(valueStr); err == nil {
			return intValue
		}
	case float64:
		if floatValue, err := strconv.ParseFloat(valueStr, 64); err == nil {
			return floatValue
		}
	case bool:
		if boolValue, err := strconv.ParseBool(valueStr); err == nil {
			return boolValue
		}
	}
	// If Parsing fails return the default Value itself
	return defaultValue
}
