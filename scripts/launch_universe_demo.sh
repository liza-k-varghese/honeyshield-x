#!/usr/bin/env bash
# ==============================================================================
# HoneyShield X — Milestone 19.3: Safe Universe 2.0 Demonstration Launcher
# Host Platform: Parrot OS Linux / KDE Plasma / Wayland
# ==============================================================================
set -euo pipefail

# 1. Resolve Project Root Reliably
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Terminal Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

echo -e "${CYAN}${BOLD}======================================================================${RESET}"
echo -e "${CYAN}${BOLD}HoneyShield X — Universe 2.0 Demonstration Launcher (Milestone 19.3)${RESET}"
echo -e "${CYAN}${BOLD}Release Candidate: v1.0.0-rc5 | Platform: Parrot OS / Wayland / Firefox${RESET}"
echo -e "${CYAN}${BOLD}======================================================================${RESET}"

# Tracking for subprocesses started by this script
LAUNCHED_PIDS=()

cleanup() {
    echo -e "\n${AMBER}[*] Shutting down demonstration processes started by launcher...${RESET}"
    for pid in "${LAUNCHED_PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "    Stopping process PID: $pid"
            kill "$pid" 2>/dev/null || true
        fi
    done
    echo -e "${GREEN}[✓] Demonstration cleanup complete.${RESET}"
}
trap cleanup SIGINT SIGTERM EXIT

# 2. Check Node.js Runtime
echo -e "\n${BOLD}[1/6] Checking Node.js Runtime & Frontend Tooling...${RESET}"
if command -v node >/dev/null 2>&1; then
    NODE_VER="$(node -v)"
    echo -e "    ${GREEN}[✓] Node.js located:${RESET} $(command -v node) (${NODE_VER})"
else
    echo -e "    ${RED}[✗] Node.js binary not found in PATH!${RESET}"
    exit 1
fi

VITE_BIN="$PROJECT_ROOT/frontend/node_modules/.bin/vite"
if [[ -f "$VITE_BIN" ]]; then
    echo -e "    ${GREEN}[✓] Project-local Vite binary located:${RESET} ${VITE_BIN}"
else
    echo -e "    ${RED}[✗] Project-local Vite not found at ${VITE_BIN}!${RESET}"
    echo -e "        Run 'pnpm install' or 'npm install' inside frontend directory."
    exit 1
fi

# 3. Check Python Virtual Environment
echo -e "\n${BOLD}[2/6] Checking Python Backend Environment...${RESET}"
PYTHON_BIN="$PROJECT_ROOT/backend/.venv/bin/python3"
UVICORN_BIN="$PROJECT_ROOT/backend/.venv/bin/uvicorn"

if [[ -f "$PYTHON_BIN" ]]; then
    PY_VER="$("$PYTHON_BIN" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')")"
    echo -e "    ${GREEN}[✓] Backend Virtualenv located:${RESET} ${PYTHON_BIN} (Python ${PY_VER})"
else
    echo -e "    ${AMBER}[!] Backend virtualenv not found at ${PYTHON_BIN}.${RESET}"
    echo -e "        Checking system python3..."
    PYTHON_BIN="$(command -v python3 || true)"
    UVICORN_BIN="$(command -v uvicorn || true)"
fi

# 4. Check PostgreSQL & Redis Subsystems (Telemetry Honesty Check)
echo -e "\n${BOLD}[3/6] Inspecting Backend Infrastructure Daemons...${RESET}"
"$PYTHON_BIN" -c "
import socket
def check_port(host, port, name):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1.0)
    try:
        s.connect((host, port))
        s.close()
        print(f'    \033[0;32m[✓] {name} is active on {host}:{port}\033[0m')
        return True
    except Exception:
        print(f'    \033[0;33m[!] {name} is unconfigured on {host}:{port} -> Platform activates in-memory fallback mode\033[0m')
        return False

check_port('127.0.0.1', 5432, 'PostgreSQL 17')
check_port('127.0.0.1', 6379, 'Redis Outbox Bus')
"

# 5. Check API Service (Port 8000)
echo -e "\n${BOLD}[4/6] Verifying Backend API Gateway (Port 8000)...${RESET}"
API_RUNNING=false
if curl -s -I http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo -e "    ${GREEN}[✓] HoneyShield X API is already running on http://127.0.0.1:8000/${RESET}"
    API_RUNNING=true
else
    echo -e "    ${AMBER}[*] API server not running on port 8000. Launching in local dev mode...${RESET}"
    if [[ -x "$UVICORN_BIN" ]]; then
        PYTHONPATH="$PROJECT_ROOT/backend" "$UVICORN_BIN" app.main:app --host 127.0.0.1 --port 8000 > /tmp/honeyshield_api_demo.log 2>&1 &
        API_PID=$!
        LAUNCHED_PIDS+=("$API_PID")
        echo -e "    ${GREEN}[✓] Started FastAPI server (PID: ${API_PID}, logs: /tmp/honeyshield_api_demo.log)${RESET}"
        sleep 2
    else
        echo -e "    ${AMBER}[!] Uvicorn executable not available; proceeding with frontend demonstration.${RESET}"
    fi
fi

# 6. Check Vite Development Server (Port 5173)
echo -e "\n${BOLD}[5/6] Verifying Frontend Development Server (Port 5173)...${RESET}"
VITE_RUNNING=false
if curl -s -I http://127.0.0.1:5173/ >/dev/null 2>&1; then
    echo -e "    ${GREEN}[✓] Frontend server is already active on http://127.0.0.1:5173/${RESET}"
    VITE_RUNNING=true
else
    echo -e "    ${AMBER}[*] Starting Vite server using project-local binary on port 5173...${RESET}"
    (cd "$PROJECT_ROOT/frontend" && "$VITE_BIN" --host 127.0.0.1 --port 5173 > /tmp/honeyshield_vite_demo.log 2>&1) &
    VITE_PID=$!
    LAUNCHED_PIDS+=("$VITE_PID")
    echo -e "    ${GREEN}[✓] Started Vite server (PID: ${VITE_PID}, logs: /tmp/honeyshield_vite_demo.log)${RESET}"
    sleep 2
fi

# 7. Summary & Ready Notice
echo -e "\n${CYAN}${BOLD}======================================================================${RESET}"
echo -e "${GREEN}${BOLD}HONEYSHIELD X UNIVERSE 2.0 DEMONSTRATION CENTER IS READY${RESET}"
echo -e "${CYAN}${BOLD}======================================================================${RESET}"
echo -e "  ${BOLD}Frontend Application URL:${RESET}  ${CYAN}http://127.0.0.1:5173/${RESET}"
echo -e "  ${BOLD}Backend API Docs (Swagger):${RESET} ${CYAN}http://127.0.0.1:8000/docs${RESET}"
echo -e "  ${BOLD}API Health Endpoint:${RESET}        ${CYAN}http://127.0.0.1:8000/health${RESET}"
echo -e "  ${BOLD}Authentication Personas:${RESET}    responder_alex / analyst_sarah / admin_chief"
echo -e "\n  ${BOLD}Operator Acceptance Instructions:${RESET}"
echo -e "  1. Open ${CYAN}http://127.0.0.1:5173/${RESET} in Mozilla Firefox on KDE Plasma."
echo -e "  2. Observe the Living Observatory, Event Singularity, and four robot quadrants."
echo -e "  3. Press ${BOLD}Space${RESET} to run individual agent locomotion."
echo -e "  4. Press ${BOLD}D${RESET} (or click SIMULATE DEMO) to observe the 4-agent relay."
echo -e "  5. Press ${BOLD}C${RESET} (or click DIAGNOSTICS) to open the Core Diagnostics panel."
echo -e "\n${AMBER}[*] Press Ctrl+C at any time to cleanly stop demonstration processes.${RESET}"

# Keep alive if we spawned child processes
if [[ ${#LAUNCHED_PIDS[@]} -gt 0 ]]; then
    while true; do
        sleep 1
    done
fi

