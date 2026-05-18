# WebSQLite Studio ⚡️ (Local-First PWA Edition)

[🇨🇳 简体中文](README_zh.md) | [🇺🇸 English](README.md)

> 💡 **Acknowledgement**: This project is a heavily enhanced fork of the amazing [Outerbase Studio](https://github.com/outerbase/studio). While the original project is a fantastic universal database GUI, this fork is specifically optimized for **Local-First SQLite management, Offline PWA experiences, and AI-driven interactions**.

WebSQLite Studio is a lightweight, browser-based pure local SQL database management tool. It requires no backend installation, allowing you to manage and edit local `.db` and `.sqlite` files directly in your browser with a native desktop application experience.

## ✨ Why choose this enhanced fork?

Built upon the powerful querying, data editing, and relational diagram features of the original Outerbase Studio, we've introduced the following exclusive capabilities:

* 🚀 **Pure Offline PWA Desktop Experience**: Supports installation as a standalone application with a built-in offline fallback. Fully functional anytime, anywhere, even without an internet connection.
* 📂 **Native File System Access API**: Say goodbye to the tedious "download after edit" workflow. Drag and drop local files directly into the window, and hit save to silently overwrite your physical hard drive file in place.
* 🔒 **Cross-Tab Concurrency Web Locks**: Perfectly resolves conflicts when the same local database is opened across multiple browser tabs. Exclusive locking protects your precious data from corruption.
* 🤖 **DeepSeek AI Agent Integration**: Built-in integration with the most powerful open-source AI. Use natural language conversations to auto-generate complex SQL, analyze data trends, and interpret table structures.
* 🌐 **Comprehensive i18n Localization**: Deeply localized the complex table editors, ER diagrams, and dashboards, making operations much more intuitive for non-English speakers (Defaults to Chinese `zh-CN`).
* 📌 **Smart Dashboard Persistence**: Click the "📌 Pin" button in the toolbar at any time to persist frequently queried databases to your dashboard. Supports session recovery, so refreshing the page never loses your active workspace.

## 🛠️ Core Features (from Upstream)
- **Query Editor**: Features auto-completion and function tooltips.
- **High-Performance Data Table**: Effortlessly renders tens of thousands of rows, supporting CRUD operations and staged commits.
- **Visual Schema Editor**: Modify table structures with a few clicks without writing DDL statements.
- **ER Relational Diagram**: One-click generation and export of high-definition database architecture diagrams.

## 📦 Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/your-username/websqlite-studio.git
cd websqlite-studio

# 2. Install dependencies
npm install

# 3. Run the local development server
npm run dev
```
Open `http://localhost:3000` to start using it. Click the "Install" icon on the right side of the browser address bar to pin it to your operating system taskbar.

## 📄 License & Credits
* This project is a deeply customized fork based on [Outerbase Studio](https://github.com/outerbase/studio).
* The core codebase remains under the original repository's **MIT License**. We sincerely thank the Outerbase team for providing such an incredible open-source foundation.
