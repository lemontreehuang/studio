# WebSQLite Studio ⚡️ (Local-First PWA Edition)

[🇨🇳 简体中文](README_zh.md) | [🇺🇸 English](README.md)

> 💡 **Acknowledgement**: This project is a heavily enhanced fork of the amazing [Outerbase Studio](https://github.com/outerbase/studio). While the original project is a fantastic universal database GUI, this fork is specifically optimized for **Local-First SQLite management, Offline PWA experiences, and AI-driven interactions**.

WebSQLite Studio 是一款基于浏览器的纯本地轻量级 SQL 数据库管理工具。它无需安装任何服务端，让您能以原生桌面软件的体验，在浏览器中直接管理和编辑本地硬盘上的 `.db` 和 `.sqlite` 文件。

## ✨ 为什么选择这个增强版？ (Why this fork?)

在原版 Outerbase Studio 强大的查询、数据编辑和关系图功能基础上，我们为您加入了以下独家特性：

* 🚀 **纯离线 PWA 桌面级体验**：支持安装为独立应用，自带断网 Fallback。无论何时何地，断网依然可用。
* 📂 **原生文件系统读写 (FileSystem Access API)**：告别繁琐的“修改后重新下载”。直接拖拽本地文件入窗口，按下保存即可静默原位覆盖您的物理硬盘文件。
* 🔒 **多开并发防腐败安全锁 (Web Locks)**：完美解决多个浏览器页签打开同一个本地数据库时的冲突问题。独占锁定，保护您的珍贵数据。
* 🤖 **DeepSeek AI 智能体接入**：内置最强开源 AI，通过自然语言对话即可帮您生成复杂 SQL、分析数据趋势和解读表结构。
* 🇨🇳 **全面中文化 (i18n)**：对复杂的表编辑器、ER关系图、仪表盘等进行了深度的本地化汉化，操作更符合国人直觉。
* 📌 **智能主页收录系统**：随时在工具栏点击“📌 固定”，将高频查询的数据库固化在主页，支持会话保持，刷新网页永不丢失。

## 🛠️ 原版核心功能 (Core Features from Upstream)
- **查询编辑器**：带自动补全和函数提示。
- **高性能数据表**：轻松渲染上万行数据，支持 CRUD 和暂存提交。
- **可视化 Schema 编辑**：点点鼠标即可修改表结构，无需编写 DDL 语句。
- **ER 关系图 (Relational Diagram)**：一键生成数据库架构的高清图片并导出。

## 📦 如何运行与部署 (Getting Started)

```bash
# 1. 克隆代码
git clone https://github.com/your-username/websqlite-studio.git
cd websqlite-studio

# 2. 安装依赖
npm install

# 3. 运行本地开发服务器
npm run dev
```
打开 `http://localhost:3000` 即可开始使用。点击浏览器地址栏右侧的“安装”图标，即可将其固定到您的操作系统任务栏。

## 📄 协议与致谢 (License & Credits)
* 本项目基于 [Outerbase Studio](https://github.com/outerbase/studio) 深度二次开发。
* 核心代码依旧遵循原仓库的 **MIT License**。感谢 Outerbase 团队提供的惊艳开源底座。
