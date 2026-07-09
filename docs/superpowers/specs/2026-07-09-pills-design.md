# Pills 设计规格文档

**日期**: 2026-07-09
**项目**: Pills — 焦虑发作时的即时冷静引导工具
**仓库**: https://github.com/bwang00/pills

## 项目概述

Pills 是一个 Web 应用，为焦虑发作的用户提供即时引导帮助其冷静下来。通过可视化动画、多步骤感官引导和 AI 动态生成内容，帮助用户在最需要的时候快速获得支持。

## 技术架构

前后端分离架构：

- **后端**: FastAPI（Python），提供 RESTful API + WebSocket
- **前端**: React + Vite，组件化开发，动画使用 CSS keyframes + framer-motion
- **AI 层**: 阿里云千问 API，后端封装统一接口，提供动态引导内容生成
- **数据层**: Supabase（PostgreSQL），第一阶段用于存储引导内容和用户会话记录
- **部署**: Vercel 自动部署（push to main 触发），后端为 Vercel Serverless Functions，前端为 Vite SPA
- **环境配置**: 与 fundTracking 项目保持一致的 Supabase 配置模式

### 目录结构

```
pills/
├── api/                    # Vercel Serverless Functions (FastAPI)
│   ├── guides.py
│   └── ai.py
├── frontend/
│   ├── src/
│   │   ├── components/     # 呼吸圈、引导卡片等组件
│   │   ├── pages/          # 首页、引导页、AI对话页
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── supabase/               # Supabase migrations 和 seed
│   └── migrations/
├── tests/
├── vercel.json
├── .env.example
└── README.md
```

## 开发策略

采用分阶段迭代方式开发：

### 第一阶段（当前）

核心引导功能 + 基础框架：深呼吸引导、5-4-3-2-1 感官着陆、首页。

### 第二阶段（后续）

渐进式肌肉放松、正念冥想、千问 AI 动态生成引导内容。

## 第一阶段功能设计

### 1. 深呼吸引导

- 动画呼吸圈：吸气时放大、屏息时保持、呼气时缩小
- 支持多种呼吸模式：4-7-8 呼吸法、Box Breathing 方块呼吸
- 文字提示跟随节奏显示"吸气 / 屏息 / 呼气"
- 用户可选择呼吸模式和单轮时长

### 2. 5-4-3-2-1 感官着陆

- 逐步引导：5 个你能看到的 → 4 个你能触摸的 → 3 个你能听到的 → 2 个你能闻到的 → 1 个你能尝到的
- 每一步有输入框让用户记录，或点击"跳过"
- 进度条显示当前阶段

### 3. 首页

- 简洁温暖的视觉设计
- 两个大卡片入口：「深呼吸」和「感官着陆」
- 底部预留 AI 对话入口（第二阶段）

### 4. API 设计

- `GET /api/guides` — 获取所有引导列表
- `GET /api/guides/{id}` — 获取单个引导配置（呼吸模式参数、着陆步骤等）
- WebSocket `/ws/breathing` — 呼吸引导实时动画同步（可选）

## UI 风格

- **色调**: 柔和蓝绿色系，避免刺激性颜色，营造安静安全感
- **动画**: 缓动曲线，所有过渡平滑柔和，呼吸圈用 CSS keyframes 实现
- **排版**: 大字体、高对比度，焦虑发作时用户注意力涣散，信息要一眼能看清
- **响应式**: 优先移动端适配，很多用户焦虑时会使用手机

## 错误处理

- **前端**: API 请求失败时显示温和提示（非红色报错），自动重试一次
- **后端**: 千问 API 超时或不可用时 fallback 到预设引导内容，不影响核心功能
- **数据库**: Supabase 连接异常时，前端内置默认引导内容可离线使用

## 环境变量

参照 fundTracking 项目的配置模式，`.env.example` 包含：

```
# --- Supabase ---
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# --- Frontend (Vite) ---
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# --- AI ---
QWEN_API_KEY=your-qwen-api-key-here
```

## 部署

- **Vercel**: 绑定 GitHub 仓库，push to main 自动部署
- **vercel.json**: 配置前端 build 命令和后端 serverless functions
- **Supabase**: 通过 Supabase CLI 管理数据库 migration
- **环境密钥**: 在 Vercel Dashboard 配置，与 fundTracking 共享同一个 Supabase 项目或使用独立项目

## 测试

- **后端**: pytest 覆盖 API 端点和 AI 接口封装
- **前端**: 核心组件单元测试（呼吸圈计时逻辑、着陆步骤流转）
- **CI**: GitHub Actions 自动跑测试
