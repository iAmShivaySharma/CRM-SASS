# CRM-X-SHIVAY Documentation

## Directory Structure

```
docs/
├── core/                     # System documentation (volumes)
│   ├── 01-INTRODUCTION.md
│   ├── 02-API-REFERENCE.md
│   ├── 03-DATABASE-SCHEMA.md
│   ├── 04-DEVELOPMENT-GUIDE.md
│   ├── 05-DEPLOYMENT-SECURITY.md
│   ├── 06-TESTING-TROUBLESHOOTING.md
│   └── PERMISSION-SYSTEM.md
│
├── architecture/             # System design & plans
│   ├── EXECUTION_ENGINE_PLAN.md
│   └── WORKFLOW_ENGINE_PLAN.md
│
├── guides/                   # How-to guides
│   ├── QUICK-START-SETUP.md
│   ├── EMAIL_INTEGRATION_SETUP.md
│   ├── EMAIL_MODULE_COMPLETE_GUIDE.md
│   ├── WEBHOOK_TESTING_GUIDE.md
│   └── performance-optimization/
│       └── PERFORMANCE_OPTIMIZATION_GUIDE.md
│
├── devops/                   # Infrastructure & operations
│   ├── DOCKER-GUIDE.md
│   ├── KUBERNETES-GUIDE.md
│   ├── CICD-GUIDE.md
│   ├── DEVOPS-GUIDE.md
│   └── SECURITY-GUIDE.md
│
├── postman/                  # API testing collections
│   ├── CRM_Complete_API_Updated.postman_collection.json
│   └── CRM_Environment_Updated.postman_environment.json
│
├── strategy/                 # Business & growth docs
│   └── CRM-SAAS-GROWTH-STRATEGY.md
│
└── README.md                 # This file
```

---

## Core Documentation (Volumes)

| Volume | Title | Description |
|--------|-------|-------------|
| [01](./core/01-INTRODUCTION.md) | Introduction & Overview | System architecture, features, tech stack |
| [02](./core/02-API-REFERENCE.md) | API Reference | All endpoints, auth, request/response formats |
| [03](./core/03-DATABASE-SCHEMA.md) | Database Schema | MongoDB collections, indexes, relationships |
| [04](./core/04-DEVELOPMENT-GUIDE.md) | Development Guide | Environment setup, coding standards |
| [05](./core/05-DEPLOYMENT-SECURITY.md) | Deployment & Security | Production deployment, security practices |
| [06](./core/06-TESTING-TROUBLESHOOTING.md) | Testing & Troubleshooting | Test strategies, debugging, common issues |
| - | [Permission System](./core/PERMISSION-SYSTEM.md) | RBAC roles and permissions reference |

## Architecture

| Document | Description |
|----------|-------------|
| [Execution Engine Plan](./architecture/EXECUTION_ENGINE_PLAN.md) | n8n workflow execution architecture |
| [Workflow Engine Plan](./architecture/WORKFLOW_ENGINE_PLAN.md) | Workflow automation system design |

## Guides

| Guide | Description |
|-------|-------------|
| [Quick Start Setup](./guides/QUICK-START-SETUP.md) | Local & Docker dev environment setup |
| [Email Integration](./guides/EMAIL_INTEGRATION_SETUP.md) | Resend email provider setup |
| [Email Module](./guides/EMAIL_MODULE_COMPLETE_GUIDE.md) | Complete email system guide |
| [Webhook Testing](./guides/WEBHOOK_TESTING_GUIDE.md) | Webhook setup and testing |
| [Performance Optimization](./guides/performance-optimization/PERFORMANCE_OPTIMIZATION_GUIDE.md) | Scaling to 10M users — Redis, BullMQ, Meilisearch, CDN |

## DevOps

| Guide | Description |
|-------|-------------|
| [Docker](./devops/DOCKER-GUIDE.md) | Container setup and configuration |
| [Kubernetes](./devops/KUBERNETES-GUIDE.md) | K8s deployment manifests |
| [CI/CD](./devops/CICD-GUIDE.md) | GitHub Actions pipeline |
| [DevOps Overview](./devops/DEVOPS-GUIDE.md) | Infrastructure overview |
| [Security](./devops/SECURITY-GUIDE.md) | Security hardening guide |

## API Testing

- [Postman Collection](./postman/CRM_Complete_API_Updated.postman_collection.json)
- [Postman Environment](./postman/CRM_Environment_Updated.postman_environment.json)

## Strategy

- [Growth Strategy](./strategy/CRM-SAAS-GROWTH-STRATEGY.md) — Business growth and scaling plan

---

## Quick Start

1. [Set up your dev environment](./guides/QUICK-START-SETUP.md)
2. [Read the introduction](./core/01-INTRODUCTION.md)
3. [Import the Postman collection](./postman/CRM_Complete_API_Updated.postman_collection.json)
4. [Deploy with Docker](./devops/DOCKER-GUIDE.md)
