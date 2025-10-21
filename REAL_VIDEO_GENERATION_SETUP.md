# 🎬 Real Video Generation Setup Guide

## ✅ **You Now Have REAL Video Generation!**

Your ForgeVid platform can now create **actual MP4 video files** from text prompts using:
- ✅ AI script generation (OpenAI GPT-4)
- ✅ Stock video footage (Pexels API - FREE)
- ✅ Video assembly (FFmpeg)
- ✅ Automatic download

---

## 🔑 **Get Your Free Pexels API Key (Recommended)**

Pexels provides **FREE** stock videos and images. Get your API key in 2 minutes:

### **Step 1: Create Account**
1. Go to: https://www.pexels.com/
2. Click **"Join"** (top right)
3. Sign up with email or Google

### **Step 2: Get API Key**
1. Go to: https://www.pexels.com/api/
2. Click **"Get Started"** or **"Your API Key"**
3. Accept the terms
4. **Copy your API key** (looks like: `abc123xyz789...`)

### **Step 3: Add to `.env.local`**
Open your `.env.local` file and add:
```env
PEXELS_API_KEY="your_api_key_here"
```

### **Step 4: Restart Server**
```powershell
# Stop server (Ctrl+C in terminal)
npm run dev
```

---

## 🎥 **How It Works**

When you generate a video, ForgeVid:

1. **Takes your prompt** 
   - Example: "Allyson and the Giggle Jungle Friends"

2. **Generates AI script** (OpenAI GPT-4)
   - Scene descriptions
   - Camera angles
   - Visual elements
   - Music suggestions

3. **Searches stock footage** (Pexels)
   - Extracts keywords from your prompt
   - Finds 3-5 relevant video clips
   - Downloads them automatically

4. **Assembles video** (FFmpeg)
   - Combines clips into one video
   - Optimizes for web playback
   - Saves as MP4

5. **Provides download**
   - Video is saved in `/public/generated/`
   - Accessible at `/generated/video_name.mp4`
   - Automatically cleaned up after 24 hours

---

## 💰 **Cost Breakdown**

### **With Pexels API (Recommended)**
- **Pexels**: FREE (unlimited videos)
- **OpenAI**: ~$0.03-0.10 per video
- **Total per video**: **~$0.03-0.10**

### **Without Pexels API (Fallback)**
- Uses Google's test videos as fallback
- Same OpenAI cost
- Less variety in videos

---

## 🚀 **Test It Now!**

1. **Make sure** `.env.local` has:
   ```env
   OPENAI_API_KEY="sk-..."
   PEXELS_API_KEY="..."  # Get from https://www.pexels.com/api/
   ```

2. **Restart server**:
   ```powershell
   npm run dev
   ```

3. **Go to**: http://localhost:3000/dashboard/ai

4. **Enter prompt**:
   ```
   "A magical jungle adventure with animals, bright colors, and playful energy"
   ```

5. **Select**:
   - Style: Cinematic
   - Duration: 30 seconds

6. **Click "Generate Video"**

7. **Wait ~1-2 minutes** for:
   - Script generation (10s)
   - Video search (5s)
   - Download clips (20-30s)
   - Video assembly (30-60s)

8. **Result**: A real MP4 video file assembled from stock footage!

---

## 📊 **What Videos You'll Get**

### **Example Inputs → Outputs**

| Your Prompt | Keywords Extracted | Stock Footage Used | Result |
|------------|-------------------|-------------------|--------|
| "Allyson jungle adventure" | jungle, adventure, children | Jungle scenes, kids playing, animals | 30s video combining clips |
| "Corporate office training" | corporate, office, training | Business meetings, offices | Professional training video |
| "Energetic sports highlights" | energetic, sports, highlights | Sports action, running, jumping | Fast-paced sports montage |

---

## 🛠️ **Technical Details**

### **Video Specifications**
- **Format**: MP4 (H.264)
- **Resolution**: Varies (from source clips)
- **Duration**: As requested (15-300 seconds)
- **File Size**: ~5-50MB depending on duration
- **Storage**: Local (`/public/generated/`)
- **Cleanup**: Automatic after 24 hours

### **Limitations**
- **No custom animation**: Uses stock footage only
- **Keyword matching**: Quality depends on prompt clarity
- **Style variation**: Limited to available stock clips
- **Processing time**: 1-3 minutes per video

---

## 🔧 **Troubleshooting**

### **Issue: "Video generation failed"**
**Solution**: 
- Check if `.env.local` has `PEXELS_API_KEY`
- Verify API key is valid at https://www.pexels.com/api/
- Check server console for specific errors

### **Issue: Videos look random/unrelated**
**Solution**:
- Make prompts more specific
- Use clear, descriptive keywords
- Example: Instead of "fun video", use "children playing in park with colorful toys"

### **Issue: Slow video generation**
**Causes**:
- Slow internet (downloading clips)
- FFmpeg processing large files
- Multiple videos generating at once

**Solutions**:
- Wait patiently (1-3 minutes is normal)
- Generate shorter videos (15-30s)
- Ensure only one generation at a time

### **Issue: FFmpeg errors**
**Solution**:
- FFmpeg is installed automatically with `@ffmpeg-installer/ffmpeg`
- If errors persist, check Node.js has file write permissions
- Check `/public/temp/` and `/public/generated/` directories exist

---

## 🎯 **Best Practices**

### **1. Write Clear Prompts**
❌ Bad: "Make a video"
✅ Good: "Create a corporate training video about teamwork with office scenes and professional business people"

### **2. Match Style to Content**
- **Cinematic**: Nature, travel, dramatic scenes
- **Modern**: Technology, business, innovation
- **Energetic**: Sports, action, excitement
- **Professional**: Corporate, training, formal

### **3. Optimal Duration**
- **15-30s**: Best quality (3-6 clips)
- **30-60s**: Good variety (6-12 clips)
- **60-120s**: More clips, may feel repetitive

### **4. Use Specific Keywords**
Include in your prompt:
- Setting: "jungle", "office", "beach"
- Action: "running", "meeting", "playing"
- Mood: "energetic", "calm", "dramatic"
- Objects: "animals", "computers", "sports equipment"

---

## 📈 **Upgrade Options**

### **Current Setup (FREE)**
- ✅ AI script generation
- ✅ Stock footage assembly
- ✅ Basic video output
- **Cost**: ~$0.03/video

### **Potential Upgrades**

**1. Add Voiceover** ($)
- Integrate ElevenLabs API
- Add AI-generated narration
- Cost: +$0.10-0.30/video

**2. Add Background Music** ($)
- Use royalty-free music APIs
- Auto-match to style
- Cost: FREE (with proper licensing)

**3. Custom Animations** ($$$)
- Integrate Runway ML or D-ID
- Generate custom scenes
- Cost: +$0.50-5.00/video

**4. Professional Editing** ($$$)
- Add transitions, effects, text
- Use FFmpeg advanced features
- Development time: 10-20 hours

---

## ❓ **FAQ**

**Q: Do I need to pay for Pexels?**
A: No! Pexels API is completely FREE with unlimited requests.

**Q: Can I use these videos commercially?**
A: Yes, Pexels videos are royalty-free for commercial use. Always check individual video licenses.

**Q: How long does video generation take?**
A: Typically 1-3 minutes depending on:
- Script generation: ~10-30 seconds
- Finding clips: ~5-10 seconds
- Downloading: ~20-60 seconds
- Assembly: ~30-90 seconds

**Q: Can I customize the videos more?**
A: Currently, videos are assembled from stock footage. For more customization, you'd need to integrate advanced services like Runway ML ($95/month).

**Q: Where are videos stored?**
A: Locally in `/public/generated/`. They're automatically deleted after 24 hours to save space.

**Q: What if I don't have a Pexels API key?**
A: The system will use fallback videos (Google test videos). You'll still get a video, just less variety.

---

## 🎉 **You're Ready!**

Your ForgeVid platform now generates **REAL VIDEOS**! 

**Next Steps:**
1. Get your free Pexels API key
2. Add it to `.env.local`
3. Restart the server
4. Generate your first video!

**Need help?** Check the server console for detailed logs of the video generation process.

---

**Enjoy creating videos with AI!** 🚀🎬✨

