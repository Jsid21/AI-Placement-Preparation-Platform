# 🚀 AI Placement Preparation Platform — Setup & Execution Guide

This comprehensive guide walks you through setting up environment variables, installing dependencies, and running all 4 services of the AI Placement Preparation Platform.

---

## 📋 System Prerequisites

Your system currently meets the necessary environment requirements:
- **Python:** `3.12.7`
- **Node.js:** `v22.13.0`
- **npm:** `10.9.2`
- **MongoDB:** A running MongoDB instance (Local MongoDB Community Server or MongoDB Atlas free cluster URI).

---

## 🏗️ Architecture Overview

The platform consists of **4 independent services**:

| Service | Technology | Port | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend** | Python / FastAPI | `8000` | Resume parsing, audio analysis, sentiment, aptitude & AI interview questions via Groq |
| **Auth Backend** | Node.js / Express / Mongoose | `4000` | User authentication (Local & Google OAuth) and session reports |
| **Body Language Service** | Python / FastAPI / OpenCV / YOLO | `8001` | Real-time eye tracking, pose estimation, emotion detection & video stream |
| **Frontend** | Next.js 15 / React 19 / TailwindCSS | `3000` | User-facing dashboard, webcam interview UI, report visualizer |

---

## 🔑 Environment Variables Setup

Before running the applications, configure the `.env` files in their respective folders:

### 1. Backend Environment File
Create a `.env` file inside `backend/`:
**File path:** `backend/.env`

```env
# Groq API Key for AI interview question generation and feedback
# Get a free key from: https://console.groq.com/keys
GROQ_API_KEY=your_groq_api_key_here
```

---

### 2. Auth Backend Environment File
Create a `.env` file inside `auth-backend/`:
**File path:** `auth-backend/.env`

```env
# MongoDB Connection String (Choose Option A or Option B below)
# Option A (Easiest - 0 installation, free cloud):
# MONGO_URI="mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/ai_prep_db?retryWrites=true&w=majority"
# Option B (Local install via winget):
MONGO_URI=mongodb://localhost:27017/ai_prep_db

# Session Secret (random secret string for Express session cookies)
SESSION_SECRET=super_secret_session_key_replace_me_12345

# Google OAuth 2.0 Credentials (Optional for Google login, required if using Google Auth)
# Get credentials from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

### 3. Frontend & Body Language Service
- **Body Language Service:** No required environment variables (runs standalone using local models & OpenCV).
- **Frontend:** Directly communicates with `http://localhost:8000`, `http://localhost:8001`, and `http://localhost:4000`. No `.env` strictly required for default local setup.

---

## 📦 Step-by-Step Installation & Execution

Open **PowerShell** or **Command Prompt** in the project root (`c:\Users\Admin\Desktop\AI-Preparation`) and follow the steps below:

### Step 1: Set Up and Run the Auth Backend (Node.js)

```powershell
# Navigate to auth-backend directory
cd auth-backend

# Install node packages
npm install

# Start the authentication server
node index.js
```
> 🌐 Runs at: **`http://localhost:4000`**

---

### Step 2: Set Up and Run the Main Backend (Python)

In a new terminal window:

```powershell
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1
# If using Command Prompt (cmd), run: venv\Scripts\activate.bat

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Start backend server
python main.py
```
> 🌐 Runs at: **`http://localhost:8000`** (Swagger docs at `http://localhost:8000/docs`)

---

### Step 3: Set Up and Run the Body Language Service (Python)

In a new terminal window:

```powershell
# Navigate to body-language-service directory
cd body-language-service

# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1
# If using Command Prompt (cmd), run: venv\Scripts\activate.bat

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Start the service
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```
> 🌐 Runs at: **`http://localhost:8001`** (WebSocket endpoint at `ws://localhost:8001/ws/{session_id}`)

---

### Step 4: Set Up and Run the Frontend (Next.js)

In a new terminal window:

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the Next.js development server
npm run dev
```
> 🌐 Open your browser at: **`http://localhost:3000`**

---

## ⚡ Quick One-Click Launch (After Dependencies are Installed)

Once you have installed the dependencies and created virtual environments in `backend` and `body-language-service`, you can update and run the root batch script:

```powershell
.\run_platform.bat
```

*(Note: We can also update `run_platform.bat` to include the `auth-backend` server launch alongside the other 3 services.)*

---

## ⚠️ Troubleshooting & Tips

1. **PowerShell Script Execution Policy Error:**
   If running `Activate.ps1` gives an execution policy error:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
2. **PyTorch / OpenCV download sizes:**
   The `backend` and `body-language-service` require Torch and DeepFace/MediaPipe. Make sure you have a stable internet connection during `pip install -r requirements.txt`.
3. **Groq API Free Tier:**
   Ensure your `GROQ_API_KEY` is valid at [console.groq.com](https://console.groq.com/keys) so question generation doesn't fail.
4. **MongoDB Connection:**
   Ensure MongoDB service is running before starting `auth-backend`.
