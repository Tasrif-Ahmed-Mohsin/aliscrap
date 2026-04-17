# AliScrap 🛒🕸️

> **Proprietary Software | All Rights Reserved.**
> ⚠️ **Notice:** This repository and its source code are strictly confidential and proprietary. Unauthorized copying, distribution, modification, or commercial use is explicitly prohibited.

AliScrap is a powerful data extraction API built with Node.js, Express, and Puppeteer. It acts as an automated headless browser proxy designed to scrape detailed product information directly from Alibaba and 1688 product pages. 

The project includes a full backend REST API as well as an easy-to-use frontend web interface.

---

## ✨ Features

- **Accurate Product Extraction:** Extracts complete details from Alibaba/1688 product pages, including Title, Pricing, Sales Count, SKU variant mappings, and high-resolution Image Galleries.
- **RESTful API Endpoint:** Send a URL to the API and receive structured JSON data instantly.
- **Web Interface Included:** Comes with a built-in interactive frontend (`/public`) to input URLs and view scraped results easily.
- **Headless Browsing (Puppeteer):** Navigates complex, JavaScript-heavy product pages as a real Chrome browser. Let the page load, parse the DOM, and extract evaluated JS contexts seamlessly.
- **Anti-Bot Circumvention:** Uses custom User-Agents, realistic accept-language headers, and disables `AutomationControlled` blink features to reduce blocking.
- **CORS Support:** Ready to be connected to any external frontend or web application via Cross-Origin Resource Sharing.

---

## 🛠️ Technology Stack

- **Backend Framework:** Node.js (v20+) & [Express](https://expressjs.com/)
- **Web Scraper Engine:** [Puppeteer](https://pptr.dev/) (Headless Chromium)
- **Middleware:** `cors`, `express.json()`
- **Frontend:** HTML/CSS/JS served statically.

---

## ⚖️ Legal & Copyright Warning

**© 2026 Tasrif Ahmed Mohsin. All Rights Reserved.**

This software is **closed-source and proprietary**. You do not have permission to copy, modify, distribute, sell, or use any portion of this codebase for personal, educational, or commercial purposes. 

Any unauthorized access, duplication, theft, or usage of this codebase will result in immediate legal action. By viewing this repository, you agree to comply with copyright laws protecting this intellectual property. 

Please see the [LICENSE](./LICENSE) file for more information.