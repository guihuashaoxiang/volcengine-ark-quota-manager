// ==UserScript==
// @name         模型限额自动配置脚本
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  自动批量关闭、智能设置或自定义固定值设置模型推理限额。支持分页、中断操作和更稳定的循环。
// @author       guihuashaoxiang
// @homepageURL  https://github.com/guihuashaoxiang
// @match        https://console.volcengine.com/ark/region*
// @grant        GM_addStyle
// @grant        GM_log
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js
// ==/UserScript==

(function () {
    'use strict';

    // --- 全局状态 ---
    const scriptState = {
        isRunning: false,
    };

    // --- 辅助函数 ---

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * 等待某个元素出现
     * @param {string} selector - CSS选择器
     * @param {number} timeout - 超时时间（毫秒）
     * @param {Element|Document} parent - 在哪个父元素下查找，默认为document
     * @returns {Promise<Element|null>}
     */
    async function waitForElement(selector, timeout = 5000, parent = document) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const element = parent.querySelector(selector);
            if (element) {
                return element;
            }
            await sleep(100);
        }
        console.error(`等待元素超时: ${selector}`);
        return null;
    }

    function setReactInputValue(inputElement, value) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(inputElement, value);
        const event = new Event('input', { bubbles: true });
        inputElement.dispatchEvent(event);
    }

    // --- UI 控制 ---
    function disableActionButtons(isDisabling) {
        document.getElementById('tm-btn-close-all').disabled = isDisabling;
        document.getElementById('tm-btn-set-smart').disabled = isDisabling;
        document.getElementById('tm-btn-set-fixed').disabled = isDisabling; // 新增
        document.getElementById('tm-btn-stop').disabled = !isDisabling;
    }


    // --- 核心功能函数 ---

    function stopScript() {
        scriptState.isRunning = false;
        console.log("--- 用户请求停止脚本 ---");
        disableActionButtons(false);
    }

    /**
     * 功能1：关闭所有模型的推理限额 (无需修改，工作正常)
     */
    async function closeAllLimits() {
        if (scriptState.isRunning) return;
        scriptState.isRunning = true;
        disableActionButtons(true);
        console.log("--- 开始执行：关闭所有模型推理限额 ---");

        let page = 1;
        paginationLoop:
        while (scriptState.isRunning) {
            console.log(`正在处理第 ${page} 页...`);
            await sleep(2500);

            while (scriptState.isRunning) {
                if (!scriptState.isRunning) break paginationLoop;

                const switchButton = document.querySelector('.arco-table-body .arco-switch[aria-checked="true"]');

                if (!switchButton) {
                    console.log(`第 ${page} 页没有找到需要关闭的限额了。`);
                    break;
                }

                const row = switchButton.closest('.arco-table-tr');
                const modelName = row.querySelector('.arco-link')?.textContent || `未知模型`;
                console.log(`检测到模型 [${modelName}] 的限额为开启状态，正在关闭...`);

                switchButton.click();
                await sleep(800);

                const activeModal = await waitForElement('.arco-modal.zoomModal-enter-done');
                if (activeModal) {
                    const confirmButton = await waitForElement('button.arco-btn-primary.arco-btn-status-danger', 2000, activeModal);
                    if (confirmButton) {
                        console.log(`已找到并点击 [${modelName}] 的关闭确认按钮。`);
                        confirmButton.click();
                        await sleep(2000);
                    } else {
                        console.error(`[${modelName}] 未找到关闭确认按钮。尝试取消...`);
                        const cancelButton = activeModal.querySelector('button.arco-btn-secondary');
                        if (cancelButton) cancelButton.click();
                        await sleep(1000);
                    }
                } else {
                    console.error(`[${modelName}] 未能找到弹窗。脚本可能需要更新。`);
                    stopScript();
                    return;
                }
            }

            const nextPageButton = document.querySelector('.arco-pagination-item-next:not(.arco-pagination-item-disabled)');
            if (nextPageButton && scriptState.isRunning) {
                console.log("处理完当前页，准备翻页...");
                nextPageButton.click();
                page++;
            } else {
                if (scriptState.isRunning) {
                    console.log("已是最后一页，所有任务处理完毕。");
                    alert("所有页面的模型限额已全部关闭！");
                } else {
                    alert("脚本已手动停止。");
                }
                break paginationLoop;
            }
        }
        stopScript();
    }

    /**
     * 功能2：智能设置限额 (v1.7 优化为可自定义阈值和扣除值)
     */
    async function setSmartLimits() {
        if (scriptState.isRunning) return;

        // 从输入框获取值，如果无效则使用默认值
        const threshold = parseInt(document.getElementById('tm-input-smart-threshold').value, 10) || 100000;
        const deduction = parseInt(document.getElementById('tm-input-smart-deduction').value, 10) || 30000;

        scriptState.isRunning = true;
        disableActionButtons(true);
        console.log(`--- 开始执行：智能设置限额 (阈值: >${threshold}, 扣除: ${deduction}) ---`);

        let page = 1;

        paginationLoop:
        while (scriptState.isRunning) {
            console.log(`正在处理第 ${page} 页...`);
            await sleep(2500);

            processPage:
            while (scriptState.isRunning) {
                if (!scriptState.isRunning) break paginationLoop;

                const closedSwitches = document.querySelectorAll('.arco-table-body .arco-switch[aria-checked="false"]');
                let targetRow = null;
                let newLimit = 0;
                let modelName = '未知模型';

                for (const switchBtn of closedSwitches) {
                    const row = switchBtn.closest('.arco-table-tr');
                    if (!row) continue;

                    const remainingQuotaCell = row.querySelectorAll('td')[3];
                    if (!remainingQuotaCell) continue;

                    const quotaTextElement = remainingQuotaCell.querySelector('span[class*="quota-text-"]');
                    if (!quotaTextElement) continue;

                    const quotaText = quotaTextElement.textContent;
                    const match = quotaText.match(/剩([\d,]+)/);
                    if (!match || !match[1]) continue;

                    const remainingTokens = parseInt(match[1].replace(/,/g, ''), 10);

                    if (isNaN(remainingTokens) || remainingTokens < threshold) {
                        continue;
                    }

                    targetRow = row;
                    newLimit = Math.max(0, remainingTokens - deduction);
                    modelName = targetRow.querySelector('.arco-link')?.textContent || `未知模型`;
                    break;
                }


                if (!targetRow) {
                    console.log(`第 ${page} 页没有找到需要设置的限额了。`);
                    break processPage;
                }

                console.log(`[${modelName}] 检测到剩余额度 (${newLimit + deduction}) > ${threshold} 且限额关闭，准备设置为: ${newLimit}`);
                const switchButton = targetRow.querySelector('.arco-switch');
                switchButton.click();
                await sleep(1000);

                const activeModal = await waitForElement('.arco-modal.zoomModal-enter-done', 3000);
                if (activeModal) {
                    const modalInputElement = await waitForElement('#TokenLimit_input', 2000, activeModal);
                    const modalConfirmButton = await waitForElement('.arco-modal-footer .arco-btn-primary', 2000, activeModal);

                    if (modalInputElement && modalConfirmButton) {
                        setReactInputValue(modalInputElement, newLimit.toString());
                        await sleep(500);

                        if (!modalConfirmButton.disabled) {
                            modalConfirmButton.click();
                            console.log(`[${modelName}] 已提交新限额: ${newLimit}`);
                            await sleep(2500);
                        } else {
                            console.error(`[${modelName}] 确认按钮被禁用，可能输入值无效。取消操作。`);
                            const cancelButton = activeModal.querySelector('button.arco-btn-secondary');
                            if (cancelButton) cancelButton.click();
                            await sleep(1000);
                        }
                    } else {
                        console.error(`[${modelName}] 未能找到设置限额的弹窗组件。正在尝试取消...`);
                        const cancelButton = activeModal.querySelector('button.arco-btn-secondary');
                        if (cancelButton) cancelButton.click();
                        await sleep(1000);
                        break processPage;
                    }
                } else {
                    console.error(`[${modelName}] 未能找到设置限额的弹窗。脚本可能需要更新。`);
                    stopScript();
                    return;
                }
            }

            const nextPageButton = document.querySelector('.arco-pagination-item-next:not(.arco-pagination-item-disabled)');
            if (nextPageButton && scriptState.isRunning) {
                console.log("处理完当前页，准备翻页...");
                nextPageButton.click();
                page++;
            } else {
                if (scriptState.isRunning) {
                    console.log("已是最后一页，所有任务处理完毕。");
                    alert("所有页面的智能限额设置已完成！");
                } else {
                    alert("脚本已手动停止。");
                }
                break paginationLoop;
            }
        }
        stopScript();
    }

    /**
     * 新功能3：为所有已关闭的模型设置一个固定的限额值
     */
    async function setFixedLimit() {
        if (scriptState.isRunning) return;

        const fixedValueStr = document.getElementById('tm-input-fixed-value').value;
        const fixedValue = parseInt(fixedValueStr, 10);

        if (isNaN(fixedValue) || fixedValue <= 0) {
            alert('请输入一个有效的正整数作为固定限额值！');
            return;
        }

        scriptState.isRunning = true;
        disableActionButtons(true);
        console.log(`--- 开始执行：设置固定限额 (值为: ${fixedValue}) ---`);

        let page = 1;
        paginationLoop:
        while (scriptState.isRunning) {
            console.log(`正在处理第 ${page} 页...`);
            await sleep(2500);

            processPage:
            while (scriptState.isRunning) {
                if (!scriptState.isRunning) break paginationLoop;

                // 查找第一个已关闭的开关
                const switchButton = document.querySelector('.arco-table-body .arco-switch[aria-checked="false"]');

                if (!switchButton) {
                    console.log(`第 ${page} 页没有找到需要开启的限额了。`);
                    break processPage; // 当前页处理完毕
                }

                const row = switchButton.closest('.arco-table-tr');
                const modelName = row.querySelector('.arco-link')?.textContent || `未知模型`;
                console.log(`检测到模型 [${modelName}] 限额已关闭，准备设置为固定值: ${fixedValue}`);

                switchButton.click();
                await sleep(1000);

                const activeModal = await waitForElement('.arco-modal.zoomModal-enter-done', 3000);
                if (activeModal) {
                    const modalInputElement = await waitForElement('#TokenLimit_input', 2000, activeModal);
                    const modalConfirmButton = await waitForElement('.arco-modal-footer .arco-btn-primary', 2000, activeModal);

                    if (modalInputElement && modalConfirmButton) {
                        setReactInputValue(modalInputElement, fixedValue.toString());
                        await sleep(500);

                        if (!modalConfirmButton.disabled) {
                            modalConfirmButton.click();
                            console.log(`[${modelName}] 已提交固定限额: ${fixedValue}`);
                            await sleep(2500);
                        } else {
                            console.error(`[${modelName}] 确认按钮被禁用，可能输入值无效。取消操作。`);
                            const cancelButton = activeModal.querySelector('button.arco-btn-secondary');
                            if (cancelButton) cancelButton.click();
                            await sleep(1000);
                        }
                    } else {
                        console.error(`[${modelName}] 未能找到设置限额的弹窗组件。取消操作。`);
                        const cancelButton = activeModal.querySelector('button.arco-btn-secondary');
                        if (cancelButton) cancelButton.click();
                        await sleep(1000);
                        break processPage;
                    }
                } else {
                    console.error(`[${modelName}] 未能找到设置限额的弹窗。脚本可能需要更新。`);
                    stopScript();
                    return;
                }
            }

            const nextPageButton = document.querySelector('.arco-pagination-item-next:not(.arco-pagination-item-disabled)');
            if (nextPageButton && scriptState.isRunning) {
                console.log("处理完当前页，准备翻页...");
                nextPageButton.click();
                page++;
            } else {
                if (scriptState.isRunning) {
                    console.log("已是最后一页，所有任务处理完毕。");
                    alert("所有页面的固定限额设置已完成！");
                } else {
                    alert("脚本已手动停止。");
                }
                break paginationLoop;
            }
        }
        stopScript();
    }


    // --- UI界面 ---

    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'tm-control-panel';
        document.body.appendChild(panel);

        panel.innerHTML = `
            <div class="tm-panel-header">模型限额助手 v1.7
                <span class="tm-collapse-btn">−</span>
            </div>
            <div class="tm-panel-body">
                <button id="tm-btn-close-all" class="tm-button">一键关闭所有限额</button>
                <hr class="tm-divider">
                <div class="tm-section">
                    <p class="tm-section-title">智能设置限额</p>
                    <div class="tm-input-group">
                        <label for="tm-input-smart-threshold">剩余额度大于</label>
                        <input type="number" id="tm-input-smart-threshold" value="100000">
                    </div>
                    <div class="tm-input-group">
                        <label for="tm-input-smart-deduction">值为“剩余 -”</label>
                        <input type="number" id="tm-input-smart-deduction" value="30000">
                    </div>
                    <button id="tm-btn-set-smart" class="tm-button">开始智能设置</button>
                </div>
                <hr class="tm-divider">
                <div class="tm-section">
                    <p class="tm-section-title">自定义固定值</p>
                    <div class="tm-input-group">
                        <label for="tm-input-fixed-value">设置为固定值</label>
                        <input type="number" id="tm-input-fixed-value" placeholder="例如: 500000">
                    </div>
                    <button id="tm-btn-set-fixed" class="tm-button">开始设置固定值</button>
                </div>
                 <hr class="tm-divider">
                <button id="tm-btn-stop" class="tm-button tm-button-danger" disabled>停止当前操作</button>
            </div>
            <div class="tm-panel-notes">
                 <p><b>关闭限额:</b> 将所有已开启的限额关闭。</p>
                 <p><b>智能设置:</b> 为剩余额度 > 设定值 且【限额已关闭】的模型，开启并设置新限额。</p>
                 <p><b>固定值设置:</b> 为所有【限额已关闭】的模型，开启并设置为指定的固定值。</p>
            </div>
        `;

        // 添加拖动功能
        let isDragging = false;
        let offsetX, offsetY;
        
        panel.querySelector('.tm-panel-header').addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('tm-collapse-btn')) return;
            
            isDragging = true;
            offsetX = e.clientX - panel.getBoundingClientRect().left;
            offsetY = e.clientY - panel.getBoundingClientRect().top;
            panel.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            panel.style.left = (e.clientX - offsetX) + 'px';
            panel.style.top = (e.clientY - offsetY) + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            panel.style.cursor = 'grab';
        });

        // 添加收缩/展开功能
        const collapseBtn = panel.querySelector('.tm-collapse-btn');
        const panelBody = panel.querySelector('.tm-panel-body');
        const panelNotes = panel.querySelector('.tm-panel-notes');
        
        collapseBtn.addEventListener('click', () => {
            if (panelBody.style.display === 'none') {
                panelBody.style.display = '';
                panelNotes.style.display = '';
                collapseBtn.textContent = '−';
            } else {
                panelBody.style.display = 'none';
                panelNotes.style.display = 'none';
                collapseBtn.textContent = '+';
            }
        });

        document.getElementById('tm-btn-close-all').addEventListener('click', closeAllLimits);
        document.getElementById('tm-btn-set-smart').addEventListener('click', setSmartLimits);
        document.getElementById('tm-btn-set-fixed').addEventListener('click', setFixedLimit); // 新增
        document.getElementById('tm-btn-stop').addEventListener('click', stopScript);
    }

    // --- 样式 ---
    GM_addStyle(`
        #tm-control-panel {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 300px;
            background-color: #fff;
            border: 1px solid #e8e8e8;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 99999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
            font-size: 14px;
            color: #333;
        }
        .tm-panel-header {
            padding: 10px 15px;
            background-color: #f7f7f7;
            font-weight: bold;
            border-bottom: 1px solid #e8e8e8;
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
            cursor: grab;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .tm-collapse-btn {
            cursor: pointer;
            font-size: 18px;
            width: 20px;
            text-align: center;
            user-select: none;
        }
        .tm-collapse-btn:hover {
            color: #1677ff;
        }
        .tm-panel-body {
            padding: 15px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .tm-button {
            padding: 8px 12px;
            border: 1px solid #d9d9d9;
            background-color: #fff;
            color: #333;
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.2s;
            text-align: center;
        }
        .tm-button:hover:not(:disabled) {
            background-color: #1677ff;
            color: #fff;
            border-color: #1677ff;
        }
        .tm-button:disabled {
            cursor: not-allowed;
            color: #a9a9a9;
            background-color: #f5f5f5;
        }
        .tm-button.tm-button-danger:not(:disabled) {
            background-color: #f53f3f;
            color: #fff;
            border-color: #f53f3f;
        }
        .tm-button.tm-button-danger:hover:not(:disabled) {
            background-color: #d93030;
        }
        .tm-divider {
            border: none;
            border-top: 1px solid #f0f0f0;
            margin: 0;
        }
        .tm-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .tm-section-title {
            font-weight: 500;
            margin: 0;
            font-size: 14px;
        }
        .tm-input-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .tm-input-group label {
            flex-shrink: 0;
            width: 90px;
            text-align: right;
            font-size: 13px;
            color: #555;
        }
        .tm-input-group input {
            width: 100%;
            padding: 4px 8px;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            font-size: 13px;
        }
        .tm-input-group input:focus {
            outline: none;
            border-color: #1677ff;
            box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.2);
        }
        .tm-panel-notes {
            padding: 15px;
            padding-top: 0;
            font-size: 12px;
            color: #888;
        }
        .tm-panel-notes p {
            margin: 5px 0;
        }
    `);

    // 页面加载完成后执行
    window.addEventListener('load', () => {
        setTimeout(createControlPanel, 1000); // 延迟一点以确保页面完全渲染
    });

})();
