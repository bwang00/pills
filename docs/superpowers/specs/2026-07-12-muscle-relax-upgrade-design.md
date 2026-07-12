# 快速肌肉放松升级 — Design Spec

## Overview

升级快速肌肉放松（muscle-relax-quick）的整体体验：添加语音引导、海浪背景音乐、人体图动画、进度可视化。一次性完成所有改进。

## Requirements

- **语音引导** — 每个部位收紧/放松阶段播放对应语音提示
- **背景音乐** — 海浪声，练习期间循环播放
- **人体图动画** — 当前部位发光 + 脉冲，区分收紧（橙色）和放松（蓝绿色）
- **进度可视化** — 顶部进度条显示"3 / 5 个部位"，保留底部小圆点

## Architecture

### 语音引导

复用呼吸练习的 `playVoice` 模式：

- 开始练习时播放 `voice-start.mp3`（已有）
- 每个部位收紧时播放对应语音，如"收紧肩膀"
- 每个部位放松时播放对应语音，如"放松肩膀"
- 练习结束播放 `voice-finish.mp3`（已有）
- 预生成音频文件放到 `frontend/public/audio/`
- 命名：`voice-mr-tense-{部位}.mp3`、`voice-mr-relax-{部位}.mp3`

### 背景音乐

复用 `startBgMusic` / `stopBgMusic`，但使用新的海浪声音频：

- 文件：`frontend/public/audio/ambient-ocean.wav`（需要找/生成）
- 开始练习时播放，3 秒淡入
- 练习结束或用户点击"结束"时淡出停止
- 音量 0.25

### 人体图动画

用 SVG filter + CSS animation 实现：

- **当前部位**：
  - 收紧阶段：橙色光晕脉冲（`#f97316`，`feGaussianBlur` 发光）
  - 放松阶段：蓝绿色光晕脉冲（`calm-400`，`feGaussianBlur` 发光）
  - CSS `@keyframes` 实现脉冲缩放效果
- **非当前部位**：`opacity: 0.3`，变暗突出当前部位
- **切换过渡**：CSS `transition: opacity 0.5s` 平滑淡入淡出

### 进度可视化

- **顶部**：步骤名称横向排列 + 当前步骤高亮 + "3 / 5" 数字
- **进度条**：细长条，填充宽度 = currentStepIndex / totalSteps
- 填充色随阶段变化：收紧时橙色，放松时蓝绿色
- **底部**：保留小圆点作为辅助视觉指示

## Error Handling

- 语音文件不存在时 `playVoice` 已有 `console.warn` 静默处理
- 海浪音频加载失败时 `startBgMusic` 已有 `console.warn` 静默处理
- 音频播放失败不阻断练习流程

## Testing

- 人体图动画：视觉验证，无需自动化测试
- 进度条：验证进度计算正确
- 音频集成：验证 phase 切换时触发正确的音频播放

## Out of Scope

- TTS 动态生成语音（使用预录文件）
- 完整肌肉放松（muscle-relax-full）的同步升级（后续可做）
- 用户自定义背景音乐
