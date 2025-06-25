# Volcengine Ark Quota Manager

[English](./README.en.md) | **中文**

一个油猴脚本，用于自动管理火山方舟（Volcengine Ark）大模型的推理限额。它可以帮助你一键关闭、智能设置或批量设置固定限额，让你更高效地利用每日免费 Tokens。

![脚本操作界面截图](https://raw.githubusercontent.com/guihuashaoxiang/volcengine-ark-quota-manager/main/screenshot.png) 
> **提示:** 你可以将上面截图的 URL 替换为你自己仓库中的截图链接。建议你在仓库中上传一张脚本界面的截图，并命名为 `screenshot.png`。

---

### 背景

火山方舟为开发者提供了非常慷慨的“协作奖励计划”，每日为每个大模型提供数十万甚至数百万的免费 Tokens。然而，这些额度每日都会重置，如果不使用就会浪费。

手动为几十个模型逐一开启和设置推理限额是一个非常重复和耗时的工作。为了解决这个痛点，本脚本应运而生。它能自动化处理限额的开启、关闭和设置，让你每天都能轻松地“薅满羊毛”，避免浪费免费资源。

### 主要功能

*   **一键关闭所有限额**: 自动遍历所有分页，将所有已开启的限额逐一关闭。
*   **智能设置限额**: 自动为**限额已关闭**且**剩余额度高于指定阈值**的模型开启限额。新限额值可设置为 `剩余额度 - 一个指定扣除值`，以充分利用免费额度并保留缓冲空间。
*   **固定值设置**: 自动为所有**限额已关闭**的模型，批量开启并设置为一个你指定的固定值。
*   **跨页自动操作**: 所有操作都支持自动翻页，无需人工干预。
*   **中断操作**: 在任何操作过程中，都可以点击“停止”按钮来安全地中止脚本。
*   **可视化控制面板**: 在页面右下角提供一个简洁明了的悬浮窗口，所有操作一目了然。

### 安装

1.  **安装油猴 (Tampermonkey) 插件**:
    *   如果你还没有安装，请先为你的浏览器（如 Chrome, Firefox, Edge）安装 [Tampermonkey](https://www.tampermonkey.net/) 插件。
2.  **安装本脚本**:
*   点击此链接进行安装: [**https://raw.githubusercontent.com/guihuashaoxiang/volcengine-ark-quota-manager/main/volcengine-ark-quota-manager.user.js**](https://raw.githubusercontent.com/guihuashaoxiang/volcengine-ark-quota-manager/main/volcengine-ark-quota-manager.user.js)
    *   Tampermonkey 会自动弹出安装页面，点击“安装”即可。

### 使用说明

1.  访问火山方舟的[**模型开通管理页面**](https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement)。
2.  脚本会在页面右下角生成一个“模型限额助手”的控制面板。
3.  根据你的需求点击相应的按钮：
    *   **一键关闭所有限额**: 点击后，脚本将开始关闭所有已开启的限额。
    *   **智能设置限额**:
        *   先在输入框中设置“剩余额度大于”的阈值和“值为‘剩余 -’”的扣除值。
        *   例如，设置为 `大于 100000`，`扣除 30000`。脚本会寻找所有剩余额度 > 100000 且限额已关闭的模型，然后将其限额设置为 `剩余额度 - 30000`。
        *   点击“开始智能设置”执行。
    *   **自定义固定值**:
        *   在输入框中填入你想要的固定限额值（如 `500000`）。
        *   点击“开始设置固定值”，脚本会为所有限额已关闭的模型开启并设置此值。
4.  操作过程中，按钮会变为不可用状态，“停止”按钮会激活。你可以随时点击“停止”来中断任务。
5.  在浏览器的开发者工具控制台 (按 `F12`) 中可以查看脚本运行的详细日志。

### 贡献

欢迎提交 Pull Request 或 Issues 来改进这个项目。如果你有任何好的想法或发现了 Bug，请不要犹豫，让我们一起让它变得更好！

### 许可证

本项目采用 [MIT License](LICENSE)。
