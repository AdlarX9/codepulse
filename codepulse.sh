#!/bin/bash

# CodePulse Management Script
# Usage: ./codepulse.sh [command] [environment]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_help() {
    echo "CodePulse Management Script"
    echo "=========================="
    echo ""
    echo "Usage: $0 [command] [environment]"
    echo ""
    echo "Commands:"
    echo "  start [dev|prod]     Start the application"
    echo "  stop [dev|prod]      Stop the application"
    echo "  restart [dev|prod]   Restart the application"
    echo "  logs [dev|prod]      Show application logs"
    echo "  status [dev|prod]    Show service status"
    echo "  shell [api|web|db]   Open shell in container"
    echo "  backup               Backup database (prod only)"
    echo "  restore [file]       Restore database from backup"
    echo "  update               Update application"
    echo "  clean                Clean Docker resources"
    echo "  migrate              Run database migrations"
    echo "  help                 Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 start dev         # Start development environment"
    echo "  $0 logs prod         # Show production logs"
    echo "  $0 shell api         # Open shell in API container"
    echo "  $0 backup            # Backup production database"
}

get_compose_file() {
    if [ "$1" = "dev" ]; then
        echo "compose.dev.yaml"
    else
        echo "compose.yaml"
    fi
}

check_environment() {
    local env=$1
    if [ "$env" != "dev" ] && [ "$env" != "prod" ] && [ -n "$env" ]; then
        echo -e "${RED}Error: Environment must be 'dev' or 'prod'${NC}"
        exit 1
    fi
}

# Main command handling
case "$1" in
    "start")
        ENV=${2:-dev}
        check_environment $ENV
        COMPOSE_FILE=$(get_compose_file $ENV)
        echo -e "${BLUE}Starting CodePulse ($ENV environment)...${NC}"
        docker-compose -f $COMPOSE_FILE up -d
        echo -e "${GREEN}CodePulse started successfully!${NC}"
        ;;
    
    "stop")
        ENV=${2:-dev}
        check_environment $ENV
        COMPOSE_FILE=$(get_compose_file $ENV)
        echo -e "${BLUE}Stopping CodePulse ($ENV environment)...${NC}"
        docker-compose -f $COMPOSE_FILE down
        echo -e "${GREEN}CodePulse stopped successfully!${NC}"
        ;;
    
    "restart")
        ENV=${2:-dev}
        check_environment $ENV
        COMPOSE_FILE=$(get_compose_file $ENV)
        echo -e "${BLUE}Restarting CodePulse ($ENV environment)...${NC}"
        docker-compose -f $COMPOSE_FILE restart
        echo -e "${GREEN}CodePulse restarted successfully!${NC}"
        ;;
    
    "logs")
        ENV=${2:-dev}
        check_environment $ENV
        COMPOSE_FILE=$(get_compose_file $ENV)
        docker-compose -f $COMPOSE_FILE logs -f
        ;;
    
    "status")
        ENV=${2:-dev}
        check_environment $ENV
        COMPOSE_FILE=$(get_compose_file $ENV)
        docker-compose -f $COMPOSE_FILE ps
        ;;
    
    "shell")
        SERVICE=${2:-api}
        ENV=${3:-dev}
        check_environment $ENV
        COMPOSE_FILE=$(get_compose_file $ENV)
        
        case "$SERVICE" in
            "api")
                docker-compose -f $COMPOSE_FILE exec api sh
                ;;
            "web")
                docker-compose -f $COMPOSE_FILE exec web sh
                ;;
            "db"|"postgres")
                docker-compose -f $COMPOSE_FILE exec postgres psql -U codepulse -d codepulse_dev
                ;;
            "redis")
                docker-compose -f $COMPOSE_FILE exec redis redis-cli
                ;;
            *)
                echo -e "${RED}Error: Unknown service '$SERVICE'. Available: api, web, db, redis${NC}"
                exit 1
                ;;
        esac
        ;;
    
    "backup")
        echo -e "${BLUE}Creating database backup...${NC}"
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        docker-compose exec -T postgres pg_dump -U codepulse codepulse > $BACKUP_FILE
        echo -e "${GREEN}Backup created: $BACKUP_FILE${NC}"
        ;;
    
    "restore")
        BACKUP_FILE=$2
        if [ -z "$BACKUP_FILE" ]; then
            echo -e "${RED}Error: Please specify backup file${NC}"
            echo "Usage: $0 restore backup_file.sql"
            exit 1
        fi
        
        if [ ! -f "$BACKUP_FILE" ]; then
            echo -e "${RED}Error: Backup file '$BACKUP_FILE' not found${NC}"
            exit 1
        fi
        
        echo -e "${YELLOW}Warning: This will overwrite the current database!${NC}"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Restoring database from $BACKUP_FILE...${NC}"
            docker-compose exec -T postgres psql -U codepulse -d codepulse < $BACKUP_FILE
            echo -e "${GREEN}Database restored successfully!${NC}"
        else
            echo "Restore cancelled"
        fi
        ;;
    
    "update")
        echo -e "${BLUE}Updating CodePulse...${NC}"
        git pull
        docker-compose build --no-cache
        docker-compose up -d
        echo -e "${GREEN}Update completed!${NC}"
        ;;
    
    "clean")
        echo -e "${BLUE}Cleaning Docker resources...${NC}"
        docker system prune -f
        docker volume prune -f
        echo -e "${GREEN}Cleanup completed!${NC}"
        ;;
    
    "migrate")
        ENV=${2:-dev}
        check_environment $ENV
        COMPOSE_FILE=$(get_compose_file $ENV)
        echo -e "${BLUE}Running database migrations...${NC}"
        
        if [ "$ENV" = "prod" ]; then
            docker-compose -f $COMPOSE_FILE exec api migrate -path /root/migrations -database "$DATABASE_URL" up
        else
            echo "Migrations will run automatically in development mode"
        fi
        echo -e "${GREEN}Migrations completed!${NC}"
        ;;
    
    "help"|"--help"|"-h"|"")
        print_help
        ;;
    
    *)
        echo -e "${RED}Error: Unknown command '$1'${NC}"
        echo ""
        print_help
        exit 1
        ;;
esac
