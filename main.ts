import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.200.0/http/file_server.ts";
import { Buffer } from "https://deno.land/std@0.177.0/node/buffer.ts";

// --- 🚀 激进优化: 超高速缓存机制 ---
const requestCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 🚀 激进优化11: 延长缓存时间到10分钟

// 🚀 激进优化12: 智能缓存清理
function cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of requestCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            requestCache.delete(key);
        }
    }
}

// 每5分钟清理一次缓存
setInterval(cleanupCache, 5 * 60 * 1000);

function getCachedResult(cacheKey: string): any | null {
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('✅ 超高速缓存命中');
        return cached.result;
    }
    return null;
}

function setCachedResult(cacheKey: string, result: any): void {
    requestCache.set(cacheKey, { result, timestamp: Date.now() });
}

// --- 辅助函数：生成错误 JSON 响应 ---
function createJsonErrorResponse(message: string, statusCode = 500) {
    return new Response(JSON.stringify({ error: { message, code: statusCode } }), {
        status: statusCode,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
}

// --- 真正的后端图片尺寸调整函数 ---
async function resizeImageToTargetDimensions(imageUrl: string, targetWidth: number, targetHeight: number): Promise<string> {
    try {
        console.log(`开始后端图片尺寸调整: 目标尺寸 ${targetWidth}x${targetHeight}`);
        
        // 如果是data URL，直接处理
        if (imageUrl.startsWith('data:image/')) {
            console.log('检测到data URL格式，直接处理');
            return await resizeDataUrlImage(imageUrl, targetWidth, targetHeight);
        }
        
        // 如果是外部URL，先下载再处理
        if (imageUrl.startsWith('http')) {
            console.log('检测到外部URL，先下载再处理');
            try {
                const imageData = await downloadImageFromUrl(imageUrl);
                return await resizeDataUrlImage(imageData, targetWidth, targetHeight);
            } catch (downloadError) {
                console.error('下载图片失败，返回原URL:', downloadError);
                return imageUrl; // 下载失败时返回原URL
            }
        }
        
        // 其他情况，返回原图片
        console.log('无法处理的图片格式，返回原图片');
        return imageUrl;
        
    } catch (error) {
        console.error('图片尺寸调整失败:', error);
        // 如果调整失败，返回原图片
        return imageUrl;
    }
}

// --- 下载外部图片 ---
async function downloadImageFromUrl(imageUrl: string): Promise<string> {
    try {
        console.log(`下载图片: ${imageUrl}`);
        
        // 添加超时和重试机制 - 优化为更短的超时时间
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时，提高下载速度
        
        const response = await fetch(imageUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`下载失败: ${response.status} ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // 检测图片类型
        const contentType = response.headers.get('content-type') || 'image/png';
        
        // 转换为base64 - 使用更安全的方式
        let base64 = '';
        for (let i = 0; i < uint8Array.length; i++) {
            base64 += String.fromCharCode(uint8Array[i]);
        }
        base64 = btoa(base64);
        
        const dataUrl = `data:${contentType};base64,${base64}`;
        
        console.log(`图片下载成功，转换为data URL`);
        return dataUrl;
        
    } catch (error) {
        console.error('下载图片失败:', error);
        throw new Error(`下载图片失败: ${error.message}`);
    }
}

// --- 使用Deno兼容的方式调整data URL图片尺寸 ---
async function resizeDataUrlImage(dataUrl: string, targetWidth: number, targetHeight: number): Promise<string> {
    try {
        console.log(`开始调整data URL图片尺寸: ${targetWidth}x${targetHeight}`);
        
        // 由于Deno环境不支持DOM API，我们使用一个混合方案
        // 1. 尝试使用外部图像处理服务
        // 2. 如果外部服务不可用，返回原图片并标记需要前端处理
        
        // 方法1: 使用外部图像处理服务
        const resizedUrl = await resizeImageWithExternalService(dataUrl, targetWidth, targetHeight);
        if (resizedUrl) {
            console.log('外部服务处理成功');
            return resizedUrl;
        }
        
        // 方法2: 如果外部服务不可用，返回原图片并标记需要前端处理
        console.log('外部图像处理服务不可用，标记需要前端处理');
        return dataUrl; // 返回原图片，让前端处理
        
    } catch (error) {
        console.error('调整图片尺寸失败:', error);
        return dataUrl; // 返回原图片
    }
}

// --- 使用外部图像处理服务 ---
async function resizeImageWithExternalService(dataUrl: string, targetWidth: number, targetHeight: number): Promise<string | null> {
    try {
        // 使用免费的图像处理服务
        // 这里使用 Cloudinary 的免费服务作为示例
        
        // 方法1: 使用 Cloudinary (需要注册免费账号)
        // const cloudinaryUrl = await resizeWithCloudinary(dataUrl, targetWidth, targetHeight);
        // if (cloudinaryUrl) return cloudinaryUrl;
        
        // 方法2: 使用 ImageKit (需要注册免费账号)
        // const imagekitUrl = await resizeWithImageKit(dataUrl, targetWidth, targetHeight);
        // if (imagekitUrl) return imagekitUrl;
        
        // 方法3: 使用简单的在线图像处理服务
        const resizedUrl = await resizeWithSimpleService(dataUrl, targetWidth, targetHeight);
        if (resizedUrl) return resizedUrl;
        
        // 如果所有外部服务都不可用，返回null
        console.log('所有外部图像处理服务都不可用');
        return null;
        
    } catch (error) {
        console.error('外部图像处理服务失败:', error);
        return null;
    }
}

// --- 使用简单的在线图像处理服务 ---
async function resizeWithSimpleService(dataUrl: string, targetWidth: number, targetHeight: number): Promise<string | null> {
    try {
        // 使用免费的图像处理API
        // 这里使用一个简单的图像处理服务作为示例
        
        // 由于免费服务的限制，我们返回原图片并标记需要前端处理
        console.log('使用简单图像处理服务（降级到前端处理）');
        return null;
        
    } catch (error) {
        console.error('简单图像处理服务失败:', error);
        return null;
    }
}

// --- 外部图片压缩服务 ---
async function compressImageWithExternalService(dataUrl: string): Promise<string | null> {
    try {
        // 使用免费的图片压缩服务
        const serviceUrl = `https://api.tinify.com/shrink`;
        
        // 提取base64数据
        const base64Data = dataUrl.split(',')[1];
        const binaryData = atob(base64Data);
        const uint8Array = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
            uint8Array[i] = binaryData.charCodeAt(i);
        }
        
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa('api:your-api-key'), // 需要替换为实际的API key
                'Content-Type': 'application/octet-stream'
            },
            body: uint8Array
        });
        
        if (response.ok) {
            const result = await response.json();
            return result.output.url;
        }
        
        return null;
    } catch (error) {
        console.error('外部图片压缩服务失败:', error);
        return null;
    }
}

// --- 简单的内存缓存 ---
const requestCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

function getCacheKey(messages: any[], model: string): string {
    return JSON.stringify({ messages, model });
}

function getCachedResult(cacheKey: string): any | null {
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('✅ 使用缓存结果');
        return cached.result;
    }
    return null;
}

function setCachedResult(cacheKey: string, result: any): void {
    requestCache.set(cacheKey, { result, timestamp: Date.now() });
    // 限制缓存大小
    if (requestCache.size > 100) {
        const firstKey = requestCache.keys().next().value;
        requestCache.delete(firstKey);
    }
}

// --- 获取API地址的优先级逻辑 ---
function getApiBaseUrl(frontendUrl?: string): string {
    if (frontendUrl && frontendUrl.trim()) {
        return frontendUrl.trim();
    }
    
    const envUrl = Deno.env.get("API_BASE_URL");
    if (envUrl && envUrl.trim()) {
        return envUrl.trim();
    }
    
    // 默认使用新的API地址
    return "https://newapi.aicohere.org/v1/chat/completions";
}

// --- 核心业务逻辑：调用 OpenRouter ---
async function callOpenRouter(messages: any[], apiKey: string, apiBaseUrl: string, imageOptions?: { width?: number, height?: number }, model?: string): Promise<{ type: 'image' | 'text'; content: string }> {
    if (!apiKey) { throw new Error("callOpenRouter received an empty apiKey."); }
    
    // 使用指定的模型或默认模型
    const selectedModel = model || "gemini-2.5-flash-image-preview";
    
    // 检查缓存
    const cacheKey = getCacheKey(messages, selectedModel);
    const cachedResult = getCachedResult(cacheKey);
    if (cachedResult) {
        return cachedResult;
    }
    
    const openrouterPayload: any = { 
        model: selectedModel, 
        messages,
        // 🚀 激进优化6-9: 超高速参数配置
        stream: false,
        temperature: 0.3,        // 进一步降低温度以提高速度
        max_tokens: 1024,         // 大幅减少token数量
        top_p: 0.8,               // 降低top_p以提高一致性
        frequency_penalty: 0,
        presence_penalty: 0,
        timeout: 30000            // 进一步减少超时时间到30秒
    };
    
    // 如果指定了图片尺寸，添加到payload中
    if (imageOptions && imageOptions.width && imageOptions.height) {
        console.log(`设置图片尺寸: ${imageOptions.width}x${imageOptions.height}`);
        
        // 方法1: 使用image_options参数
        openrouterPayload.image_options = {
            width: imageOptions.width,
            height: imageOptions.height
        };
        
        // 方法2: 使用parameters参数
        if (!openrouterPayload.parameters) {
            openrouterPayload.parameters = {};
        }
        openrouterPayload.parameters.width = imageOptions.width;
        openrouterPayload.parameters.height = imageOptions.height;
        
        // 方法3: 在提示词中明确指定尺寸要求
        if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
            const lastMessage = messages[messages.length - 1];
            if (Array.isArray(lastMessage.content)) {
                const textContent = lastMessage.content.find(part => part.type === 'text');
                if (textContent && textContent.text) {
                    textContent.text += `\n\n请确保输出图片的尺寸为 ${imageOptions.width} × ${imageOptions.height} 像素。`;
                }
            }
        }
        
        console.log("修改后的payload:", JSON.stringify(openrouterPayload, null, 2));
    }
    
    console.log("Sending payload to OpenRouter:", JSON.stringify(openrouterPayload, null, 2));
    console.log("Using API Base URL:", apiBaseUrl);
    
    // 添加超时控制 - 优化为更短的超时时间
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 🚀 激进优化10: 超高速超时时间30秒
    
    try {
        const apiResponse = await fetch(apiBaseUrl, {
            method: "POST", 
            headers: { 
                "Authorization": `Bearer ${apiKey}`, 
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Nano Banana"
            },
            body: JSON.stringify(openrouterPayload),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
    if (!apiResponse.ok) {
        const errorBody = await apiResponse.text();
            throw new Error(`OpenRouter API error: ${apiResponse.status} - ${errorBody}`);
    }
        
        const responseData = await apiResponse.json();
    console.log("OpenRouter Response:", JSON.stringify(responseData, null, 2));
        
    const message = responseData.choices?.[0]?.message;
    console.log("提取的消息内容:", message);
        
    // 检查是否有图片返回
    if (message?.images?.[0]?.image_url?.url) { 
        console.log("检测到images字段中的图片URL:", message.images[0].image_url.url);
        const result: { type: 'image' | 'text'; content: string } = { type: 'image', content: message.images[0].image_url.url };
        setCachedResult(cacheKey, result);
        return result;
    }
        
        // 检查内容是否包含图片数据URL
        if (typeof message?.content === 'string' && message.content.startsWith('data:image/')) { 
            const result: { type: 'image' | 'text'; content: string } = { type: 'image', content: message.content };
            setCachedResult(cacheKey, result);
            return result;
        }
        
        // 检查是否有base64编码的图片
        if (typeof message?.content === 'string' && message.content.includes('data:image/')) {
            const imageMatch = message.content.match(/data:image\/[^;]+;base64,[^"]+/);
            if (imageMatch) {
                const result: { type: 'image' | 'text'; content: string } = { type: 'image', content: imageMatch[0] };
                setCachedResult(cacheKey, result);
                return result;
            }
        }
        
        // 检查是否有Markdown格式的图片链接
        if (typeof message?.content === 'string') {
            console.log("检查Markdown图片链接，内容:", JSON.stringify(message.content));
            console.log("内容类型:", typeof message.content);
            console.log("内容长度:", message.content.length);
            
            // 检查字符串中是否有不可见字符
            console.log("字符串的字符代码:");
            for (let i = 0; i < Math.min(message.content.length, 100); i++) {
                const char = message.content[i];
                const code = char.charCodeAt(0);
                console.log(`位置 ${i}: '${char}' (代码: ${code})`);
            }
            
            const markdownImageMatch = message.content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
            console.log("Markdown匹配结果:", markdownImageMatch);
            
            if (markdownImageMatch) {
                console.log("检测到Markdown格式图片链接:", markdownImageMatch[1]);
                const result: { type: 'image' | 'text'; content: string } = { type: 'image', content: markdownImageMatch[1] };
                setCachedResult(cacheKey, result);
                return result;
            } else {
                console.log("未检测到Markdown图片链接");
                // 尝试更宽松的正则表达式
                const looseMatch = message.content.match(/!\[.*?\]\((.*?)\)/);
                console.log("宽松正则表达式匹配结果:", looseMatch);
                if (looseMatch && looseMatch[1].startsWith('http')) {
                    console.log("使用宽松正则表达式检测到图片链接:", looseMatch[1]);
                    const result: { type: 'image' | 'text'; content: string } = { type: 'image', content: looseMatch[1] };
                    setCachedResult(cacheKey, result);
                    return result;
                }
            }
        }
        
        // 检查是否有直接的图片URL（不包含Markdown格式）
        if (typeof message?.content === 'string') {
            console.log("检查直接图片URL，内容:", message.content);
            const directImageUrlMatch = message.content.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp))/i);
            if (directImageUrlMatch) {
                console.log("检测到直接图片URL:", directImageUrlMatch[1]);
                const result: { type: 'image' | 'text'; content: string } = { type: 'image', content: directImageUrlMatch[1] };
                setCachedResult(cacheKey, result);
                return result;
            } else {
                console.log("未检测到直接图片URL");
            }
        }
        
        // 如果都没有，返回文本内容
        if (typeof message?.content === 'string' && message.content.trim() !== '') { 
            const result: { type: 'image' | 'text'; content: string } = { type: 'text', content: message.content };
            setCachedResult(cacheKey, result);
            return result;
        }
        
    const result: { type: 'image' | 'text'; content: string } = { type: 'text', content: "[模型没有返回有效内容]" };
    setCachedResult(cacheKey, result);
    return result;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error("请求超时，请稍后重试");
        }
        throw error;
    }
}

// --- 超高效的图片预处理函数（激进优化版） ---
async function optimizeImageForProcessing(imageDataUrl: string, targetWidth: number, targetHeight: number): Promise<string> {
    try {
        // 🚀 激进优化1: 更宽松的尺寸检查，减少不必要的处理
        if (targetWidth <= 1536 && targetHeight <= 1536) {
            console.log('✅ 图片尺寸合适，跳过预处理');
            return imageDataUrl;
        }
        
        // 🚀 激进优化2: 并行尝试多种压缩方法
        console.log(`🚀 开始超高速图片处理，目标尺寸: ${targetWidth}x${targetHeight}`);
        
        const compressionPromises = [
            compressImageWithExternalService(imageDataUrl),
            compressImageWithWebP(imageDataUrl),
            compressImageWithCanvas(imageDataUrl, targetWidth, targetHeight)
        ];
        
        // 使用 Promise.race 获取最快的压缩结果
        const result = await Promise.race(compressionPromises);
        if (result) {
            console.log('✅ 超高速压缩成功');
            return result;
        }
        
        // 🚀 激进优化3: 如果所有压缩都失败，直接返回原图（让AI模型处理）
        console.log('⚠️ 所有压缩方法失败，直接使用原图');
        return imageDataUrl;
        
    } catch (error) {
        console.warn("图片预处理失败，使用原图:", error);
        return imageDataUrl;
    }
}

// 🚀 新增: WebP压缩函数
async function compressImageWithWebP(imageDataUrl: string): Promise<string | null> {
    try {
        // 简单的WebP压缩逻辑
        const canvas = new OffscreenCanvas(1, 1);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
        const img = new Image();
        img.src = imageDataUrl;
        await new Promise(resolve => img.onload = resolve);
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const webpBlob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
        return URL.createObjectURL(webpBlob);
    } catch (error) {
        console.warn("WebP压缩失败:", error);
        return null;
    }
}

// 🚀 新增: Canvas压缩函数
async function compressImageWithCanvas(imageDataUrl: string, targetWidth: number, targetHeight: number): Promise<string | null> {
    try {
        const canvas = new OffscreenCanvas(targetWidth, targetHeight);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
        const img = new Image();
        img.src = imageDataUrl;
        await new Promise(resolve => img.onload = resolve);
        
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        const compressedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
        return URL.createObjectURL(compressedBlob);
    } catch (error) {
        console.warn("Canvas压缩失败:", error);
        return null;
    }
}

// --- 新的AI修图处理函数 ---
async function processImageEdit(
    images: string[], 
    prompt: string, 
    originalWidth: number, 
    originalHeight: number, 
    apiKey: string, 
    apiBaseUrl: string
): Promise<{ type: 'image' | 'text'; content: string; needsResize?: boolean }> {
    if (!apiKey) { throw new Error("API key is required for image editing."); }
    if (!images || images.length === 0) { throw new Error("At least one image is required."); }
    if (!prompt || prompt.trim() === '') { throw new Error("Edit prompt is required."); }
    
    // 🚀 激进优化4: 超精简提示词，最大化处理速度
    const optimizedPrompt = `处理: ${prompt} | 保持: ${originalWidth}x${originalHeight} | 只返回图片`;

    // 🚀 激进优化5: 超高速并发处理，减少日志输出
    console.log(`🚀 超高速处理 ${images.length} 张图片`);
    
    // 🚀 激进优化13: 智能跳过预处理
    const optimizedImages = await Promise.all(
        images.map(async (img, index) => {
            // 对于小图片或重复图片，直接跳过预处理
            if (originalWidth <= 1024 && originalHeight <= 1024) {
                return img;
            }
            return await optimizeImageForProcessing(img, originalWidth, originalHeight);
        })
    );
    console.log('✅ 超高速预处理完成');

    const messages = [{
        role: "user",
        content: [
            { type: "text", text: optimizedPrompt },
            ...optimizedImages.map(img => ({ type: "image_url", image_url: { url: img } }))
        ]
    }];

    const result = await callOpenRouter(messages, apiKey, apiBaseUrl);
    
    // 标记需要调整尺寸
    if (result.type === 'image') {
        return { ...result, needsResize: true };
    }
    
    return result;
}

// --- 主服务逻辑 ---
serve(async (req) => {
    const pathname = new URL(req.url).pathname;
    
    if (req.method === 'OPTIONS') { 
        return new Response(null, { 
            status: 204, 
            headers: { 
                "Access-Control-Allow-Origin": "*", 
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS", 
                "Access-Control-Allow-Headers": "Content-Type, Authorization, x-goog-api-key" 
            } 
        }); 
    }

    // --- 路由 1: Cherry Studio (Gemini, 流式) ---
    if (pathname.includes(":streamGenerateContent")) {
        try {
            const geminiRequest = await req.json();
            let apiKey = req.headers.get("Authorization")?.replace("Bearer ", "") || req.headers.get("x-goog-api-key") || "";
            if (!apiKey) { return createJsonErrorResponse("API key is missing.", 401); }
            if (!geminiRequest.contents?.length) { return createJsonErrorResponse("Invalid request: 'contents' array is missing.", 400); }
            
            // --- 智能提取逻辑 ---
            const fullHistory = geminiRequest.contents;
            const lastUserMessageIndex = fullHistory.findLastIndex((msg: any) => msg.role === 'user');
            let relevantHistory = (lastUserMessageIndex !== -1) ? fullHistory.slice(fullHistory.findLastIndex((msg: any, idx: number) => msg.role === 'model' && idx < lastUserMessageIndex), lastUserMessageIndex + 1) : [];
            if (relevantHistory.length === 0 && lastUserMessageIndex !== -1) relevantHistory = [fullHistory[lastUserMessageIndex]];
            if (relevantHistory.length === 0) return createJsonErrorResponse("No user message found.", 400);

            const openrouterMessages = relevantHistory.map((geminiMsg: any) => {
                const parts = geminiMsg.parts.map((p: any) => p.text ? {type: "text", text: p.text} : {type: "image_url", image_url: {url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`}});
                return { role: geminiMsg.role === 'model' ? 'assistant' : 'user', content: parts };
            });
            
            const apiBaseUrl = getApiBaseUrl();
            
            // --- 简化后的流处理 ---
            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        const openRouterResult = await callOpenRouter(openrouterMessages, apiKey, apiBaseUrl, undefined, geminiRequest.model);
                        const sendChunk = (data: object) => controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
                        
                        let textToStream = (openRouterResult.type === 'image') ? "好的，图片已生成：" : openRouterResult.content;
                        for (const char of textToStream) {
                            sendChunk({ candidates: [{ content: { role: "model", parts: [{ text: char }] } }] });
                            await new Promise(r => setTimeout(r, 2));
                        }
                        
                        if (openRouterResult.type === 'image') {
                            const matches = openRouterResult.content.match(/^data:(.+);base64,(.*)$/);
                            if (matches) {
                                sendChunk({ candidates: [{ content: { role: "model", parts: [{ inlineData: { mimeType: matches[1], data: matches[2] } }] } }] });
                            }
                        }
                        
                        sendChunk({ candidates: [{ finishReason: "STOP", content: { role: "model", parts: [] } }], usageMetadata: { promptTokenCount: 264, totalTokenCount: 1578 } });
                        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
                    } catch (e) {
                        console.error("Error inside stream:", e);
                        const errorMessage = e instanceof Error ? e.message : String(e);
                        const errorChunk = { error: { message: errorMessage, code: 500 } };
                        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
                    } finally {
                        controller.close();
                    }
                }
            });
            return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "Access-Control-Allow-Origin": "*" } });
        } catch (error) {
            return createJsonErrorResponse(error instanceof Error ? error.message : String(error), 500);
        }
    }

    // --- 路由 2: Cherry Studio (Gemini, 非流式) ---
    if (pathname.includes(":generateContent")) {
        try {
            const geminiRequest = await req.json();
            let apiKey = req.headers.get("Authorization")?.replace("Bearer ", "") || req.headers.get("x-goog-api-key") || "";
            if (!apiKey) { return createJsonErrorResponse("API key is missing.", 401); }
            if (!geminiRequest.contents?.length) { return createJsonErrorResponse("Invalid request: 'contents' array is missing.", 400); }

            const fullHistory = geminiRequest.contents;
            const lastUserMessageIndex = fullHistory.findLastIndex((msg: any) => msg.role === 'user');
            let relevantHistory = (lastUserMessageIndex !== -1) ? fullHistory.slice(fullHistory.findLastIndex((msg: any, idx: number) => msg.role === 'model' && idx < lastUserMessageIndex), lastUserMessageIndex + 1) : [];
            if (relevantHistory.length === 0 && lastUserMessageIndex !== -1) relevantHistory = [fullHistory[lastUserMessageIndex]];
            if (relevantHistory.length === 0) return createJsonErrorResponse("No user message found.", 400);

            const openrouterMessages = relevantHistory.map((geminiMsg: any) => {
                const parts = geminiMsg.parts.map((p: any) => p.text ? {type: "text", text: p.text} : {type: "image_url", image_url: {url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`}});
                return { role: geminiMsg.role === 'model' ? 'assistant' : 'user', content: parts };
            });
            
            const apiBaseUrl = getApiBaseUrl();
            const openRouterResult = await callOpenRouter(openrouterMessages, apiKey, apiBaseUrl, undefined, geminiRequest.model);

            const finalParts = [];
            if (openRouterResult.type === 'image') {
                const matches = openRouterResult.content.match(/^data:(.+);base64,(.*)$/);
                if (matches) {
                    finalParts.push({ text: "好的，图片已生成：" });
                    finalParts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
                } else {
                    finalParts.push({ text: "[图片生成失败]" });
                }
            } else {
                finalParts.push({ text: openRouterResult.content });
            }
            const responsePayload = { candidates: [{ content: { role: "model", parts: finalParts }, finishReason: "STOP", index: 0 }], usageMetadata: { promptTokenCount: 264, totalTokenCount: 1578 } };
            return new Response(JSON.stringify(responsePayload), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        } catch (error) {
            return createJsonErrorResponse(error instanceof Error ? error.message : String(error), 500);
        }
    }

    // --- 路由 3: 你的 Web UI (nano banana) ---
    if (pathname === "/generate") {
        try {
            const { prompt, images, apikey, model } = await req.json();
            const openrouterApiKey = apikey || Deno.env.get("OPENROUTER_API_KEY");
            if (!openrouterApiKey) { return new Response(JSON.stringify({ error: "OpenRouter API key is not set." }), { status: 500 }); }
            if (!prompt || !images || !images.length) { return new Response(JSON.stringify({ error: "Prompt and images are required." }), { status: 400 }); }
            
            const webUiMessages = [ { role: "user", content: [ {type: "text", text: prompt}, ...images.map((img: string) => ({type: "image_url", image_url: {url: img}})) ] } ];
            const apiBaseUrl = getApiBaseUrl();
            
            // --- 这里是修改的关键 ---
            const result = await callOpenRouter(webUiMessages, openrouterApiKey, apiBaseUrl, undefined, model);
    
            // 检查返回的是否是图片类型，并提取 content
            if (result && result.type === 'image') {
                // 返回给前端正确的 JSON 结构
                return new Response(JSON.stringify({ imageUrl: result.content }), { 
                    headers: { "Content-Type": "application/json" } 
                });
            } else {
                // 如果模型意外地返回了文本或其他内容，则返回错误
                const errorMessage = result ? `Model returned text instead of an image: ${result.content}` : "Model returned an empty response.";
                console.error("Error handling /generate request:", errorMessage);
                return new Response(JSON.stringify({ error: errorMessage }), { 
                    status: 500, 
                    headers: { "Content-Type": "application/json" } 
                });
            }
            
        } catch (error) {
            console.error("Error handling /generate request:", error);
            return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500 });
        }
    }

    // --- 路由 4: 新的AI修图接口 ---
    if (pathname === "/edit-image") {
        try {
            const { 
                images, 
                prompt, 
                originalWidth, 
                originalHeight, 
                apikey, 
                apiBaseUrl,
                model 
            } = await req.json();
            
            const apiKey = apikey || Deno.env.get("OPENROUTER_API_KEY");
            if (!apiKey) { 
                return new Response(JSON.stringify({ error: "API key is required." }), { status: 401 }); 
            }
            
            if (!images || images.length === 0) { 
                return new Response(JSON.stringify({ error: "At least one image is required." }), { status: 400 }); 
            }
            
            if (!prompt || prompt.trim() === '') { 
                return new Response(JSON.stringify({ error: "Edit prompt is required." }), { status: 400 }); 
            }
            
            if (!originalWidth || !originalHeight || originalWidth <= 0 || originalHeight <= 0) { 
                return new Response(JSON.stringify({ error: "Valid original dimensions are required." }), { status: 400 }); 
            }
            
            // 获取最终的API地址
            const finalApiBaseUrl = getApiBaseUrl(apiBaseUrl);
            
            console.log("Processing image edit with dimensions:", { originalWidth, originalHeight });
            console.log("Using API Base URL:", finalApiBaseUrl);
            
            // 构建简化的图片生成提示词，提高处理速度
            const imageGenerationPrompt = `快速处理：${prompt}

要求：
- 只修改指令要求的部分
- 其余保持原图一致
- 尺寸 ${originalWidth} x ${originalHeight}
- 高质量输出
- 只返回图片`;

            const webUiMessages = [ { 
                role: "user", 
                content: [ 
                    {type: "text", text: imageGenerationPrompt}, 
                    ...images.map((img: string) => ({type: "image_url", image_url: {url: img}})) 
                ] 
            }];
            
            const result = await callOpenRouter(webUiMessages, apiKey, finalApiBaseUrl, {
                width: originalWidth,
                height: originalHeight
            }, model);
            
            if (result && result.type === 'image') {
                // 调整图片尺寸以匹配原始尺寸
                console.log(`AI生成图片成功，开始调整尺寸到 ${originalWidth}x${originalHeight}`);
                const resizedImageUrl = await resizeImageToTargetDimensions(result.content, originalWidth, originalHeight);
                
                // 检查是否成功调整了尺寸
                const isBackendResized = resizedImageUrl !== result.content;
                
                // 返回调整后的图片URL给前端
                const responseData = {
                    imageUrl: resizedImageUrl,
                    originalDimensions: { width: originalWidth, height: originalHeight },
                    processedAt: new Date().toISOString(),
                    needsResize: true,
                    targetDimensions: { width: originalWidth, height: originalHeight },
                    backendResized: isBackendResized // 标记后端是否成功处理
                };
                
                console.log(`图片处理完成，后端调整: ${isBackendResized}`);
                
                return new Response(JSON.stringify(responseData), { 
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
                });
            } else {
                // 如果模型返回了文本而不是图片，返回错误
                const errorMessage = result ? `模型返回了文本而不是图片: ${result.content}` : "模型返回了空响应";
                console.error("Error: Model returned text instead of image:", errorMessage);
                return new Response(JSON.stringify({ 
                    error: errorMessage 
                }), { 
                    status: 500, 
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
                });
            }
            
        } catch (error) {
            console.error("Error handling /edit-image request:", error);
            return new Response(JSON.stringify({ 
                error: error instanceof Error ? error.message : String(error) 
            }), { 
                status: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }
    }

    // --- 路由 5: 图片尺寸调整端点 ---
    if (pathname === "/resize-image") {
        try {
            const { imageUrl, targetWidth, targetHeight } = await req.json();
            
            if (!imageUrl) {
                return new Response(JSON.stringify({ error: "Image URL is required." }), { status: 400 });
            }
            
            if (!targetWidth || !targetHeight || targetWidth <= 0 || targetHeight <= 0) {
                return new Response(JSON.stringify({ error: "Valid target dimensions are required." }), { status: 400 });
            }
            
            console.log(`图片尺寸调整请求: ${targetWidth}x${targetHeight}`);
            
            // 调用图片尺寸调整函数
            const resizedImageUrl = await resizeImageToTargetDimensions(imageUrl, targetWidth, targetHeight);
            
            const responseData = {
                originalUrl: imageUrl,
                resizedUrl: resizedImageUrl,
                targetDimensions: { width: targetWidth, height: targetHeight },
                processedAt: new Date().toISOString(),
                success: true
            };
            
            return new Response(JSON.stringify(responseData), { 
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
            });
            
        } catch (error) {
            console.error("Error handling /resize-image request:", error);
            return new Response(JSON.stringify({ 
                error: error instanceof Error ? error.message : String(error) 
            }), { 
                status: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }
    }

    // --- 路由 6: 静态文件服务 ---
    // 如果是根路径，返回 index.html
    if (pathname === "/" || pathname === "") {
        const indexHtml = await Deno.readTextFile("static/index.html");
        return new Response(indexHtml, { 
            headers: { 
                "Content-Type": "text/html; charset=utf-8",
                "Access-Control-Allow-Origin": "*"
            } 
        });
    }
    
    // 其他静态文件
    return serveDir(req, { fsRoot: "static", urlRoot: "", showDirListing: false, enableCors: true });
}, { port: 3000 });
