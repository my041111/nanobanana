document.addEventListener('DOMContentLoaded', () => {

    // 获取所有DOM元素
    const uploadArea = document.querySelector('.upload-area');
    const fileInput = document.getElementById('image-upload');
    const thumbnailsContainer = document.getElementById('thumbnails-container');
    const promptInput = document.getElementById('prompt-input');
    const apiKeyInput = document.getElementById('api-key-input');

    const apiBaseUrlInput = document.getElementById('api-base-url-input');
    const modelInput = document.getElementById('model-input');
    const generateBtn = document.getElementById('generate-btn');
    const btnText = generateBtn.querySelector('.btn-text');
    const spinner = generateBtn.querySelector('.spinner');
    const resultContainer = document.getElementById('result-image-container');

    const resultInfo = document.getElementById('result-info');
    const processedTime = document.getElementById('processed-time');
    const outputDimensions = document.getElementById('output-dimensions');
    const usedModel = document.getElementById('used-model');
    const downloadBtn = document.getElementById('download-btn');
    
    // 进度显示相关元素
    const progressContainer = document.getElementById('progress-container');
    const progressStatus = document.getElementById('progress-status');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const progressSteps = document.querySelectorAll('.step');
    
    // 历史记录相关元素
    const historyBtn = document.getElementById('history-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const historyModal = document.getElementById('history-modal');
    const closeHistoryModal = document.getElementById('close-history-modal');
    const historyList = document.getElementById('history-list');
    
    // 输入方式相关元素
    const tabBtns = document.querySelectorAll('.tab-btn');
    const inputMethodContents = document.querySelectorAll('.input-method-content');
    const imageUrlInput = document.getElementById('image-url-input');
    const urlPreviewContainer = document.getElementById('url-preview-container');
    
    // 尺寸显示元素
    const originalDimensions = document.getElementById('original-dimensions');
    const targetDimensions = document.getElementById('target-dimensions');
    
    // 状态变量
    let selectedFiles = [];

    let selectedUrls = [];
    let currentInputMethod = 'upload';
    let originalImageDimensions = null;
    let currentResultImageUrl = null;
    let processingHistory = [];

    // 初始化 - 加载保存的数据
    loadSavedData();
    
    // 初始化进度条状态
    updateProgress(0, '等待开始...', 0);
    
    // 初始化结果信息区域显示默认值
    processedTime.textContent = '等待处理...';
    outputDimensions.textContent = '等待生成...';
    usedModel.textContent = modelInput.value;

    // --- 历史记录功能 ---
    historyBtn.addEventListener('click', showHistoryModal);
    clearHistoryBtn.addEventListener('click', clearHistory);
    closeHistoryModal.addEventListener('click', hideHistoryModal);
    
    // 点击模态框背景关闭
    historyModal.addEventListener('click', (e) => {
        if (e.target === historyModal) {
            hideHistoryModal();
        }
    });

    function showHistoryModal() {
        renderHistoryList();
        historyModal.classList.remove('hidden');
    }

    function hideHistoryModal() {
        historyModal.classList.add('hidden');
    }

    function renderHistoryList() {
        historyList.innerHTML = '';
        
        if (processingHistory.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: #888; padding: 2rem;">暂无历史记录</p>';
            return;
        }

        processingHistory.forEach((item, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const time = new Date(item.timestamp).toLocaleString('zh-CN');
            const prompt = item.prompt.length > 100 ? item.prompt.substring(0, 100) + '...' : item.prompt;
            
            historyItem.innerHTML = `
                <div class="history-item-header">
                    <h4 class="history-item-title">修图记录 ${processingHistory.length - index}</h4>
                    <span class="history-item-time">${time}</span>
                </div>
                <div class="history-item-content">
                    <div class="history-item-main">
                        <div class="history-item-details">
                            <div class="history-detail">
                                <span class="history-detail-label">处理时间:</span>
                                <span class="history-detail-value">${item.processingTime}ms</span>
                            </div>
                            <div class="history-detail">
                                <span class="history-detail-label">使用模型:</span>
                                <span class="history-detail-value">${item.model}</span>
                            </div>
                            <div class="history-detail">
                                <span class="history-detail-label">输出尺寸:</span>
                                <span class="history-detail-value">${item.outputDimensions}</span>
                            </div>
                        </div>
                        <div class="history-item-prompt">${prompt}</div>
                        <div class="history-item-actions">
                            <button class="history-action-btn download" onclick="downloadHistoryImage('${item.imageUrl}')">
                                <span>⬇️</span> 下载
                            </button>
                            <button class="history-action-btn delete" onclick="deleteHistoryItem(${index})">
                                <span>🗑️</span> 删除
                            </button>
                        </div>
                    </div>
                    ${item.imageUrl ? `<img src="${item.imageUrl}" alt="历史图片" class="history-item-image" onclick="downloadHistoryImage('${item.imageUrl}')">` : ''}
                </div>
            `;
            
            historyList.appendChild(historyItem);
        });
    }

    function clearHistory() {
        if (confirm('确定要清空所有历史记录吗？')) {
            processingHistory = [];
            saveHistory();
            renderHistoryList();
        }
    }

    function addToHistory(data) {
        const historyItem = {
            timestamp: Date.now(),
            prompt: promptInput.value,
            model: modelInput.value,
            processingTime: data.processingTime,
            outputDimensions: data.outputDimensions,
            imageUrl: currentResultImageUrl,
            originalDimensions: originalImageDimensions
        };
        
        processingHistory.unshift(historyItem);
        
        // 限制历史记录数量
        if (processingHistory.length > 50) {
            processingHistory = processingHistory.slice(0, 50);
        }
        
        saveHistory();
    }

    // --- 数据持久化 ---
    function saveHistory() {
        localStorage.setItem('nanoBananaHistory', JSON.stringify(processingHistory));
    }

    function loadSavedData() {
        // 加载历史记录
        const savedHistory = localStorage.getItem('nanoBananaHistory');
        if (savedHistory) {
            processingHistory = JSON.parse(savedHistory);
        }
        
        // 加载API密钥
        const savedApiKey = localStorage.getItem('nanoBananaApiKey');
        if (savedApiKey) {
            apiKeyInput.value = savedApiKey;
        } else {
            // 设置默认API密钥
            apiKeyInput.value = 'sk-C358zCIUzlUZ7daJl4PEtu6njZz7g7k3luAWRqpS64gi0pjs';
        }
        
        // 加载模型选择
        const savedModel = localStorage.getItem('nanoBananaModel');
        if (savedModel) {
            modelInput.value = savedModel;
        } else {
            // 设置默认模型
            modelInput.value = 'gemini-2.5-flash-image-preview';
        }
        
        // 加载API地址
        const savedApiBaseUrl = localStorage.getItem('nanoBananaApiBaseUrl');
        if (savedApiBaseUrl) {
            apiBaseUrlInput.value = savedApiBaseUrl;
        } else {
            // 设置默认API地址
            apiBaseUrlInput.value = 'https://newapi.aicohere.org/v1/chat/completions';
        }
    }

    // --- 进度显示功能 ---
    function updateProgress(step, status, percentage) {
        progressStatus.textContent = status;
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}%`;
        
        // 添加等待状态样式
        if (percentage === 0 && status.includes('等待')) {
            progressFill.classList.add('waiting');
        } else {
            progressFill.classList.remove('waiting');
        }
        
        // 更新步骤状态
        progressSteps.forEach((stepEl, index) => {
            stepEl.classList.remove('active', 'completed');
            if (index < step) {
                stepEl.classList.add('completed');
            } else if (index === step) {
                stepEl.classList.add('active');
            }
        });
    }

    function showProgress() {
        updateProgress(0, '准备中...', 0);
    }

    function hideProgress() {
        updateProgress(0, '等待开始...', 0);
    }

    // --- 输入方式切换逻辑 ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const method = btn.dataset.method;
            switchInputMethod(method);
        });
    });

    // --- 下载按钮事件监听器 ---
    downloadBtn.addEventListener('click', downloadImage);

    function switchInputMethod(method) {
        currentInputMethod = method;
        
        // 更新按钮状态
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.method === method);
        });
        
        // 更新内容显示
        inputMethodContents.forEach(content => {
            content.classList.toggle('active', content.id === `${method}-method`);
        });
        
        // 清空之前的数据
        clearImageData();
    }

    function clearImageData() {
        selectedFiles = [];
        selectedUrls = [];
        originalImageDimensions = null;
        thumbnailsContainer.innerHTML = '';
        urlPreviewContainer.innerHTML = '';
        originalDimensions.textContent = '未选择图片';
        targetDimensions.textContent = '保持原始分辨率';
        downloadBtn.classList.add('hidden');
        currentResultImageUrl = null;
    }

    // --- 拖放功能 (上传方式) ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('drag-over');
        });
    });

    uploadArea.addEventListener('drop', (e) => {
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        handleFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
        handleFiles(files);
    });

    function handleFiles(files) {
        files.forEach(file => {
            if (!selectedFiles.some(f => f.name === file.name)) {
                selectedFiles.push(file);
                createThumbnail(file);
            }
        });

        updateDimensions();
        updateProgress(0, '图片上传成功', 25);
    }

    function createThumbnail(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'thumbnail-wrapper';
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = file.name;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => {
                selectedFiles = selectedFiles.filter(f => f.name !== file.name);
                wrapper.remove();

                updateDimensions();
            };
            
            wrapper.appendChild(img);
            wrapper.appendChild(removeBtn);
            thumbnailsContainer.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
    }


    // --- URL输入方式处理 ---
    imageUrlInput.addEventListener('input', debounce(handleUrlInput, 500));

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function handleUrlInput() {
        const urls = imageUrlInput.value.split('\n').filter(url => url.trim());
        selectedUrls = urls;
        createUrlPreviews(urls);
        updateDimensions();
        if (urls.length > 0) {
            updateProgress(0, 'URL图片加载成功', 25);
        }
    }

    function createUrlPreviews(urls) {
        urlPreviewContainer.innerHTML = '';
        urls.forEach((url, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'url-preview-wrapper';
            
            const img = document.createElement('img');
            img.src = url.trim();
            img.alt = `URL ${index + 1}`;
            img.onerror = () => {
                wrapper.innerHTML = `<div class="url-error">无法加载图片: ${url}</div>`;
            };
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => {
                selectedUrls = selectedUrls.filter((_, i) => i !== index);
                imageUrlInput.value = selectedUrls.join('\n');
                createUrlPreviews(selectedUrls);
                updateDimensions();
            };
            
            wrapper.appendChild(img);
            wrapper.appendChild(removeBtn);
            urlPreviewContainer.appendChild(wrapper);
        });
    }

    // --- 尺寸更新逻辑 ---
    function updateDimensions() {
        if (currentInputMethod === 'upload' && selectedFiles.length > 0) {
            // 获取第一张图片的尺寸
            const firstFile = selectedFiles[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // 使用 naturalWidth 和 naturalHeight 获取原始尺寸
                    originalImageDimensions = { width: img.naturalWidth, height: img.naturalHeight };
                    originalDimensions.textContent = `${img.naturalWidth} × ${img.naturalHeight} 像素`;
                    targetDimensions.textContent = `保持 ${img.naturalWidth} × ${img.naturalHeight} 像素`;
                    console.log('原始图片尺寸已保存:', originalImageDimensions);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(firstFile);
        } else if (currentInputMethod === 'url' && selectedUrls.length > 0) {
            // 获取第一张URL图片的尺寸
            const img = new Image();
            img.onload = () => {
                // 使用 naturalWidth 和 naturalHeight 获取原始尺寸
                originalImageDimensions = { width: img.naturalWidth, height: img.naturalHeight };
                originalDimensions.textContent = `${img.naturalWidth} × ${img.naturalHeight} 像素`;
                targetDimensions.textContent = `保持 ${img.naturalWidth} × ${img.naturalHeight} 像素`;
                console.log('原始图片尺寸已保存:', originalImageDimensions);
            };
            img.onerror = () => {
                originalDimensions.textContent = '无法获取尺寸';
                targetDimensions.textContent = '保持原始分辨率';
            };
            img.src = selectedUrls[0].trim();
        } else {
            originalImageDimensions = null;
            originalDimensions.textContent = '未选择图片';
            targetDimensions.textContent = '保持原始分辨率';
        }
    }

    // --- 核心修图逻辑 ---
    
        // 为提示词输入框添加回车键事件监听器
    promptInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // 阻止默认的换行行为
            // 触发生成按钮的点击事件
            generateBtn.click();
        }
    });
    
    // 为API Key输入框添加回车键事件监听器
    apiKeyInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // 如果提示词输入框有内容，直接开始修图
            if (promptInput.value.trim()) {
                generateBtn.click();
            } else {
                // 否则聚焦到提示词输入框
                promptInput.focus();
            }
        }
    });
    
    // 为图片URL输入框添加回车键事件监听器
    imageUrlInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // 如果提示词输入框有内容，直接开始修图
            if (promptInput.value.trim()) {
                generateBtn.click();
            } else {
                // 否则聚焦到提示词输入框
                promptInput.focus();
            }
        }
    });
    
    generateBtn.addEventListener('click', async () => {
        if (!apiKeyInput.value.trim()) {

            alert('请输入 API 密钥');
            return;
        }


        if (currentInputMethod === 'upload' && selectedFiles.length === 0) {
            alert('请选择至少一张图片');
            return;
        }


        if (currentInputMethod === 'url' && selectedUrls.length === 0) {
            alert('请输入至少一个图片URL');
            return;
        }

        if (!promptInput.value.trim()) {

            alert('请输入修图指令');
            return;
        }

        if (!originalImageDimensions) {
            alert('无法获取图片尺寸信息，请重新选择图片');
            return;
        }


        // 保存用户设置
        localStorage.setItem('nanoBananaApiKey', apiKeyInput.value);
        localStorage.setItem('nanoBananaModel', modelInput.value);
        localStorage.setItem('nanoBananaApiBaseUrl', apiBaseUrlInput.value);

        setLoading(true);

        showProgress();
        const startTime = Date.now();

        try {
            updateProgress(1, 'AI处理中...', 50);
            
            let images = [];
            
            if (currentInputMethod === 'upload') {
                // 将文件转换为Base64
            const conversionPromises = selectedFiles.map(file => fileToBase64(file));

                images = await Promise.all(conversionPromises);
            } else {
                // 使用URL
                images = selectedUrls.map(url => url.trim());
            }
            

            updateProgress(2, '生成图片中...', 75);
            

            // 发送到新的修图接口
            const response = await fetch('/edit-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({

                    images: images,
                    prompt: promptInput.value,

                    originalWidth: originalImageDimensions.width,
                    originalHeight: originalImageDimensions.height,
                    apikey: apiKeyInput.value,
                    apiBaseUrl: apiBaseUrlInput.value.trim() || undefined,
                    model: modelInput.value
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }


            updateProgress(3, '处理完成', 100);
            
            // 添加延迟以显示完成状态
            setTimeout(() => {
                displayResult(data.imageUrl, data, startTime);
                hideProgress();
            }, 500);
            
        } catch (error) {

            // 特殊处理429错误（速率限制）
            if (error.message.includes('429') || error.message.includes('Rate limit exceeded')) {
                const errorMessage = `
                    <div class="error-container">
                        <h3>⚠️ 达到API调用限制</h3>
                        <p>您已达到今日的免费API调用限制。</p>
                        <div class="error-solutions">
                            <h4>解决方案：</h4>
                            <ul>
                                <li><strong>添加自己的API Key（推荐）：</strong> 在设置中输入您的API密钥</li>
                                <li><strong>等待重置：</strong> 免费额度每天重置，您可以明天再试</li>
                                <li><strong>升级计划：</strong> 购买积分获得更高限制</li>
                            </ul>
                        </div>
                        <div class="error-details">
                            <details>
                                <summary>查看详细错误信息</summary>
                                <pre>${error.message}</pre>
                            </details>
                        </div>
                    </div>
                `;
                resultContainer.innerHTML = errorMessage;
            } else {
                // 其他错误正常显示
            alert('Error: ' + error.message);
            resultContainer.innerHTML = `<p>Error: ${error.message}</p>`;

            }
            hideProgress();
        } finally {
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        generateBtn.disabled = isLoading;

        btnText.textContent = isLoading ? '处理中...' : '开始修图';
        spinner.classList.toggle('hidden', !isLoading);
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {

            // 检查文件类型
            if (!file.type.startsWith('image/')) {
                reject(new Error(`不支持的文件类型: ${file.type}`));
                return;
            }
            
            // 检查文件大小 (限制为10MB)
            if (file.size > 10 * 1024 * 1024) {
                reject(new Error('图片文件过大，请选择小于10MB的图片'));
                return;
            }
            
            const reader = new FileReader();

            reader.onload = () => {
                try {
                    const result = reader.result;
                    // 验证base64格式
                    if (typeof result === 'string' && result.startsWith('data:image/')) {
                        resolve(result);
                    } else {
                        reject(new Error('图片格式转换失败'));
                    }
                } catch (error) {
                    reject(new Error('图片处理失败: ' + error.message));
                }
            };
            reader.onerror = () => reject(new Error('图片读取失败'));
            reader.readAsDataURL(file);
        });
    }


    // --- 下载功能 ---
    function downloadImage() {
        console.log('下载按钮被点击');
        console.log('当前图片URL:', currentResultImageUrl);
        console.log('原始图片尺寸信息:', originalImageDimensions);
        
        if (!currentResultImageUrl) {
            console.error('没有可下载的图片');
            alert('没有可下载的图片');
            return;
        }

        // 添加下载中状态
        downloadBtn.classList.add('downloading');
        downloadBtn.disabled = true;
        downloadBtn.querySelector('.download-text').textContent = '准备下载中...';

        // 检查是否需要调整到原始尺寸
        if (originalImageDimensions && originalImageDimensions.width && originalImageDimensions.height) {
            console.log(`检测到原始尺寸 ${originalImageDimensions.width}x${originalImageDimensions.height}，开始调整图片尺寸`);
            downloadBtn.querySelector('.download-text').textContent = `调整尺寸中... (${originalImageDimensions.width}×${originalImageDimensions.height})`;
            
            // 强制调整到原始图片的尺寸
            fastResizeImage(currentResultImageUrl, originalImageDimensions.width, originalImageDimensions.height)
                .then(resizedUrl => {
                    console.log(`图片尺寸调整成功 (${originalImageDimensions.width}x${originalImageDimensions.height})，开始下载调整后的图片`);
                    downloadBtn.querySelector('.download-text').textContent = '下载中...';
                    // 下载调整后的图片
                    simpleDownload(resizedUrl, originalImageDimensions.width, originalImageDimensions.height);
                })
                .catch(error => {
                    console.error('图片尺寸调整失败:', error);
                    // 如果调整失败，下载原始图片
                    console.log('尺寸调整失败，下载原始图片');
                    downloadBtn.querySelector('.download-text').textContent = '下载中...';
                    simpleDownload(currentResultImageUrl);
                });
        } else {
            console.log('没有原始尺寸信息，直接下载原始图片');
            downloadBtn.querySelector('.download-text').textContent = '下载中...';
            // 没有原始尺寸信息，直接下载
            simpleDownload(currentResultImageUrl);
        }
    }

    // 简化的下载函数
    function simpleDownload(imageUrl, targetWidth = null, targetHeight = null) {
        console.log('simpleDownload 被调用');
        console.log('图片URL:', imageUrl);
        console.log('目标尺寸:', targetWidth, 'x', targetHeight);
        
        try {
            // 检查是否是data URL格式
            if (imageUrl.startsWith('data:')) {
                console.log('检测到 Data URL 格式，使用直接下载方式');
                
                // 对于data URL，直接创建下载链接
                const link = document.createElement('a');
                link.href = imageUrl;
                
                // 生成文件名
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                let filename = `image-${timestamp}.png`;
                
                // 如果调整了尺寸，在文件名中标注
                if (targetWidth && targetHeight) {
                    filename = `image-${targetWidth}x${targetHeight}-${timestamp}.png`;
                }
                
                console.log('生成的文件名:', filename);
                
                link.download = filename;
                link.style.display = 'none';
                
                // 添加到DOM，点击，然后清理
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                console.log('图片下载成功');
                
                // 延迟恢复按钮状态，给用户视觉反馈
                setTimeout(() => {
                    downloadBtn.classList.remove('downloading');
                    downloadBtn.classList.add('success');
                    downloadBtn.querySelector('.download-text').textContent = '下载完成！';
                    
                    setTimeout(() => {
                        downloadBtn.classList.remove('success');
                        downloadBtn.disabled = false;
                        if (targetWidth && targetHeight) {
                            downloadBtn.querySelector('.download-text').textContent = `下载图片 ${targetWidth}×${targetHeight})`;
                        } else {
                            downloadBtn.querySelector('.download-text').textContent = '下载图片';
                        }
                    }, 1500);
                }, 500);
                
                return;
            }
            
            console.log('检测到 URL 格式，使用fetch方式下载');
            
            // 对于URL格式，使用fetch方式下载
            fetch(imageUrl, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Accept': 'image/*'
                }
            })
            .then(response => {
                console.log('Fetch 响应状态:', response.status, response.statusText);
                if (!response.ok) {
                    throw new Error(`图片下载失败: ${response.status} ${response.statusText}`);
                }
                return response.blob();
            })
            .then(blob => {
                console.log('图片数据获取成功，blob 大小:', blob.size, '字节');
                console.log('blob 类型:', blob.type);
                
                // 创建blob URL
                const blobUrl = URL.createObjectURL(blob);
                console.log('创建的 blob URL:', blobUrl);
                
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                let filename = `image-${timestamp}.png`;
                
                // 如果调整了尺寸，在文件名中标注
                if (targetWidth && targetHeight) {
                    filename = `image-${targetWidth}x${targetHeight}-${timestamp}.png`;
                }
                
                // 创建下载链接
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                link.style.display = 'none';
                
                // 添加到DOM，点击，然后清理
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // 清理blob URL
                setTimeout(() => {
                    URL.revokeObjectURL(blobUrl);
                    console.log('blob URL 已清理');
                }, 1000);
                
                console.log('图片下载成功');
                
                // 延迟恢复按钮状态，给用户视觉反馈
                setTimeout(() => {
                    downloadBtn.classList.remove('downloading');
                    downloadBtn.classList.add('success');
                    downloadBtn.querySelector('.download-text').textContent = '下载完成！';
                    
                    setTimeout(() => {
                        downloadBtn.classList.remove('success');
                        downloadBtn.disabled = false;
                        if (targetWidth && targetHeight) {
                            downloadBtn.querySelector('.download-text').textContent = `下载图片 ${targetWidth}×${targetHeight})`;
                        } else {
                            downloadBtn.querySelector('.download-text').textContent = '下载图片';
                        }
                    }, 1500);
                }, 500);
            })
            .catch(error => {
                console.error('图片下载失败:', error);
                
                // 恢复按钮状态
                downloadBtn.classList.remove('downloading');
                downloadBtn.disabled = false;
                if (targetWidth && targetHeight) {
                    downloadBtn.querySelector('.download-text').textContent = `下载图片 ${targetWidth}×${targetHeight})`;
                } else {
                    downloadBtn.querySelector('.download-text').textContent = '下载图片';
                }
                
                alert('下载失败: ' + error.message);
            });
            
        } catch (error) {
            console.error('simpleDownload 执行失败:', error);
            
            // 恢复按钮状态
            downloadBtn.classList.remove('downloading');
            downloadBtn.disabled = false;
            if (targetWidth && targetHeight) {
                downloadBtn.querySelector('.download-text').textContent = `下载图片 ${targetWidth}×${targetHeight})`;
            } else {
                downloadBtn.querySelector('.download-text').textContent = '下载图片';
            }
            
            alert('下载失败: ' + error.message);
        }
    }
    
    // 重置下载按钮状态的辅助函数
    function resetDownloadButton() {
        downloadBtn.classList.remove('downloading', 'success');
        downloadBtn.disabled = false;
        downloadBtn.querySelector('.download-text').textContent = '下载图片';
    }

    // --- 高效的图片缩放函数 ---
    async function fastResizeImage(imageUrl, targetWidth, targetHeight) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            // 设置超时处理
            const timeout = setTimeout(() => {
                reject(new Error('图片加载超时'));
            }, 10000); // 10秒超时
            
            img.onload = () => {
                clearTimeout(timeout);
                console.log(`开始调整图片尺寸: ${img.naturalWidth}x${img.naturalHeight} -> ${targetWidth}x${targetHeight}`);
                
                // 如果尺寸已经匹配，直接返回原图
                if (img.naturalWidth === targetWidth && img.naturalHeight === targetHeight) {
                    console.log('图片尺寸已匹配，无需调整');
                    resolve(imageUrl);
                    return;
                }
                
                try {
                    // 创建canvas进行缩放
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d', { 
                        alpha: false,
                        willReadFrequently: false
                    });
                    
                    canvas.width = targetWidth;
                    canvas.height = targetHeight;
                    
                    // 设置高质量缩放
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    // 绘制缩放后的图片
                    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                    
                    // 转换为高质量PNG格式
                    const resizedUrl = canvas.toDataURL('image/png', 1.0);
                    console.log(`图片尺寸调整完成: ${targetWidth}x${targetHeight}`);
                    resolve(resizedUrl);
                } catch (error) {
                    console.error('Canvas处理失败:', error);
                    reject(new Error('图片处理失败: ' + error.message));
                }
            };
            
            img.onerror = (error) => {
                clearTimeout(timeout);
                console.error('图片加载失败:', error);
                reject(new Error('图片加载失败'));
            };
            
            img.src = imageUrl;
        });
    }

    function displayResult(imageUrl, data, startTime) {
        resultContainer.innerHTML = '';

        currentResultImageUrl = imageUrl; // 保存当前图片URL
        
        // 检查是否需要调整图片尺寸（包括强制调整）
        if (data.needsResize && data.targetDimensions) {
            const targetWidth = data.targetDimensions.width;
            const targetHeight = data.targetDimensions.height;
            
            console.log('检测到需要调整尺寸:', targetWidth, 'x', targetHeight);
            console.log('后端调整标志:', data.backendResized || false);
            
            // 检查后端是否已经处理了图片调整
            if (data.backendResized) {
                console.log('后端已处理图片调整，直接显示调整后的图片');
                currentResultImageUrl = imageUrl; // 使用后端调整后的URL
                displayImage(imageUrl, startTime, targetWidth, targetHeight);
                downloadBtn.classList.remove('hidden'); // 显示下载按钮
                
                // 更新下载按钮文本
                downloadBtn.querySelector('.download-text').textContent = `下载图片 ${targetWidth}×${targetHeight})`;
            } else {
                // 后端未处理，前端处理
                console.log('后端未处理，前端进行图片调整');
                fastResizeImage(imageUrl, targetWidth, targetHeight)
                    .then(resizedUrl => {
                        currentResultImageUrl = resizedUrl; // 更新为调整后的URL
                        displayImage(resizedUrl, startTime, targetWidth, targetHeight);
                        downloadBtn.classList.remove('hidden'); // 显示下载按钮
                        
                        // 更新下载按钮文本，显示已调整到原始尺寸
                        downloadBtn.querySelector('.download-text').textContent = `下载图片 ${targetWidth}×${targetHeight})`;
                    })
                    .catch((error) => {
                        console.error('图片尺寸调整失败:', error);
                        // 如果缩放失败，显示原始图片
                        displayImage(imageUrl, startTime);
                        downloadBtn.classList.remove('hidden'); // 显示下载按钮
                        downloadBtn.querySelector('.download-text').textContent = '下载图片 (原始尺寸)';
                    });
            }
        } else {
            // 不需要调整尺寸，直接显示
            console.log('不需要调整尺寸，直接显示原图');
            displayImage(imageUrl, startTime);
            downloadBtn.classList.remove('hidden'); // 显示下载按钮
            downloadBtn.querySelector('.download-text').textContent = '下载图片';
        }
    }
    
    function displayImage(imageUrl, startTime, targetWidth = null, targetHeight = null) {
        const img = document.createElement('img');
        img.src = imageUrl;

        img.alt = '修图结果';
        img.onload = () => {
            // 显示结果信息
            const processingTime = Date.now() - startTime;
            processedTime.textContent = `${processingTime}ms`;
            
            // 使用目标尺寸或实际尺寸
            const displayWidth = targetWidth || img.naturalWidth;
            const displayHeight = targetHeight || img.naturalHeight;
            outputDimensions.textContent = `${displayWidth} × ${displayHeight} 像素`;
            
            // 显示使用的模型
            usedModel.textContent = modelInput.value;
            
            // 更新下载提示信息
            updateDownloadHint();
            
            resultInfo.classList.remove('hidden');
            
            // 添加到历史记录
            addToHistory({
                processingTime: processingTime,
                outputDimensions: `${displayWidth} × ${displayHeight} 像素`
            });
        };
        resultContainer.appendChild(img);
    }


    // 更新下载提示信息
    function updateDownloadHint() {
        const downloadHint = document.querySelector('.download-hint');
        if (downloadHint) {
            downloadHint.textContent = '💡 下载高质量图片';
            console.log('下载提示已更新');
        }
    }

    // --- 全局函数供历史记录使用 ---
    window.downloadHistoryImage = function(imageUrl) {
        if (!imageUrl) {
            alert('图片链接已失效');
            return;
        }

        // 检查是否有原始尺寸信息
        if (originalImageDimensions && originalImageDimensions.width && originalImageDimensions.height) {
            // 自动调整到原始图片的尺寸
            fastResizeImage(imageUrl, originalImageDimensions.width, originalImageDimensions.height)
                .then(resizedUrl => {
                    downloadHistoryResizedImage(resizedUrl, originalImageDimensions.width, originalImageDimensions.height);
                })
                .catch(error => {
                    console.error('历史图片尺寸调整失败:', error);
                    // 如果调整失败，下载原始图片
                    downloadHistoryResizedImage(imageUrl);
                });
        } else {
            // 没有原始尺寸信息，直接下载
            downloadHistoryResizedImage(imageUrl);
        }
    };

    // 下载历史记录中的调整后图片
    function downloadHistoryResizedImage(imageUrl, targetWidth = null, targetHeight = null) {
        console.log('downloadHistoryResizedImage 被调用');
        console.log('历史图片URL:', imageUrl);
        console.log('目标尺寸:', targetWidth, 'x', targetHeight);
        
        // 检查是否是data URL格式
        if (imageUrl.startsWith('data:')) {
            console.log('检测到 Data URL 格式，使用直接下载方式');
            
            try {
                // 对于data URL，直接创建下载链接
                const link = document.createElement('a');
                link.href = imageUrl;
                
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                let filename = `photo-${timestamp}.png`;
                
                // 如果调整了尺寸，在文件名中标注
                if (targetWidth && targetHeight) {
                    filename = `photo-${targetWidth}x${targetHeight}-${timestamp}.png`;
                }
                
                // 创建下载链接
                link.download = filename;
                link.style.display = 'none';
                
                // 添加到DOM，点击，然后清理
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                console.log('历史图片data URL下载成功');
                return;
            } catch (error) {
                console.error('历史图片Data URL 下载过程中出错:', error);
                alert('下载失败: ' + error.message);
                return;
            }
        }
        
        console.log('检测到 URL 格式，使用fetch方式下载');
        
        // 对于URL格式，使用fetch方式下载（避免跳转问题）
        fetch(imageUrl, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Accept': 'image/*'
            }
        })
            .then(response => {
                console.log('Fetch 响应状态:', response.status, response.statusText);
                if (!response.ok) {
                    throw new Error(`历史图片下载失败: ${response.status} ${response.statusText}`);
                }
                return response.blob();
            })
            .then(blob => {
                console.log('历史图片数据获取成功，blob 大小:', blob.size, '字节');
                console.log('blob 类型:', blob.type);
                
                // 创建blob URL
                const blobUrl = URL.createObjectURL(blob);
                console.log('创建的 blob URL:', blobUrl);
                
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                let filename = `photo-${timestamp}.png`;
                
                // 如果调整了尺寸，在文件名中标注
                if (targetWidth && targetHeight) {
                    filename = `photo-${targetWidth}x${targetHeight}-${timestamp}.png`;
                }
                
                // 创建下载链接
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                link.style.display = 'none';
                
                // 添加到DOM，点击，然后清理
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // 清理blob URL
                setTimeout(() => {
                    URL.revokeObjectURL(blobUrl);
                    console.log('历史图片 blob URL 已清理');
                }, 1000);
                
                console.log('历史图片下载成功');
            })
            .catch(error => {
                console.error('历史图片下载失败:', error);
                
                // 如果是网络错误，尝试重试
                if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    console.log('检测到网络错误，尝试重试历史图片下载...');
                    
                    // 延迟1秒后重试
                    setTimeout(() => {
                        downloadHistoryResizedImage(imageUrl, targetWidth, targetHeight);
                    }, 1000);
                    return;
                }
                
                alert('下载失败，请重试: ' + error.message);
            });
    }

    window.deleteHistoryItem = function(index) {
        if (confirm('确定要删除这条历史记录吗？')) {
            processingHistory.splice(index, 1);
            saveHistory();
            renderHistoryList();
        }
    };
});
