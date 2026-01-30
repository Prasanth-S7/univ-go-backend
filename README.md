# Univ App Go Backend

![Go Version](https://img.shields.io/badge/Go-1.25.5-blue?style=flat-square&logo=go)
![Docker](https://img.shields.io/badge/Docker-Supported-blue?style=flat-square&logo=docker)

This is the Go-based backend service for the Univ App ecosystem. It is designed to run in a containerized environment, connecting to PostgreSQL via PgBouncer.

---

## Prerequisites

Before starting, ensure you have the following installed:
* [Docker](https://www.docker.com/get-started)
* [Docker Compose](https://docs.docker.com/compose/install/)

---

## Getting Started

### 1. Environment Configuration
The application requires an `.env` file to manage database credentials and server settings. 

```bash
# Copy the example environment file
cp .env.example .env
```

### 2. Start the applicaition

```bash
# Start the docker container
docker compose -up -d --build
```
