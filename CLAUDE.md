# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI政策通** is an AI-driven policy analysis and precise push platform that helps enterprises accurately grasp declaration windows. The system features:
- Policy file automatic parsing (PDF/Word → structured data)
- Enterprise intelligent matching (multi-dimensional scoring algorithm)
- Deadline intelligent reminders (Feishu + WeChat dual channels)
- Policy change tracking (version difference comparison analysis)
- Full-text search engine (Elasticsearch < 2s response)

## Development Commands

### Frontend (Vue 3)

```bash
# Development server
cd frontend
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

### Backend (Node.js/Express)

```bash
# Development server (with hot reload)
cd backend
npm run dev

# Production server
npm start

# Database migrations
npm run db:migrate

# Run tests
npm test
```

### Docker Deployment

```bash
# Start all services (MySQL + Redis + Elasticsearch)
docker-compose up -d mysql redis elasticsearch

# Start backend service
cd backend
docker build -t ai-policy-backend .
docker run -p 3000:3000 ai-policy-backend
```

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     用户层 (Vue 3)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 政策管理  │ │ 企业管理  │ │ 匹配中心  │ │ 提醒设置  │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
│       └────────────┴────────────┴────────────┘              │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │ RESTful API
┌──────────────────────────────┼──────────────────────────────┐
│                       API网关层 (Express)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ JWT认证 + CORS + 限流(15min/1000req) + 日志(Winston) │   │
│  └──────────────────────────────────────────────────────┘   │
│         │            │            │            │            │
│  ┌──────▼──────┐ ┌───▼────┐ ┌───▼────┐ ┌───▼────┐       │
│  │  政策控制器  │ │企业控制│ │匹配控制│ │搜索控制│       │
│  └──────┬──────┘ └───┬────┘ └───┬────┘ └───┬────┘       │
└─────────┼────────────┼────────────┼────────────┼───────────┘
          │            │            │            │
┌─────────▼────────────▼────────────▼────────────▼───────────┐
│                        服务层                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │LLM Service│ │FileParse │ │Matching  │ │Search ES │     │
│  │(OpenAI/  │ │(PDF/Word)│ │Engine    │ │(全文检索)│     │
│  │ 通义千问) │ │          │ │(四维评分)│ │Service   │     │
│  └─────┬────┘ └──────────┘ └─────┬────┘ └─────┬────┘     │
│  ┌─────▼──────────────────────────▼──────────▼─────┐     │
│  │              Reminder Service (Bull Queue)        │     │
│  │  ┌─────────────┐  ┌─────────────┐                 │     │
│  │  │ Feishu Bot  │  │ Wechat Msg  │                 │     │
│  │  │ (卡片消息)   │  │ (模板消息)   │                 │     │
│  │  └─────────────┘  └─────────────┘                 │     │
│  └───────────────────────────────────────────────────┘     │
└──────────────────────────┬────────────────────────────────┘
                          │
┌──────────────────────────▼────────────────────────────────┐
│                         数据层                             │
│  ┌──────────┐ ┌────────┐ ┌──────────────┐ ┌──────────┐   │
│  │ MySQL 8  │ │ Redis  │ │Elasticsearch  │ │ MinIO/OSS│   │
│  │(Sequelize)│ │(ioredis)│ │  8.x         │ │(文件存储)│   │
│  └──────────┘ └────────┘ └──────────────┘ └──────────┘   │
└───────────────────────────────────────────────────────────┘
```

### Key Components

#### Frontend
- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite
- **UI Library**: Element Plus
- **State Management**: Pinia
- **HTTP Client**: Axios
- **Charts**: ECharts

#### Backend
- **Framework**: Express.js
- **ORM**: Sequelize (MySQL)
- **Cache**: Redis
- **Search**: Elasticsearch
- **Queue**: Bull (Redis-based)
- **File Parsing**: pdf-parse, mammoth
- **AI Integration**: OpenAI / 通义千问
- **Messaging**: Feishu Bot, WeChat

### Database Models

Key database models include:
- `Policy`: 政策表 (20+ fields)
- `Enterprise`: 企业表 (25+ fields) 
- `MatchResult`: 匹配结果表
- `Reminder`: 提醒记录表
- `User`: 用户认证表
- `PolicyVersion`: 版本历史表

### API Structure

#### Authentication
- `/api/auth/login` - User login
- `/api/auth/register` - User registration
- `/api/auth/profile` - Get current user info

#### Policy Management
- `/api/policies/upload` - Upload and parse policy files
- `/api/policies/:id/publish` - Publish policy
- `/api/policies/:id/compare` - Version comparison

#### Enterprise Management
- `/api/enterprises/import` - Batch import Excel
- `/api/enterprises/template/download` - Download import template

#### Matching Engine
- `/api/matches/match` - Execute policy matching
- `/api/matches/results` - Get matching results

#### Search Service
- `/api/search` - Advanced search
- `/api/search/suggestions` - Search suggestions

### Environment Configuration

Key environment variables (see `.env.example` in backend):
- Database: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Redis: `REDIS_HOST`, `REDIS_PORT`
- Elasticsearch: `ES_NODE`
- JWT: `JWT_SECRET`
- LLM Provider: `LLM_PROVIDER`, `OPENAI_API_KEY` or `QWEN_API_KEY`
- Messaging: `FEISHU_APP_ID`, `WECHAT_APPID`, etc.

### Development Workflow

1. **Setup Infrastructure**: Start MySQL, Redis, Elasticsearch
2. **Configure Environment**: Copy `.env.example` to `.env` and fill in credentials
3. **Install Dependencies**: `npm install` in both frontend and backend
4. **Database Migration**: `npm run db:migrate` in backend
5. **Start Services**: 
   - Backend: `npm run dev`
   - Frontend: `npm run dev` (in separate terminal)
6. **Access**: http://localhost:8080

### Testing

```bash
# Run backend tests
cd backend
npm test

# Run specific test file
npm test -- --testNamePattern="PolicyController"
```

### Deployment

For production deployment, use Docker with the provided Dockerfile. The system supports:
- Multi-container setup with Docker Compose
- PM2 process management for production
- Nginx reverse proxy for HTTPS
- Regular database backups
- Health monitoring and logging

### Key Features to Maintain

- **Policy Parsing Accuracy**: ≥90% target for key field extraction
- **Matching Algorithm**: Four-dimensional weighted model (industry×0.30 + scale×0.25 + qualification×0.25 + region×0.20)
- **Reminder System**: Five-tier deadline notifications (30/15/7/3/1 days)
- **Search Performance**: <200ms response time for full-text search
- **Version Comparison**: Accurate detection of policy changes with impact assessment

### Common Issues & Solutions

- **LLM API Failures**: Check API keys, network connectivity, and consider switching to alternative providers
- **Elasticsearch Issues**: Verify memory settings, IK plugin installation, and vm.max_map_count
- **Matching Accuracy**: Ensure complete enterprise tagging and consider adjusting weight coefficients
- **Message Delivery**: Check user configuration (feishuUserId, wechatOpenId) and API rate limits

This guidance should help future instances of Claude Code understand the project structure, development workflow, and key architectural decisions.