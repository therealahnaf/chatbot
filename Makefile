.PHONY: help up down logs logs-api restart clean rebuild

help:
	@echo "Available commands:"
	@echo "  make up          # Start everything"
	@echo "  make down        # Stop everything"
	@echo "  make logs        # View all logs"
	@echo "  make logs-api    # View only API logs"
	@echo "  make restart     # Restart all services"
	@echo "  make clean       # Stop and remove everything"
	@echo "  make rebuild     # Rebuild and restart"

up:
	@echo "Starting all services..."
	docker-compose -f server/docker-compose.yml -f client/docker-compose.yml up -d

down:
	@echo "Stopping all services..."
	docker-compose -f server/docker-compose.yml -f client/docker-compose.yml down

logs:
	@echo "Viewing all logs..."
	docker-compose -f server/docker-compose.yml -f client/docker-compose.yml logs -f

logs-api:
	@echo "Viewing API logs..."
	docker-compose -f server/docker-compose.yml logs -f api

restart:
	@echo "Restarting all services..."
	docker-compose -f server/docker-compose.yml -f client/docker-compose.yml restart

clean:
	@echo "Stopping and removing all containers, networks, and volumes..."
	docker-compose -f server/docker-compose.yml -f client/docker-compose.yml down -v
	@echo "Clean complete!"

rebuild:
	@echo "Rebuilding and restarting all services..."
	docker-compose -f server/docker-compose.yml -f client/docker-compose.yml up --build -d
	@echo "Rebuild complete!"