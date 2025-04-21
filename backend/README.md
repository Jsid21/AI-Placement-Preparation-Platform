# Backend Setup Guide

Follow these steps to set up and run the backend using a Python virtual environment (`venv`):

## 1. Clone the repository

```bash
git clone <your-repo-url>
cd AI-Placement-Preparation-Platform/backend
```

## 2. Create and activate a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate
```

## 3. Install dependencies

```bash
pip install -r requirements.txt
```

## 4. Download TextBlob corpora (required for sentiment analysis)

```bash
python -m textblob.download_corpora
```

## 5. Run the backend server

```bash
uvicorn app.main:app --reload
```

---

**Note:**  
Always activate your virtual environment (`source venv/bin/activate`) before running backend commands.