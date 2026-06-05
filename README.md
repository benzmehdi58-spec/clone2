---
title: CyberAI NIDS
emoji: 🛡️
colorFrom: blue
colorTo: red
sdk: docker
app_port: 7860
pinned: true
license: mit
short_description: AI-powered Network Intrusion Detection System with multi-model threat detection
---

# CyberAI NIDS — AI-Powered Network Intrusion Detection System

A full-stack cybersecurity platform that integrates multiple ML/DL models for real-time threat detection across network traffic, SSH auth logs, and insider threat behavior.

## Detection Models

| Model | Architecture | Dataset | Task |
|-------|-------------|---------|------|
| **Network Classifier** | LightGBM → XGBoost → PyTorch Autoencoder | CIC-IDS2017 | 3-stage: binary → 21-class → zero-day |
| **SSH Auth Detector** | CNN + Bi-LSTM + Attention + Focal Loss | LogHub SSH | Brute-force & scan detection |
| **Insider Threat (UEBA)** | MultiScale CNN + Bi-LSTM + 8-Head Attention | CERT r4.2 (CMU SEI) | Behavioral anomaly detection |
| **System Log Detector** | LSTM + Random Forest | HDFS | Log anomaly detection |

## Platform Features

- 🔍 **Real-time alert feed** with MITRE ATT&CK mapping
- 🤖 **LangChain ReAct Analyst Agent** — auto-generates incident reports
- 📊 **RAG Vulnerability Analyzer** — ChromaDB + sentence-transformers + Claude API
- 🔗 **Correlation Engine** — links related alerts within 300s windows
- 📡 **WebSocket live broadcast** of new detections
- 🗄️ **SQLite + FastAPI** backend, React + Vite frontend

## Running Locally

```bash
# Frontend
npm install
npm run dev

# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```