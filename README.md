# 🛒 Mesna POS System

Mesna POS is a modern, high-performance, **100% offline-first Point of Sale (POS)** system designed for local retail environments. It provides robust multi-register capability without requiring an active internet connection, leveraging a decentralized peer-to-peer (P2P) database replication model and localized AI-powered voice commands.

---

## 🌟 Key Features

### 📡 Decentralized P2P Mesh Network Sync
*   **Zero-Config Auto-Discovery:** Discovers other cash registers on the same local area network (LAN) dynamically using UDP broadcasting on port `41234`.
*   **Real-time Replication:** Establishes active peer-to-peer WebSocket connections between running backend instances.
*   **Transactional Incremental Sync:** Synchronizes inventory counts and transaction data seamlessly. If a register goes offline and reconnects, it transactionally retrieves missing transactions using Prisma transactions.
*   **Automatic Inventory Deductions:** Automatically adjusts local stock counts as transactions are broadcast and replicated.

### 🎙️ Local AI Voice Assistant (Hands-Free POS)
*   **Fully Offline ASR:** Runs the Whisper-Tiny model (`@xenova/transformers`) locally on the backend. Your voice data never leaves the local network.
*   **Urdu, Hindi & English Support:** Fully understands voice commands in English, Urdu, and Hindi, including text representations of numbers (e.g., "das percent discount", "riayat 10", "remove milk", "bill banao", "pay card").
*   **Smart Parsing Verbs:**
    *   **Add Item:** *"Add Milk"* or *"Coca Cola"*
    *   **Apply Discount:** *"Discount 10 percent"* or *"Das percent discount"*
    *   **Remove Item:** *"Remove bread"* or *"Doodh delete karo"*
    *   **Payment & Checkout:** *"Payment card"*, *"Bill banao"*, or *"Checkout"*
    *   **Clear Cart:** *"Clear cart"* or *"Khali karo"*

### 🔒 Admin Panel & Analytics
*   **Role-Based Access:** Secure admin login using hashed PIN authentication.
*   **Stock & Product Management:** Add new products, update prices, edit details, and restock quantities.
*   **Interactive Sales Reports:** Visualize revenue, profit, transaction history, and top-selling products using interactive charts.
*   **Thermal Receipt Generator:** Beautifully formatted templates ready to print to standard POS thermal receipt printers.

### 🚀 Production Operations & Deployment Toolkit
*   **Deployment Packaging:** Automated deployment packaging script creates versioned/zipped archives for quick distribution to other clients.
*   **Client Auto-Setup:** Guided automated client node setup script sets up folder layouts, downloads packages, builds files, configures Windows Firewall, and installs startup shortcuts.
*   **Unified Control Panel:** `PROCESS_MANAGER.bat` simplifies launching, stopping, monitoring, backing up, and viewing system logs.
*   **Hot Database Backups:** SQLite database hot-backup script with automated retention and cleanup of old backups.
*   **Health and Integrity Monitoring:** Built-in health check verifies database integrity, disk space availability, and server API status.

---

## 🛠️ Technology Stack

### Backend
*   **Runtime:** Node.js & Express
*   **Database ORM:** Prisma with SQLite (Zero-config local database file)
*   **Real-time Syncer:** `ws` (WebSockets) for transactional sync & `dgram` for UDP discovery
*   **AI Engine:** `@xenova/transformers` (Local Whisper-Tiny quantized weights loader)

### Frontend
*   **Framework:** React (Vite)
*   **Styling:** Tailwind CSS (Vanilla utilities with modern dark mode styling)
*   **API Client:** Axios
*   **Visualization:** Chart.js

---

## 📂 Project Structure

```text
mesna-pos-system/
├── backend/                   # Node.js + Prisma Express Backend
│   ├── data/                  # Local SQLite database files
│   ├── logs/                  # Application runtime logs
│   ├── prisma/                # Prisma schema & migration files
│   ├── scripts/               # Production operations scripts (health-checks, backups)
│   └── src/                   # Server logic, routes, and P2P mesh network services
├── frontend/                  # React + Vite Frontend
│   ├── src/                   # POS components, state managers, and views
│   └── tailwind.config.js     # Styling configuration
├── deployment/                # Automation suite for multi-register deployment
│   └── create-package.bat     # Creates deployment ZIP file
├── DEPLOY_GUIDE.md            # In-depth guide on physical deployment
├── VERIFICATION.md            # Post-deployment sync and integrity checks
├── PROCESS_MANAGER.bat        # Unified control script for starting/stopping services
├── start-pos.bat              # Standard Windows development mode startup script
├── start-production.bat       # Hardened production mode startup script
└── README.md                  # Main project overview (This file)
```

---

## 🚀 Getting Started

> [!TIP]
> A beautifully formatted, simply explained installation guide is available in PDF format: [Mesna_POS_Installation_Guide.pdf](file:///c:/Users/Ahmad/OneDrive/Desktop/mesna%20pos%20system/Mesna_POS_Installation_Guide.pdf).

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher recommended)

### Quick Start (Development Launcher)
Double-click `start-pos.bat` in the root directory. This launcher script will:
1. Start the Node.js backend server (port `3001`).
2. Start the Vite React development server (port `5173`).
3. Open `http://localhost:5173` in your default web browser automatically.

### Production Execution
Double-click `start-production.bat` to run the servers in production mode. This hardened startup script loads environment variables, automatically creates log directories, sets up log tracking, and prepares the SQLite database.

---

## 🔧 Multi-Register Setup & Deployment

To deploy this POS system across multiple cash registers (e.g. 10+ machines) connected to the same Local Area Network (LAN):

### 1. Build the Deployment Package
On your developer machine, run the packaging batch script:
```bash
deployment\create-package.bat
```
This will compile a deployment archive named `mesna-pos-deploy-[timestamp].zip` in the root directory containing all necessary files and the client auto-setup script.

### 2. Set Up Client Registers
1. Copy the generated ZIP archive to the target register computer.
2. Extract the ZIP contents to a directory (e.g., `C:\MesnaPOS`).
3. Right-click `setup-register.bat` and choose **Run as Administrator**.
4. The setup script will:
   * Install frontend & backend NPM dependencies.
   * Initialize local SQLite database structures and seed default products.
   * Configure Windows Firewall rule exceptions for P2P Discovery (UDP `41234`), Backend API (TCP `3001`), and local communication.
   * Create an auto-start shortcut in the Windows Startup folder so the register starts automatically when the computer boots up.

---

## 🛠️ Production Operations Toolkit

The root directory contains a CLI/Utility control panel called `PROCESS_MANAGER.bat`. Run it without parameters to view all available commands:

```bash
PROCESS_MANAGER.bat [command]
```

### Supported Commands
*   `start` - Safely checks and starts both backend API services and frontend interfaces.
*   `stop` - Halts all active Node.js and POS processes.
*   `restart` - Restarts all services.
*   `status` - Queries the system to check which server processes are currently active.
*   `logs` - Displays the recent server logs, with options to stream/follow log outputs in real-time (`tail -f`).
*   `backup` - Executes a clean hot backup of the SQLite database to `backend/backups/`.
*   `health` - Performs health monitoring, verifying database responsiveness, endpoint status, and free disk space.

---

## 🎤 Voice Command Reference Guide

Click the **Voice POS** floating action button in the bottom right corner of the screen, speak, and click it again to submit.

| Command Intent | English Examples | Urdu / Hindi Examples |
| :--- | :--- | :--- |
| **Add Product** | "Add Milk", "Please add bread" | "Doodh add karo", "Cheeni daalo" |
| **Apply Discount** | "Discount 10 percent", "Give 5 percent discount" | "Das percent discount", "Riayat paanch percent" |
| **Remove Product** | "Remove Milk", "Cancel bread" | "Milk nikaalo", "Delete bread do" |
| **Checkout / Pay** | "Checkout", "Confirm payment card" | "Bill banao", "Pay cash", "Khatam karo" |
| **Clear Cart** | "Clear cart", "Empty cart" | "Khali karo", "Saaf karo" |

---

## 🔌 Multi-Register LAN Sync Details

To use multiple registers concurrently:
1. Ensure all laptops/registers are connected to the **same Local Area Network / Wi-Fi subnet**.
2. Run the POS application on each machine.
3. The registers will automatically find each other using the background UDP discovery process.
4. When a sale is completed on **Register A**, it replicates instantly to the SQLite database on **Register B**, updating the frontend interface in real-time.

---

## 📄 Key Documentation Reference Maps

For more advanced instructions and troubleshooting, reference the following markdown guides in this repository:
*   [Deployment Guide](file:///c:/Users/Ahmad/OneDrive/Desktop/mesna%20pos%20system/DEPLOY_GUIDE.md) - Network requirements, firewall rules, hardware specifications, and step-by-step setup guides.
*   [Verification Guide](file:///c:/Users/Ahmad/OneDrive/Desktop/mesna%20pos%20system/VERIFICATION.md) - Comprehensive checklist to verify that clients are connected, database syncing is functional, and data backup works properly.
*   [Enhancements Summary](file:///c:/Users/Ahmad/OneDrive/Desktop/mesna%20pos%20system/ENHANCEMENTS_SUMMARY.md) - Overview of the production enhancements implemented to prepare the software for scalable offline operations.
