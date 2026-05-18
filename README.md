# Outerbase Studio

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/outerbase/studio)

**Outerbase Studio** is a lightweight, browser-based GUI for managing SQL databases, designed for simplicity and versatility. Initially built for LibSQL and SQLite, it now supports a broad range of databases, including:

**Supported Databases:**

- **SQLite-based Database**
  - Turso/LibSQL
  - SQLite (local files)
  - Cloudflare D1
  - rqlite
  - StarbaseDB
  - Val.town
- MySQL (beta, limited features)
- PostgreSQL (beta, limited features)

---

Give it a try directly from your browser

[![LibSQL Studio, sqlite online editor](https://github.com/user-attachments/assets/5d92ce58-9ce6-4cd7-9c65-4763d2d3b231)](https://libsqlstudio.com)
[![Libsql studio playground](https://github.com/user-attachments/assets/dcf7e246-fe72-4351-ab10-ae2d1658087d)](https://libsqlstudio.com/playground/client?template=chinook)

## Desktop App

You can download [Windows and Mac desktop app here](https://github.com/outerbase/studio-desktop/releases/).

Outerbase Studio Desktop is a lightweight Electron wrapper for the Outerbase Studio web version. It enables support for drivers that aren't feasible in a browser environment, such as MySQL and PostgreSQL.

## Features

![libsqlstudio-git-preview (7)](https://github.com/user-attachments/assets/1d7a3d90-61e3-4a77-83a5-4bb096bbfb4b)

- **Query Editor**: It features a user-friendly query editor equipped with auto-completion and function hint tooltips. It allows you to execute multiple queries simultaneously and view their results efficiently.
- **Data Editor**: It comes with a powerful data editor, allowing you to stage all your changes and preview them before committing. The data table is highly optimized and lightweight, capable of rendering thousands of rows and columns efficiently.
- **Schema Editor**: It allows you to quickly create, modify, and remove table columns with just a few clicks without writing any SQL.
- **Connection Manager**: It includes a flexible connection manager, allowing you to store your connections locally in your browser. You can also store them on a server and share your connections across multiple devices.

The features mentioned above are just a few of the many we offer. Give it a try to explore everything we have in store

## Recent Enhancements (WebSQLite PWA Edition)

We've recently modernized the application architecture to deliver a robust, native-like offline desktop experience directly within your browser:

- **Progressive Web App (PWA) Integration**: Configured full PWA capabilities via Serwist. WebSQLite Studio can now be installed as a standalone, offline-first application on your OS.
- **Offline Playground & Native File Access**: Introduced an offline-capable Playground that utilizes the modern `FileSystem Access API`. You can now directly mount, edit, and incrementally save local SQLite `.db` files without relying on repetitive downloads or uploads.
- **Cross-Tab Concurrency Protection**: Integrated the Web Locks API and BroadcastChannel. If the same local database is opened across multiple tabs, the system automatically engages an exclusive lock, preventing data corruption and visually alerting the active tab.
- **Intelligent Safety Nets & Auto-Save**: Engineered a robust safety system that intercepts accidental tab closures, destructive file drops, or database switching if there are unsaved changes. Complemented by a silent, background auto-save feature.
- **Dashboard Persistence System**: Added an intuitive Pin/Unpin (`📌 固定到主页/取消固定`) state manager in the toolbar. Newly saved databases intelligently prompt to be tracked in the dashboard, turning ephemeral sandbox sessions into persistent projects.
- **Advanced Schema Visualization**: Added an interactive Relational Database Diagram (ERD) tab with a sophisticated layout engine and export functionality, alongside new bulk table management and column filtering utilities.
- **Comprehensive i18n Localization (Chinese)**: Completely localized the application interface into Chinese (zh-CN), including the complex data table editor, schema editor, and dashboard, ensuring a highly accessible, native experience.
- **DeepSeek AI Agent Integration**: Integrated the powerful DeepSeek model as a built-in AI assistant. The agent can seamlessly interact with your database to auto-generate SQL queries, explain schemas, and perform intelligent data analysis directly within your workspace.
- **True Offline Mode & Caching**: Created a dedicated offline fallback page and optimized service worker caching. The studio functions flawlessly even when disconnected from the internet, ensuring your local data management is never interrupted.
- **Drag & Drop Database Loading**: Engineered a global drag-and-drop zone. You can now seamlessly drag `.db` or `.sqlite` files straight from your OS desktop into the browser window to instantly load and edit them.
- **Session Recovery (Handle Serialization)**: Developed a sophisticated IndexedDB serialization system for FileSystem handles. The playground preserves your active workspace via a unique URL session ID (`?s=...`), allowing you to refresh the browser without dropping the file connection or losing your workspace state.
