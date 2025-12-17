#!/bin/bash

# Multi-Instance Launcher for Assignment Grader
# This script helps you run multiple backend and frontend instances on different ports

echo "=========================================="
echo "🎓 Assignment Grader Multi-Instance Launcher"
echo "=========================================="
echo ""

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $1 is already in use"
        return 1
    else
        return 0
    fi
}

# Display menu
echo "Select what to run:"
echo ""
echo "BACKEND OPTIONS:"
echo "  1) Teacher Instance 1  - Backend on port 5001"
echo "  2) Teacher Instance 2  - Backend on port 5002"
echo "  3) Student Instance 1  - Backend on port 5003"
echo "  4) Student Instance 2  - Backend on port 5004"
echo "  5) Default Backend     - Backend on port 5000"
echo ""
echo "FRONTEND OPTIONS:"
echo "  6) Teacher Frontend 1  - Frontend on port 3001 → Backend 5001"
echo "  7) Teacher Frontend 2  - Frontend on port 3002 → Backend 5002"
echo "  8) Student Frontend 1  - Frontend on port 3003 → Backend 5003"
echo "  9) Student Frontend 2  - Frontend on port 3004 → Backend 5004"
echo "  10) Default Frontend   - Frontend on port 3000 → Backend 5000"
echo ""
echo "QUICK START:"
echo "  11) Full Teacher Setup  - Backend 5001 + Frontend 3001"
echo "  12) Full Student Setup  - Backend 5003 + Frontend 3003"
echo ""
echo "  0) Exit"
echo ""
read -p "Enter your choice: " choice

case $choice in
    1)
        echo "Starting Teacher Backend on port 5001..."
        cd backend && npm run start:teacher1
        ;;
    2)
        echo "Starting Teacher Backend on port 5002..."
        cd backend && npm run start:teacher2
        ;;
    3)
        echo "Starting Student Backend on port 5003..."
        cd backend && npm run start:student1
        ;;
    4)
        echo "Starting Student Backend on port 5004..."
        cd backend && npm run start:student2
        ;;
    5)
        echo "Starting Default Backend on port 5000..."
        cd backend && npm start
        ;;
    6)
        echo "Starting Teacher Frontend on port 3001..."
        cd frontend && npm run start:teacher1
        ;;
    7)
        echo "Starting Teacher Frontend on port 3002..."
        cd frontend && npm run start:teacher2
        ;;
    8)
        echo "Starting Student Frontend on port 3003..."
        cd frontend && npm run start:student1
        ;;
    9)
        echo "Starting Student Frontend on port 3004..."
        cd frontend && npm run start:student2
        ;;
    10)
        echo "Starting Default Frontend on port 3000..."
        cd frontend && npm start
        ;;
    11)
        echo "Starting Full Teacher Setup..."
        echo "Backend: port 5001, Frontend: port 3001"
        cd backend && npm run start:teacher1 &
        sleep 2
        cd ../frontend && npm run start:teacher1
        ;;
    12)
        echo "Starting Full Student Setup..."
        echo "Backend: port 5003, Frontend: port 3003"
        cd backend && npm run start:student1 &
        sleep 2
        cd ../frontend && npm run start:student1
        ;;
    0)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid choice!"
        exit 1
        ;;
esac
