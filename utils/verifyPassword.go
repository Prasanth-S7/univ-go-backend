package utils

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/pbkdf2"
)

func VerifyDjangoPassword(password, encodedHash string) (bool, error) {
	parts := strings.Split(encodedHash, "$")

	if len(parts) != 4 {
		return false, fmt.Errorf("invalid hash format")
	}

	algorithm := parts[0]
	iterations, err := strconv.Atoi(parts[1])
	if err != nil {
		return false, fmt.Errorf("invalid iterations: %v", err)
	}

	salt := parts[2]
	hash := parts[3]

	if algorithm != "pbkdf2_sha256" {
		return false, fmt.Errorf("unsupported algorithm: %s", algorithm)
	}

	decodedHash, err := base64.StdEncoding.DecodeString(hash)
	if err != nil {
		return false, fmt.Errorf("failed to decode hash: %v", err)
	}

	newHash := pbkdf2.Key([]byte(password), []byte(salt), iterations, len(decodedHash), sha256.New)

	return subtle.ConstantTimeCompare(newHash, decodedHash) == 1, nil
}
