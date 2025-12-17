#!/bin/bash

# Quick Demo: Run Teacher and Student instances side by side

echo "=========================================="
echo "🎓 Starting Demo: Teacher + Student"
echo "=========================================="
echo ""

# Check if ports are available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "❌ Port $1 is already in use. Please free it first."
        exit 1
    fi
}

echo "Checking if ports are available..."
check_port 5001
check_port 5003
check_port 3001
check_port 3003

echo "✅ All ports are available"
echo ""

# Start backends
echo "📡 Starting Teacher Backend (port 5001)..."
cd backend
PORT=5001 node server.js > /dev/null 2>&1 &
TEACHER_BACKEND_PID=$!
cd ..

sleep 2

echo "📡 Starting Student Backend (port 5003)..."
cd backend
PORT=5003 node server.js > /dev/null 2>&1 &
STUDENT_BACKEND_PID=$!
cd ..

sleep 2

echo ""
echo "✅ Backends started!"
echo "   Teacher Backend: http://localhost:5001 (PID: $TEACHER_BACKEND_PID)"
echo "   Student Backend: http://localhost:5003 (PID: $STUDENT_BACKEND_PID)"
echo ""

# Start frontends
echo "🌐 Starting Teacher Frontend (port 3001)..."
cd frontend
PORT=3001 REACT_APP_API_URL=http://localhost:5001/api npm start > /dev/null 2>&1 &
TEACHER_FRONTEND_PID=$!
cd ..

sleep 3

echo "🌐 Starting Student Frontend (port 3003)..."
cd frontend
PORT=3003 REACT_APP_API_URL=http://localhost:5003/api npm start > /dev/null 2>&1 &
STUDENT_FRONTEND_PID=$!
cd ..

sleep 5

echo ""
echo "=========================================="
echo "✅ Demo Setup Complete!"
echo "=========================================="
echo ""
echo "🔗 Access URLs:"
echo "   Teacher Portal: http://localhost:3001"
echo "   Student Portal: http://localhost:3003"
echo ""
echo "🔑 Login Credentials:"
echo "   Teacher: teacher@university.edu / teacher123"
echo "   Student: cse001@university.edu / student123"
echo ""
echo "📝 Process IDs (to kill later):"
echo "   Teacher Backend PID: $TEACHER_BACKEND_PID"
echo "   Student Backend PID: $STUDENT_BACKEND_PID"
echo "   Teacher Frontend PID: $TEACHER_FRONTEND_PID"
echo "   Student Frontend PID: $STUDENT_FRONTEND_PID"
echo ""
echo "⚠️  To stop all processes, run:"
echo "   kill $TEACHER_BACKEND_PID $STUDENT_BACKEND_PID $TEACHER_FRONTEND_PID $STUDENT_FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop monitoring..."
echo ""

# Wait for user interrupt
trap "echo ''; echo 'Stopping all processes...'; kill $TEACHER_BACKEND_PID $STUDENT_BACKEND_PID $TEACHER_FRONTEND_PID $STUDENT_FRONTEND_PID 2>/dev/null; echo 'Done!'; exit 0" SIGINT

# Keep script running
while true; do
    sleep 1
done
