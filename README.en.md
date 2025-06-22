# Volcengine Ark Quota Manager

[English](./README.en.md) | [中文](./README.md)

A Tampermonkey script for automatically managing inference quotas of Volcengine Ark large language models. It helps you close quotas with one click, intelligently set or batch set fixed quotas, allowing you to utilize daily free tokens more efficiently.

![Script interface screenshot](https://raw.githubusercontent.com/guihuashaoxiang/volcengine-ark-quota-manager/main/screenshot.png) 
> **Tip:** You can replace the screenshot URL with your own repository link. It's recommended to upload a screenshot of the script interface named `screenshot.png` to your repository.

---

### Background

Volcengine Ark provides generous "Collaboration Reward Program" with hundreds of thousands or even millions of free tokens daily for each large language model. However, these quotas reset daily and unused tokens will be wasted.

Manually enabling and setting inference quotas for dozens of models is repetitive and time-consuming. This script automates quota management (enabling, disabling and setting values) to help you fully utilize free resources without waste.

### Key Features

* **One-click disable all quotas**: Automatically traverses all pages and disables all enabled quotas.
* **Smart quota setting**: Automatically enables quotas for models with **disabled quotas** and **remaining tokens above threshold**. New quota value can be set as `remaining tokens - specified deduction` to utilize free tokens while keeping buffer.
* **Fixed value setting**: Batch enables and sets a fixed value you specify for all models with **disabled quotas**.
* **Cross-page automation**: All operations support automatic pagination without manual intervention.
* **Operation interruption**: Click "Stop" button to safely abort script during any operation.
* **Visual control panel**: Provides a clear floating window at bottom-right corner for all operations.

### Installation

1. **Install Tampermonkey extension**:
   * If not installed, first install [Tampermonkey](https://www.tampermonkey.net/) for your browser (Chrome, Firefox, Edge).
2. **Install this script**:
   * Click this link to install: [**https://raw.githubusercontent.com/guihuashaoxiang/volcengine-ark-quota-manager/main/volcengine-ark-quota-manager.user.js**](https://raw.githubusercontent.com/guihuashaoxiang/volcengine-ark-quota-manager/main/volcengine-ark-quota-manager.user.js)
   * Tampermonkey will automatically show installation page, click "Install".

### Usage

1. Visit Volcengine Ark's [**Model Management Page**](https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement).
2. The script will generate a "Quota Manager" control panel at bottom-right corner.
3. Click corresponding buttons based on your needs:
   * **Disable All Quotas**: Script will start disabling all enabled quotas.
   * **Smart Setting**:
     * First set "Remaining tokens above" threshold and "Deduct" value in input fields.
     * Example: Set `Above 100000`, `Deduct 30000`. Script will find models with remaining tokens > 100000 and disabled quotas, then set quota to `remaining tokens - 30000`.
     * Click "Start Smart Setting" to execute.
   * **Fixed Value**:
     * Enter desired fixed quota value (e.g. `500000`) in input field.
     * Click "Start Fixed Setting" to enable and set this value for all models with disabled quotas.
4. During operation, buttons become disabled while "Stop" button activates. You can click "Stop" anytime to abort.
5. Detailed logs can be viewed in browser's Developer Tools console (press `F12`).

### Contribution

Welcome to submit Pull Requests or Issues to improve this project. If you have ideas or find bugs, let's make it better together!

### License

This project is licensed under [MIT License](LICENSE).
