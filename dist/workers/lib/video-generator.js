"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateImageWithDalle = generateImageWithDalle;
exports.generateImageWithSDXL = generateImageWithSDXL;
exports.generateThumbnailsAndStills = generateThumbnailsAndStills;
exports.searchStockVideos = searchStockVideos;
exports.generateVideoFromPrompt = generateVideoFromPrompt;
exports.cleanupOldVideos = cleanupOldVideos;
/**
 * Generate an image using DALL-E 3 (OpenAI API)
 */
function generateImageWithDalle(prompt) {
    return __awaiter(this, void 0, void 0, function () {
        var openai, response, imageUrl, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, initializeModules()];
                case 1:
                    _b.sent();
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                    return [4 /*yield*/, openai.images.generate({
                            model: 'dall-e-3',
                            prompt: prompt,
                            n: 1,
                            size: '1024x1024',
                            response_format: 'url',
                        })];
                case 3:
                    response = _b.sent();
                    imageUrl = (_a = response.data[0]) === null || _a === void 0 ? void 0 : _a.url;
                    if (!imageUrl)
                        throw new Error('No image URL returned from DALL-E 3');
                    return [2 /*return*/, imageUrl];
                case 4:
                    error_1 = _b.sent();
                    console.error('[Image Generation] DALL-E 3 error:', error_1);
                    throw error_1;
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Generate an image using SDXL (via RunPod or other API)
 * Placeholder for actual SDXL API integration
 */
function generateImageWithSDXL(prompt) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // TODO: Integrate with SDXL API (e.g., RunPod endpoint)
            // For now, return a placeholder image
            return [2 /*return*/, 'https://placehold.co/1024x1024?text=SDXL+Image'];
        });
    });
}
/**
 * Generate thumbnails and scene stills for a video
 */
function generateThumbnailsAndStills(prompt_1) {
    return __awaiter(this, arguments, void 0, function (prompt, method) {
        var thumbnailPrompt, stillPrompts, thumbnail, stills;
        if (method === void 0) { method = 'dalle'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    thumbnailPrompt = "".concat(prompt, " -- thumbnail");
                    stillPrompts = [
                        "".concat(prompt, " -- scene 1"),
                        "".concat(prompt, " -- scene 2"),
                        "".concat(prompt, " -- scene 3"),
                    ];
                    thumbnail = '';
                    stills = [];
                    if (!(method === 'dalle')) return [3 /*break*/, 3];
                    return [4 /*yield*/, generateImageWithDalle(thumbnailPrompt)];
                case 1:
                    thumbnail = _a.sent();
                    return [4 /*yield*/, Promise.all(stillPrompts.map(function (p) { return generateImageWithDalle(p); }))];
                case 2:
                    stills = _a.sent();
                    return [3 /*break*/, 6];
                case 3: return [4 /*yield*/, generateImageWithSDXL(thumbnailPrompt)];
                case 4:
                    thumbnail = _a.sent();
                    return [4 /*yield*/, Promise.all(stillPrompts.map(function (p) { return generateImageWithSDXL(p); }))];
                case 5:
                    stills = _a.sent();
                    _a.label = 6;
                case 6: return [2 /*return*/, { thumbnail: thumbnail, stills: stills }];
            }
        });
    });
}
/**
 * Real AI Video Generator using Stock Footage with Scene-by-Scene Matching
 * Creates actual MP4 videos from text prompts that follow the script
 */
var axios_1 = require("axios");
var fs = require("node:fs");
var path = require("node:path");
var child_process_1 = require("child_process");
// @ts-ignore: No type definitions for fluent-ffmpeg
/**
 * Upscale a video clip using Real-ESRGAN (local or GPU node)
 * Assumes real-esrgan is installed and accessible via CLI
 */
function upscaleWithRealESRGAN(inputPath, outputPath) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            try {
                // Example command: real-esrgan-ncnn-vulkan -i input.mp4 -o output.mp4 -n realesrgan-x4plus
                // You may need to adjust the command based on your environment
                (0, child_process_1.execSync)("real-esrgan-ncnn-vulkan -i \"".concat(inputPath, "\" -o \"").concat(outputPath, "\" -n realesrgan-x4plus"), { stdio: 'inherit' });
                console.log("[Upscale] Real-ESRGAN upscaling complete: ".concat(outputPath));
            }
            catch (error) {
                console.error('[Upscale] Real-ESRGAN failed:', error);
                throw error;
            }
            return [2 /*return*/];
        });
    });
}
/**
 * Upscale a video clip using Topaz Video AI (cloud API, commercial)
 * Placeholder for API integration
 */
function upscaleWithTopazAPI(inputPath, outputPath) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // TODO: Implement Topaz Video AI API call
            // For now, just copy input to output as a placeholder
            fs.copyFileSync(inputPath, outputPath);
            console.log("[Upscale] Topaz Video AI placeholder: ".concat(outputPath));
            return [2 /*return*/];
        });
    });
}
// Dynamic imports to avoid webpack bundling issues
var ffmpeg;
var createClient;
var OpenAI;
// Initialize modules
function initializeModules() {
    return __awaiter(this, void 0, void 0, function () {
        var fluentFfmpeg, ffmpegInstaller, pexels, openai;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!ffmpeg) return [3 /*break*/, 3];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('fluent-ffmpeg'); })];
                case 1:
                    fluentFfmpeg = _a.sent();
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('@ffmpeg-installer/ffmpeg'); })];
                case 2:
                    ffmpegInstaller = _a.sent();
                    ffmpeg = fluentFfmpeg;
                    if ('default' in fluentFfmpeg)
                        ffmpeg = fluentFfmpeg.default;
                    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
                    _a.label = 3;
                case 3:
                    if (!!createClient) return [3 /*break*/, 5];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('pexels'); })];
                case 4:
                    pexels = _a.sent();
                    createClient = pexels.createClient;
                    _a.label = 5;
                case 5:
                    if (!!OpenAI) return [3 /*break*/, 7];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('openai'); })];
                case 6:
                    openai = _a.sent();
                    OpenAI = openai.OpenAI;
                    _a.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    });
}
var PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
var pexelsClient = null;
/**
 * Search for relevant stock videos on Pexels
 */
function searchStockVideos(query_1) {
    return __awaiter(this, arguments, void 0, function (query, limit) {
        var response, error_2;
        if (limit === void 0) { limit = 5; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // Initialize modules first
                return [4 /*yield*/, initializeModules()];
                case 1:
                    // Initialize modules first
                    _a.sent();
                    if (!PEXELS_API_KEY) {
                        console.log('[Video Generator] Using fallback videos (no Pexels API key)');
                        return [2 /*return*/, getFallbackVideos(query, limit)];
                    }
                    if (!pexelsClient && createClient) {
                        pexelsClient = createClient(PEXELS_API_KEY);
                    }
                    if (!pexelsClient) {
                        console.log('[Video Generator] Pexels client initialization failed');
                        return [2 /*return*/, getFallbackVideos(query, limit)];
                    }
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    console.log("[Video Generator] Searching Pexels for: \"".concat(query, "\""));
                    return [4 /*yield*/, pexelsClient.videos.search({
                            query: query,
                            per_page: limit,
                            size: 'large', // Request larger/higher quality videos
                            orientation: 'landscape' // Better for standard videos
                        })];
                case 3:
                    response = _a.sent();
                    if ('videos' in response && response.videos) {
                        return [2 /*return*/, response.videos.map(function (video) {
                                // Find the highest quality video file (prefer HD/FHD)
                                var videoFiles = video.video_files || [];
                                var hdFile = videoFiles.find(function (f) { return f.quality === 'hd' || f.quality === 'sd' && f.width >= 1280; });
                                var bestFile = hdFile || videoFiles[0];
                                return {
                                    url: (bestFile === null || bestFile === void 0 ? void 0 : bestFile.link) || '',
                                    duration: video.duration || 5,
                                    type: 'video'
                                };
                            }).filter(function (v) { return v.url; })];
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _a.sent();
                    console.error('[Video Generator] Pexels API error:', error_2);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/, getFallbackVideos(query, limit)];
            }
        });
    });
}
/**
 * Fallback videos when Pexels is not available
 */
function getFallbackVideos(query, limit) {
    var fallbackVideos = [
        { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', duration: 15, type: 'video' },
        { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', duration: 15, type: 'video' },
        { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', duration: 15, type: 'video' },
        { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', duration: 15, type: 'video' },
        { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', duration: 15, type: 'video' },
    ];
    return fallbackVideos.slice(0, limit);
}
/**
 * Download a video/audio file to temp directory
 */
function downloadFile(url, filename) {
    return __awaiter(this, void 0, void 0, function () {
        var tempDir, filepath, response, writer_1, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    tempDir = path.join(process.cwd(), 'public', 'temp');
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }
                    filepath = path.join(tempDir, filename);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, axios_1.default.get(url, { responseType: 'stream' })];
                case 2:
                    response = _a.sent();
                    writer_1 = fs.createWriteStream(filepath);
                    response.data.pipe(writer_1);
                    return [2 /*return*/, new Promise(function (resolve, reject) {
                            writer_1.on('finish', function () { return resolve(filepath); });
                            writer_1.on('error', reject);
                        })];
                case 3:
                    error_3 = _a.sent();
                    console.error("[Video Generator] Download error for ".concat(url, ":"), error_3);
                    throw error_3;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Parse script into individual scenes with AI
 */
function parseScriptIntoScenes(script, totalDuration) {
    return __awaiter(this, void 0, void 0, function () {
        var openai, response, content, lines, jsonMatch, scenes, parsed, error_4;
        var _a;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, initializeModules()];
                case 1:
                    _d.sent();
                    _d.label = 2;
                case 2:
                    _d.trys.push([2, 4, , 6]);
                    openai = new OpenAI({
                        apiKey: process.env.OPENAI_API_KEY,
                    });
                    console.log('[Video Generator] Parsing script into scenes with AI...');
                    return [4 /*yield*/, openai.chat.completions.create({
                            model: 'gpt-3.5-turbo',
                            messages: [
                                {
                                    role: 'system',
                                    content: "You are a video production assistant. Parse the video script into individual scenes for stock footage matching.\n\nFor each scene, extract:\n1. Scene description (what's happening)\n2. Search keywords (3-5 visual elements that can be found in stock footage)\n3. Duration in seconds (distribute ".concat(totalDuration, "s total across all scenes)\n4. Key visual elements\n\nReturn ONLY a JSON array with this structure:\n[\n  {\n    \"description\": \"Opening with flour on countertop\",\n    \"keywords\": [\"flour\", \"baking\", \"countertop\", \"kitchen\"],\n    \"duration\": 5,\n    \"visualElements\": [\"flour dust\", \"wooden counter\", \"baking preparation\"]\n  },\n  ...\n]\n\nBe specific and focus on filmable, real-world visuals. Avoid abstract concepts.")
                                },
                                {
                                    role: 'user',
                                    content: "Parse this script into scenes:\n\n".concat(script)
                                }
                            ],
                            max_tokens: 1500,
                            temperature: 0.3
                        })];
                case 3:
                    response = _d.sent();
                    content = ((_c = (_b = response.choices[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || '{}';
                    // Remove markdown code blocks with multiple strategies
                    content = content.trim();
                    // Strategy 1: Remove markdown with backticks
                    if (content.startsWith('```')) {
                        lines = content.split('\n');
                        // Remove first line if it's ```json or ```
                        if (lines[0].trim().match(/^```(json)?$/)) {
                            lines.shift();
                        }
                        // Remove last line if it's ```
                        if (lines[lines.length - 1].trim() === '```') {
                            lines.pop();
                        }
                        content = lines.join('\n').trim();
                    }
                    jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
                    if (jsonMatch) {
                        content = jsonMatch[0];
                    }
                    console.log('[Video Generator] Cleaned content for parsing:', content.substring(0, 100) + '...');
                    scenes = [];
                    try {
                        parsed = JSON.parse(content);
                        scenes = Array.isArray(parsed) ? parsed : (parsed.scenes || []);
                        // If it's not an array, try to extract it
                        if (!Array.isArray(scenes)) {
                            console.error('[Video Generator] Parsed content is not an array:', typeof scenes);
                            scenes = [];
                        }
                    }
                    catch (parseError) {
                        console.error('[Video Generator] JSON parse error:', parseError);
                        console.error('[Video Generator] Content was:', content.substring(0, 300));
                        scenes = [];
                    }
                    console.log("[Video Generator] Parsed ".concat(scenes.length, " scenes from script"));
                    scenes.forEach(function (scene, i) {
                        console.log("  Scene ".concat(i + 1, ": ").concat(scene.description, " (").concat(scene.duration, "s) - Keywords: ").concat(scene.keywords.join(', ')));
                    });
                    return [2 /*return*/, scenes];
                case 4:
                    error_4 = _d.sent();
                    console.error('[Video Generator] Scene parsing failed:', error_4);
                    _a = {
                        description: script.substring(0, 100)
                    };
                    return [4 /*yield*/, extractKeywordsLegacy(script, 'cinematic')];
                case 5: 
                // Fallback: Create one scene from the whole prompt
                return [2 /*return*/, [(_a.keywords = _d.sent(),
                            _a.duration = totalDuration,
                            _a.visualElements = [],
                            _a)]];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Legacy keyword extraction (fallback)
 */
function extractKeywordsLegacy(prompt, style) {
    return __awaiter(this, void 0, void 0, function () {
        var OpenAI_1, openai, response, keywordsText, extractedKeywords, error_5, commonWords, words, styleKeywords, keywords;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('openai'); })];
                case 1:
                    OpenAI_1 = (_c.sent()).OpenAI;
                    openai = new OpenAI_1({
                        apiKey: process.env.OPENAI_API_KEY,
                    });
                    return [4 /*yield*/, openai.chat.completions.create({
                            model: 'gpt-3.5-turbo',
                            messages: [
                                {
                                    role: 'system',
                                    content: 'Extract 3-5 visual keywords from the video description that would be good search terms for finding stock footage. Return ONLY a comma-separated list of keywords. Focus on: locations, objects, actions, and visual elements that can be filmed. Avoid abstract concepts.'
                                },
                                {
                                    role: 'user',
                                    content: prompt
                                }
                            ],
                            max_tokens: 50,
                            temperature: 0.3
                        })];
                case 2:
                    response = _c.sent();
                    keywordsText = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '';
                    extractedKeywords = keywordsText
                        .split(',')
                        .map(function (k) { return k.trim().toLowerCase(); })
                        .filter(function (k) { return k.length > 2; });
                    console.log("[Video Generator] AI extracted keywords: ".concat(extractedKeywords.join(', ')));
                    if (extractedKeywords.length > 0) {
                        return [2 /*return*/, extractedKeywords.slice(0, 5)];
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_5 = _c.sent();
                    console.error('[Video Generator] AI keyword extraction failed:', error_5);
                    return [3 /*break*/, 4];
                case 4:
                    commonWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'for', 'with', 'about', 'create', 'make', 'video', 'generate', 'prompt', 'description', 'short', 'animated'];
                    words = prompt.toLowerCase()
                        .replace(/[^\w\s]/g, '')
                        .split(/\s+/)
                        .filter(function (word) { return word.length > 3 && !commonWords.includes(word); });
                    styleKeywords = {
                        cinematic: ['nature', 'landscape', 'sunset'],
                        modern: ['city', 'technology', 'business'],
                        energetic: ['sports', 'action', 'movement'],
                        professional: ['office', 'meeting', 'workplace']
                    };
                    keywords = Array.from(new Set(__spreadArray(__spreadArray([], words.slice(0, 3), true), (styleKeywords[style] || []), true)));
                    console.log("[Video Generator] Manual extracted keywords: ".concat(keywords.join(', ')));
                    return [2 /*return*/, keywords.slice(0, 5)];
            }
        });
    });
}
/**
 * Generate a video from script with scene-by-scene matching
 */
function generateVideoFromPrompt(options) {
    return __awaiter(this, void 0, void 0, function () {
        var prompt, style, duration, addOns, upscalingMethod, scenes, sceneClips, i, scene, clips, filename, filepath, fallback, filename, filepath, error_6, tempDir, trimmedClips, _loop_1, i, fileListPath_1, fileListContent, outputFilename, outputPath_1, outputDir, publicUrl, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('[Video Generator] Starting INTELLIGENT video generation with scene matching');
                    // Initialize FFmpeg and Pexels
                    return [4 /*yield*/, initializeModules()];
                case 1:
                    // Initialize FFmpeg and Pexels
                    _a.sent();
                    prompt = options.prompt, style = options.style, duration = options.duration, addOns = options.addOns;
                    upscalingMethod = process.env.UPSCALE_METHOD || 'realesrgan';
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 19, , 20]);
                    // Step 1: Parse the script into individual scenes
                    console.log('[Video Generator] Step 1: Parsing script into scenes...');
                    return [4 /*yield*/, parseScriptIntoScenes(prompt, duration)];
                case 3:
                    scenes = _a.sent();
                    if (scenes.length === 0) {
                        throw new Error('Failed to parse script into scenes');
                    }
                    console.log("[Video Generator] Found ".concat(scenes.length, " scenes to match"));
                    // Step 2: Find and download footage for EACH scene
                    console.log('[Video Generator] Step 2: Finding footage for each scene...');
                    sceneClips = [];
                    i = 0;
                    _a.label = 4;
                case 4:
                    if (!(i < scenes.length)) return [3 /*break*/, 13];
                    scene = scenes[i];
                    console.log("[Video Generator] Processing scene ".concat(i + 1, "/").concat(scenes.length, ": ").concat(scene.description));
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 11, , 12]);
                    return [4 /*yield*/, searchStockVideos(scene.keywords[0] || 'cinematic', 1)];
                case 6:
                    clips = _a.sent();
                    if (!(clips.length > 0)) return [3 /*break*/, 8];
                    filename = "scene_".concat(Date.now(), "_").concat(i, ".mp4");
                    return [4 /*yield*/, downloadFile(clips[0].url, filename)];
                case 7:
                    filepath = _a.sent();
                    sceneClips.push({ filepath: filepath, duration: scene.duration });
                    console.log("[Video Generator] \u2713 Scene ".concat(i + 1, ": Found \"").concat(scene.keywords[0], "\" footage"));
                    return [3 /*break*/, 10];
                case 8:
                    console.log("[Video Generator] \u26A0 Scene ".concat(i + 1, ": No footage found, using fallback"));
                    fallback = getFallbackVideos('', 1)[0];
                    filename = "scene_".concat(Date.now(), "_").concat(i, ".mp4");
                    return [4 /*yield*/, downloadFile(fallback.url, filename)];
                case 9:
                    filepath = _a.sent();
                    sceneClips.push({ filepath: filepath, duration: scene.duration });
                    _a.label = 10;
                case 10: return [3 /*break*/, 12];
                case 11:
                    error_6 = _a.sent();
                    console.error("[Video Generator] Error processing scene ".concat(i + 1, ":"), error_6);
                    return [3 /*break*/, 12];
                case 12:
                    i++;
                    return [3 /*break*/, 4];
                case 13:
                    if (sceneClips.length === 0) {
                        throw new Error('Failed to download any scene clips');
                    }
                    console.log("[Video Generator] Downloaded ".concat(sceneClips.length, " scene clips"));
                    // Step 3: Trim each clip to its specified duration and add transitions
                    console.log('[Video Generator] Step 3: Trimming clips and adding transitions...');
                    tempDir = path.join(process.cwd(), 'public', 'temp');
                    trimmedClips = [];
                    _loop_1 = function (i) {
                        var _b, filepath, targetDuration, trimmedFilename, trimmedPath, upscaledFilename, upscaledPath, error_8;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    _b = sceneClips[i], filepath = _b.filepath, targetDuration = _b.duration;
                                    trimmedFilename = "trimmed_".concat(Date.now(), "_").concat(i, ".mp4");
                                    trimmedPath = path.join(tempDir, trimmedFilename);
                                    _c.label = 1;
                                case 1:
                                    _c.trys.push([1, 8, , 9]);
                                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                                            ffmpeg(filepath)
                                                .setDuration(targetDuration)
                                                .outputOptions([
                                                '-c:v libx264',
                                                '-preset ultrafast',
                                                '-crf 23',
                                                '-c:a aac',
                                                '-b:a 192k',
                                                '-ar 44100',
                                                '-r 30', // Force 30fps for consistency
                                                '-pix_fmt yuv420p', // Ensure compatibility
                                                '-movflags +faststart'
                                            ])
                                                .output(trimmedPath)
                                                .on('end', function () {
                                                console.log("[Video Generator] \u2713 Trimmed scene ".concat(i + 1, " to ").concat(targetDuration, "s"));
                                                resolve();
                                            })
                                                .on('error', function (err) {
                                                console.error("[Video Generator] Trim error for scene ".concat(i + 1, ":"), err);
                                                reject(err);
                                            })
                                                .run();
                                        })];
                                case 2:
                                    _c.sent();
                                    upscaledFilename = "upscaled_".concat(Date.now(), "_").concat(i, ".mp4");
                                    upscaledPath = path.join(tempDir, upscaledFilename);
                                    if (!(upscalingMethod === 'realesrgan')) return [3 /*break*/, 4];
                                    return [4 /*yield*/, upscaleWithRealESRGAN(trimmedPath, upscaledPath)];
                                case 3:
                                    _c.sent();
                                    return [3 /*break*/, 7];
                                case 4:
                                    if (!(upscalingMethod === 'topaz')) return [3 /*break*/, 6];
                                    return [4 /*yield*/, upscaleWithTopazAPI(trimmedPath, upscaledPath)];
                                case 5:
                                    _c.sent();
                                    return [3 /*break*/, 7];
                                case 6:
                                    // Default: no upscaling, use trimmed
                                    fs.copyFileSync(trimmedPath, upscaledPath);
                                    _c.label = 7;
                                case 7:
                                    trimmedClips.push(upscaledPath);
                                    return [3 /*break*/, 9];
                                case 8:
                                    error_8 = _c.sent();
                                    console.error("[Video Generator] Failed to trim/upscale scene ".concat(i + 1, ", using original"));
                                    trimmedClips.push(filepath);
                                    return [3 /*break*/, 9];
                                case 9: return [2 /*return*/];
                            }
                        });
                    };
                    i = 0;
                    _a.label = 14;
                case 14:
                    if (!(i < sceneClips.length)) return [3 /*break*/, 17];
                    return [5 /*yield**/, _loop_1(i)];
                case 15:
                    _a.sent();
                    _a.label = 16;
                case 16:
                    i++;
                    return [3 /*break*/, 14];
                case 17:
                    fileListPath_1 = path.join(tempDir, "filelist_".concat(Date.now(), ".txt"));
                    fileListContent = trimmedClips.map(function (clip) { return "file '".concat(clip, "'"); }).join('\n');
                    fs.writeFileSync(fileListPath_1, fileListContent);
                    outputFilename = "generated_video_".concat(Date.now(), ".mp4");
                    outputPath_1 = path.join(process.cwd(), 'public', 'generated', outputFilename);
                    outputDir = path.join(process.cwd(), 'public', 'generated');
                    if (!fs.existsSync(outputDir)) {
                        fs.mkdirSync(outputDir, { recursive: true });
                    }
                    console.log('[Video Generator] Step 4: Assembling final video with transitions...');
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            ffmpeg()
                                .input(fileListPath_1)
                                .inputOptions(['-f concat', '-safe 0'])
                                .outputOptions([
                                '-c:v libx264',
                                '-preset slow', // Higher quality encoding (slower but better)
                                '-crf 18', // Excellent quality (18 = near-lossless)
                                '-c:a aac',
                                '-b:a 256k', // Better audio quality
                                '-ar 48000', // Professional audio sample rate
                                '-r 30', // Consistent 30fps throughout
                                '-pix_fmt yuv420p', // Browser compatibility
                                '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2', // Force 1080p HD
                                '-movflags +faststart', // Fast web playback
                                '-max_muxing_queue_size 1024' // Prevent stuttering
                            ])
                                .output(outputPath_1)
                                .on('start', function (cmd) {
                                console.log('[Video Generator] FFmpeg assembly command started');
                            })
                                .on('progress', function (progress) {
                                var _a;
                                console.log("[Video Generator] Assembly progress: ".concat(((_a = progress.percent) === null || _a === void 0 ? void 0 : _a.toFixed(1)) || 0, "%"));
                            })
                                .on('end', function () {
                                console.log('[Video Generator] ✅ Video assembly complete!');
                                resolve();
                            })
                                .on('error', function (err) {
                                console.error('[Video Generator] FFmpeg assembly error:', err);
                                reject(err);
                            })
                                .run();
                        })];
                case 18:
                    _a.sent();
                    // Step 6: Clean up temp files
                    console.log('[Video Generator] Step 5: Cleaning up temporary files...');
                    __spreadArray(__spreadArray(__spreadArray([], sceneClips.map(function (c) { return c.filepath; }), true), trimmedClips, true), [fileListPath_1], false).forEach(function (file) {
                        try {
                            if (fs.existsSync(file)) {
                                fs.unlinkSync(file);
                            }
                        }
                        catch (error) {
                            console.error('[Video Generator] Cleanup error:', error);
                        }
                    });
                    publicUrl = "/generated/".concat(outputFilename);
                    console.log('[Video Generator] ✅ Video generated successfully:', publicUrl);
                    console.log("[Video Generator] Final video: ".concat(duration, "s with ").concat(scenes.length, " scenes"));
                    return [2 /*return*/, publicUrl];
                case 19:
                    error_7 = _a.sent();
                    console.error('[Video Generator] Generation failed:', error_7);
                    throw new Error("Video generation failed: ".concat(error_7 instanceof Error ? error_7.message : 'Unknown error'));
                case 20: return [2 /*return*/];
            }
        });
    });
}
/**
 * Clean up old generated videos (older than 24 hours)
 */
function cleanupOldVideos() {
    var generatedDir = path.join(process.cwd(), 'public', 'generated');
    var tempDir = path.join(process.cwd(), 'public', 'temp');
    var cleanDirectory = function (dir) {
        if (!fs.existsSync(dir))
            return;
        var files = fs.readdirSync(dir);
        var now = Date.now();
        var maxAge = 24 * 60 * 60 * 1000; // 24 hours
        files.forEach(function (file) {
            var filepath = path.join(dir, file);
            var stats = fs.statSync(filepath);
            var age = now - stats.mtimeMs;
            if (age > maxAge) {
                try {
                    fs.unlinkSync(filepath);
                    console.log("[Video Generator] Cleaned up old file: ".concat(file));
                }
                catch (error) {
                    console.error("[Video Generator] Failed to cleanup ".concat(file, ":"), error);
                }
            }
        });
    };
    cleanDirectory(generatedDir);
    cleanDirectory(tempDir);
}
