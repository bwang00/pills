# AI 对话页重构 — Design Spec

## Overview

将 AI 对话页从简单的聊天界面重构为双栏布局的深度心理咨询体验，支持对话持久化、话题标签提取和筛选。分两个阶段实现。

## Requirements

- **布局** — 双栏布局：左侧对话区，右侧话题标签列表
- **对话持久化** — 对话历史存储在 Supabase，支持跨设备
- **话题标签** — 对话结束时用 AI 批量提取 3-5 个话题标签
- **标签展示** — 右侧栏显示所有历史对话的标签聚合（去重 + 计数）
- **标签筛选** — 点击标签筛选相关对话
- **对话管理** — 自动保存，支持删除

## Phase 1: 对话持久化

### 数据库设计

**`conversations` 表：**
- id (uuid, primary key)
- created_at (timestamptz)
- updated_at (timestamptz)

**`conversation_messages` 表：**
- id (uuid, primary key)
- conversation_id (uuid, foreign key → conversations.id)
- role (text: 'user' | 'assistant')
- content (text)
- created_at (timestamptz)

### 后端 API

- `POST /api/conversations` — 创建新对话，返回 conversation_id
- `POST /api/conversations/:id/messages` — 保存消息
- `GET /api/conversations` — 获取对话列表（按 updated_at DESC）
- `GET /api/conversations/:id` — 获取单个对话详情（含所有消息）
- `DELETE /api/conversations/:id` — 删除对话（级联删除消息）

### 前端

- 双栏布局：左侧对话区（占 70%），右侧标签列表（占 30%，Phase 1 显示"功能开发中"）
- 自动保存：每条消息实时保存到 Supabase
- 对话列表：右侧栏显示历史对话列表（Phase 1 先显示列表，Phase 2 显示标签）
- 支持删除对话

## Phase 2: 话题标签

### 数据库设计

**`conversation_tags` 表：**
- id (uuid, primary key)
- conversation_id (uuid, foreign key → conversations.id)
- tag (text)
- created_at (timestamptz)

### 后端 API

- `POST /api/conversations/:id/extract-tags` — 对话结束时调用 Qwen API 提取标签
- `GET /api/tags` — 获取所有标签（聚合 + 计数，按计数 DESC）
- `GET /api/conversations?tag=xxx` — 按标签筛选对话

### 前端

- 右侧栏显示话题标签列表（带计数）
- 点击标签筛选相关对话
- 对话结束时自动触发标签提取

## Architecture

### 对话流程

1. 用户打开对话页 → `POST /api/conversations` 创建新对话
2. 用户发送消息 → `POST /api/conversations/:id/messages` 保存消息
3. AI 回复 → `POST /api/conversations/:id/messages` 保存回复
4. 用户离开对话页 → `POST /api/conversations/:id/extract-tags` 提取标签（Phase 2）
5. 用户点击标签 → `GET /api/conversations?tag=xxx` 筛选对话
6. 用户删除对话 → `DELETE /api/conversations/:id`

### 标签提取

对话结束时，后端用 Qwen API 分析整个对话，提取 3-5 个话题标签：

```
System: 你是一个话题标签提取助手。分析以下对话，提取 3-5 个关键话题标签。
标签应该是简短的中文词组（2-6个字），比如"工作压力"、"人际关系"、"焦虑情绪"。
只返回 JSON 数组，格式：["标签1", "标签2", "标签3"]

User: [对话内容]
```

## Error Handling

- 消息保存失败：静默失败，不阻断对话（用户可能网络不好）
- 标签提取失败：静默失败，不影响对话历史
- 对话加载失败：显示错误提示，提供重试按钮

## Testing

### Phase 1

- 后端：测试所有 conversations API（创建、保存消息、获取列表、删除）
- 前端：测试消息保存、对话加载、删除功能

### Phase 2

- 后端：测试标签提取 API、标签聚合查询、按标签筛选
- 前端：测试标签显示、点击筛选

## Out of Scope

- 心情追踪（未来可扩展）
- 对话摘要（未来可扩展）
- 消息搜索（未来可扩展）
- 对话导出（未来可扩展）
