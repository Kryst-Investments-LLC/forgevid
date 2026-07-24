/**
 * ForgeVid's daily self-marketing machine — the platform advertises itself.
 *
 * Renders vertical (9:16) marketing clips with karaoke captions using
 * ForgeVid's OWN pipeline (Pexels stock -> ElevenLabs narration -> Whisper
 * word-timing -> ffmpeg), from hand-authored scene scripts. No DB, no Redis;
 * needs .env.local keys (PEXELS_API_KEY, ELEVENLABS_API_KEY, OPENAI_API_KEY
 * for Whisper captions).
 *
 *   npx tsx scripts/marketing-batch.ts                 # today's 2 clips (rotates daily)
 *   npx tsx scripts/marketing-batch.ts --count 5       # more clips today
 *   npx tsx scripts/marketing-batch.ts --topic dealer-inventory
 *   npx tsx scripts/marketing-batch.ts --lang es       # only Spanish topics
 *   npx tsx scripts/marketing-batch.ts --list          # show all topics
 *   npx tsx scripts/marketing-batch.ts --email you@x.com   # ALSO email each clip
 *
 * Email delivery (post from your phone): pass --email or set MARKETING_EMAIL
 * in .env.local. Each clip arrives as its own email with the MP4 attached and
 * the post caption + hashtags in the body — save the attachment, open TikTok/
 * Instagram, paste the caption. Needs SMTP_* in .env.local (Resend works; with
 * forgevid.com verified there, set SMTP_FROM to noreply@forgevid.com).
 *
 * Output: marketing-out/YYYY-MM-DD/<slug>.mp4 + POST-THESE.md (caption text +
 * hashtags per clip, ready to paste when posting). Re-runs skip clips that
 * already exist, so it is safe to re-launch after any failure.
 *
 * Cost: ~$0.15-0.30 per clip (TTS + Whisper; TTS is cached by content, so
 * re-rendering the same topic is nearly free). Pexels is free.
 */
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

interface MarketingScene {
  narration: string;
  /** Concrete, high-availability Pexels query — abstract terms get no hits. */
  query: string;
  keywords: string[];
}

interface MarketingTopic {
  slug: string;
  lang: 'en' | 'es';
  /** Paste-ready caption for the social post. */
  postCaption: string;
  hashtags: string;
  scenes: MarketingScene[];
}

const TOPICS: MarketingTopic[] = [
  {
    slug: 'dealer-inventory',
    lang: 'en',
    postCaption:
      'Your whole inventory, turned into videos, before your first coffee. Paste your feed — ForgeVid does the rest.',
    hashtags: '#cardealership #automarketing #AIvideo #dealerlife #carsales',
    scenes: [
      {
        narration: 'Forty cars on your lot. Zero videos on your page. That gap is costing you buyers every single day.',
        query: 'car dealership lot',
        keywords: ['car showroom', 'cars parked'],
      },
      {
        narration: 'ForgeVid turns your inventory feed into a video for every vehicle — narrated, captioned, and branded.',
        query: 'car showroom',
        keywords: ['luxury car interior', 'new car'],
      },
      {
        narration: 'Price and specs burned into every clip. English and Spanish, same natural voice.',
        query: 'salesman handshake car',
        keywords: ['car keys handover', 'happy customer car'],
      },
      {
        narration: 'Paste your feed. Pour a coffee. Post forty videos. ForgeVid dot com.',
        query: 'pouring coffee cup',
        keywords: ['coffee cup desk', 'morning coffee'],
      },
    ],
  },
  {
    slug: 'dealer-inventory-es',
    lang: 'es',
    postCaption:
      'Todo tu inventario convertido en videos, antes de tu primer café. Pega tu feed — ForgeVid hace el resto.',
    hashtags: '#concesionario #autosusados #videoAI #ventasdeautos #marketingautomotriz',
    scenes: [
      {
        narration: 'Cuarenta autos en tu lote. Cero videos en tu página. Esa brecha te cuesta compradores todos los días.',
        query: 'car dealership lot',
        keywords: ['car showroom', 'cars parked'],
      },
      {
        narration: 'ForgeVid convierte tu inventario en un video por cada vehículo — narrado, con subtítulos y con tu marca.',
        query: 'car showroom',
        keywords: ['luxury car interior', 'new car'],
      },
      {
        narration: 'Precio y detalles en cada clip. En inglés y español, con la misma voz natural.',
        query: 'salesman handshake car',
        keywords: ['car keys handover', 'happy customer car'],
      },
      {
        narration: 'Pega tu feed. Sírvete un café. Publica cuarenta videos. ForgeVid punto com.',
        query: 'pouring coffee cup',
        keywords: ['coffee cup desk', 'morning coffee'],
      },
    ],
  },
  {
    slug: 'url-to-video',
    lang: 'en',
    postCaption:
      'Paste a website. Get a commercial. ForgeVid reads the page, writes the script, and uses the site’s own images.',
    hashtags: '#AIvideo #smallbusiness #videomarketing #contentcreation #startup',
    scenes: [
      {
        narration: 'This is the laziest way to make a commercial ever invented. Watch closely.',
        query: 'typing laptop close up',
        keywords: ['laptop keyboard', 'hands typing'],
      },
      {
        narration: 'Paste any website into ForgeVid. It reads the page, writes the script from what it actually says, and pulls in the site’s own images.',
        query: 'website design screen',
        keywords: ['computer screen webpage', 'scrolling website'],
      },
      {
        narration: 'A narrated, captioned commercial — grounded in your real product, not made-up claims.',
        query: 'video editing screen',
        keywords: ['video timeline', 'editing software'],
      },
      {
        narration: 'One link in. One commercial out. Try it at ForgeVid dot com.',
        query: 'person smiling phone',
        keywords: ['happy person smartphone', 'watching phone'],
      },
    ],
  },
  {
    slug: 'karaoke-captions',
    lang: 'en',
    postCaption:
      'Word-by-word captions, timed by AI to the actual voiceover. The style that keeps viewers watching — built in.',
    hashtags: '#captions #reels #tiktokmarketing #AIvideo #videotips',
    scenes: [
      {
        narration: 'Eighty percent of social video gets watched on mute. If your captions are boring, you already lost.',
        query: 'person scrolling phone',
        keywords: ['smartphone scrolling', 'commuter phone'],
      },
      {
        narration: 'ForgeVid burns in karaoke captions — every word lights up exactly as it’s spoken.',
        query: 'neon lights night',
        keywords: ['neon sign', 'colorful lights'],
      },
      {
        narration: 'Not guessed. Timed by AI to the real voiceover, word by word.',
        query: 'sound waveform screen',
        keywords: ['audio waveform', 'recording studio screen'],
      },
      {
        narration: 'These captions? Made by ForgeVid. Obviously. ForgeVid dot com.',
        query: 'person pointing camera',
        keywords: ['pointing at camera', 'confident person'],
      },
    ],
  },
  {
    slug: 'ten-languages',
    lang: 'en',
    postCaption:
      'One video. Ten languages. Same natural voice in every one — Spanish, Chinese, Hindi, Japanese and more.',
    hashtags: '#multilingual #globalmarketing #AIvideo #translation #internationalbusiness',
    scenes: [
      {
        narration: 'Your customers don’t all speak English. Your videos shouldn’t either.',
        query: 'world map globe',
        keywords: ['spinning globe', 'international flags'],
      },
      {
        narration: 'ForgeVid narrates your videos in ten languages — Spanish, French, Chinese, Japanese, Hindi and more.',
        query: 'diverse people talking',
        keywords: ['multicultural people', 'people conversation'],
      },
      {
        narration: 'Same natural voice across every language. Captions in the right script, every time.',
        query: 'microphone studio',
        keywords: ['podcast microphone', 'voice recording'],
      },
      {
        narration: 'Speak to the whole market, not a tenth of it. ForgeVid dot com.',
        query: 'busy city crosswalk',
        keywords: ['crowd walking', 'city street people'],
      },
    ],
  },
  {
    slug: 'natural-voices',
    lang: 'en',
    postCaption:
      'Eight natural AI voices, your own cloned voice, or your real recording. Your videos finally sound human.',
    hashtags: '#voiceover #AIvoice #contentcreator #videomarketing #texttospeech',
    scenes: [
      {
        narration: 'You can always tell a robot voice. And so can your customers — right before they scroll past.',
        query: 'robot toy',
        keywords: ['robot head', 'android machine'],
      },
      {
        narration: 'ForgeVid uses natural voices that breathe, pause, and emphasize like real narrators.',
        query: 'microphone studio',
        keywords: ['radio host', 'voice actor studio'],
      },
      {
        narration: 'Pick from eight voices, clone your own, or upload your real recording. Preview each one before you commit.',
        query: 'headphones listening',
        keywords: ['person headphones', 'listening music'],
      },
      {
        narration: 'This voice? AI. Couldn’t tell, could you? ForgeVid dot com.',
        query: 'person winking smiling',
        keywords: ['smiling face closeup', 'confident smile'],
      },
    ],
  },
  {
    slug: 'realestate-listings',
    lang: 'en',
    postCaption:
      'Every listing deserves a video tour. Address, price, beds and baths — burned in automatically.',
    hashtags: '#realestate #realtor #listingvideo #AIvideo #realestatemarketing',
    scenes: [
      {
        narration: 'Listings with video get four hundred percent more inquiries. So why does your newest listing have five photos and silence?',
        query: 'modern house exterior',
        keywords: ['luxury home', 'house front yard'],
      },
      {
        narration: 'ForgeVid turns your listing feed into narrated video tours — the address, price, beds and baths burned right in.',
        query: 'modern house interior',
        keywords: ['living room interior', 'modern kitchen'],
      },
      {
        narration: 'Your own listing photos, Ken Burns motion, natural narration. Every listing, automatically.',
        query: 'real estate agent keys',
        keywords: ['house keys handover', 'realtor showing house'],
      },
      {
        narration: 'Twenty-five listings a batch. ForgeVid dot com.',
        query: 'sold sign house',
        keywords: ['for sale sign', 'happy family house'],
      },
    ],
  },
  {
    slug: 'speed-meta',
    lang: 'en',
    postCaption:
      'This entire ad — script, voice, captions, footage — was made by the product it’s advertising. In 4 minutes.',
    hashtags: '#AIvideo #meta #videomarketing #automation #buildinpublic',
    scenes: [
      {
        narration: 'Everything you’re watching right now — the script, this voice, these captions — was made by the product it’s advertising.',
        query: 'video editing screen',
        keywords: ['computer video editing', 'timeline software'],
      },
      {
        narration: 'No editor. No agency. No camera. One prompt into ForgeVid, four minutes of rendering.',
        query: 'stopwatch timer',
        keywords: ['clock ticking', 'hourglass'],
      },
      {
        narration: 'If it can sell itself, imagine what it does for your product.',
        query: 'rocket launch',
        keywords: ['rocket taking off', 'launch pad'],
      },
      {
        narration: 'Make yours at ForgeVid dot com.',
        query: 'person smiling phone',
        keywords: ['happy person laptop', 'thumbs up'],
      },
    ],
  },
  {
    slug: 'speed-meta-es',
    lang: 'es',
    postCaption:
      'Todo este anuncio — guion, voz, subtítulos — lo hizo el mismo producto que anuncia. En 4 minutos.',
    hashtags: '#videoAI #marketingdigital #emprendedores #automatizacion #negocios',
    scenes: [
      {
        narration: 'Todo lo que estás viendo — el guion, esta voz, estos subtítulos — lo hizo el mismo producto que se está anunciando.',
        query: 'video editing screen',
        keywords: ['computer video editing', 'timeline software'],
      },
      {
        narration: 'Sin editor. Sin agencia. Sin cámara. Una idea en ForgeVid, cuatro minutos de espera.',
        query: 'stopwatch timer',
        keywords: ['clock ticking', 'hourglass'],
      },
      {
        narration: 'Si puede venderse solo, imagina lo que hará por tu negocio.',
        query: 'rocket launch',
        keywords: ['rocket taking off', 'launch pad'],
      },
      {
        narration: 'Crea el tuyo en ForgeVid punto com.',
        query: 'person smiling phone',
        keywords: ['happy person laptop', 'thumbs up'],
      },
    ],
  },
  {
    slug: 'ecommerce-product',
    lang: 'en',
    postCaption:
      'Product feed in. Scroll-stopping reels out. Every SKU gets its own video.',
    hashtags: '#ecommerce #shopify #productvideo #AIvideo #onlinestore',
    scenes: [
      {
        narration: 'Product photos don’t stop thumbs. Video does — and your whole catalog has none.',
        query: 'online shopping phone',
        keywords: ['ecommerce phone', 'shopping app'],
      },
      {
        narration: 'ForgeVid turns your product feed into a vertical video for every single SKU.',
        query: 'product photography studio',
        keywords: ['product unboxing', 'package box'],
      },
      {
        narration: 'Your product shots, motion, narration, captions. Batch of twenty at a time.',
        query: 'warehouse packages',
        keywords: ['delivery boxes', 'online store'],
      },
      {
        narration: 'Your catalog wants to be famous. ForgeVid dot com.',
        query: 'person smiling phone',
        keywords: ['influencer filming', 'happy shopper'],
      },
    ],
  },
  {
    slug: 'presenter-pip',
    lang: 'en',
    postCaption:
      'Put YOUR face on every video — presenter overlay in a corner while your product takes the screen.',
    hashtags: '#personalbrand #salesvideo #AIvideo #videoselling #realtorlife',
    scenes: [
      {
        narration: 'People buy from people. But you can’t film yourself walking every car, every house, every product.',
        query: 'person talking camera',
        keywords: ['vlogger recording', 'selfie video'],
      },
      {
        narration: 'ForgeVid puts your face in the corner while your inventory takes the screen — record yourself once.',
        query: 'picture in picture screen',
        keywords: ['video call screen', 'phone recording person'],
      },
      {
        narration: 'Your voice as the narration. Your face on the video. Zero filming days.',
        query: 'confident business person',
        keywords: ['professional portrait', 'business smile'],
      },
      {
        narration: 'Be everywhere without going anywhere. ForgeVid dot com.',
        query: 'city timelapse',
        keywords: ['busy city', 'time lapse street'],
      },
    ],
  },
  {
    slug: 'price-anchor',
    lang: 'en',
    postCaption:
      'A video agency: $500 per video, 2-week turnaround. ForgeVid: your whole month of content for $29.',
    hashtags: '#marketingbudget #smallbusinessowner #AIvideo #contentmarketing #videoproduction',
    scenes: [
      {
        narration: 'A production agency charges five hundred dollars per video and takes two weeks.',
        query: 'money counting cash',
        keywords: ['dollar bills', 'expensive invoice'],
      },
      {
        narration: 'ForgeVid renders a narrated, captioned video in about four minutes. Starting at twenty-nine dollars a month.',
        query: 'stopwatch timer',
        keywords: ['fast clock', 'speed'],
      },
      {
        narration: 'Same polish. Natural voice, karaoke captions, your branding. A fraction of one agency invoice.',
        query: 'video editing screen',
        keywords: ['professional editing', 'color grading screen'],
      },
      {
        narration: 'Do the math, then do the demo. ForgeVid dot com.',
        query: 'calculator desk',
        keywords: ['calculating finances', 'budget planning'],
      },
    ],
  },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  return {
    list: args.includes('--list'),
    count: Number(get('--count')) || 2,
    lang: get('--lang') as 'en' | 'es' | undefined,
    topic: get('--topic'),
    email: get('--email') || process.env.MARKETING_EMAIL || undefined,
  };
}

/** Resend caps attachments well above this; 20MB keeps every inbox happy. */
const MAX_ATTACH_BYTES = 20 * 1024 * 1024;

/**
 * Email one rendered clip so it can be posted straight from a phone. Failures
 * never fail the batch — the file is on disk either way.
 */
async function emailClip(
  to: string,
  topic: MarketingTopic,
  filePath: string,
  fileBytes: number,
): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || process.env.SMTP_PASS.includes('PASTE')) {
    console.log('    email: SMTP not configured in .env.local — skipped (fill SMTP_PASS with your Resend API key)');
    return;
  }
  const nodemailer = (await import('nodemailer')).default;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.resend.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const attach = fileBytes <= MAX_ATTACH_BYTES;
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'ForgeVid <noreply@forgevid.com>',
      to,
      subject: `📱 Post this: ${topic.slug} [${topic.lang}]`,
      text:
        `Caption (copy-paste):\n\n${topic.postCaption}\n\n${topic.hashtags}\n\n` +
        (attach
          ? 'The clip is attached — save it to your camera roll and post.'
          : `Clip is ${(fileBytes / 1e6).toFixed(1)}MB (too big to attach) — grab it from ${filePath}.`),
      attachments: attach
        ? [{ filename: `${topic.slug}.mp4`, path: filePath, contentType: 'video/mp4' }]
        : [],
    });
    console.log(`    email: sent to ${to}${attach ? ' (clip attached)' : ' (caption only — clip too large)'}`);
  } catch (error) {
    console.error(`    email FAILED (${error instanceof Error ? error.message : error}) — clip is still at ${filePath}`);
  }
}

async function main() {
  const fs = await import('fs');
  const path = await import('path');
  const opts = parseArgs();

  if (opts.list) {
    for (const t of TOPICS) console.log(`  ${t.slug.padEnd(24)} [${t.lang}]`);
    return;
  }

  let pool = TOPICS;
  if (opts.lang) pool = pool.filter((t) => t.lang === opts.lang);
  if (opts.topic) {
    pool = TOPICS.filter((t) => t.slug === opts.topic);
    if (pool.length === 0) {
      console.error(`Unknown topic "${opts.topic}". Use --list to see all.`);
      process.exit(1);
    }
  }

  // Rotate by day-of-year so consecutive days post different topics without
  // any state to remember.
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 0)) / 86400000);
  const start = opts.topic ? 0 : (dayOfYear * opts.count) % pool.length;
  const picked = opts.topic
    ? pool
    : Array.from({ length: Math.min(opts.count, pool.length) }, (_, i) => pool[(start + i) % pool.length]);

  const date = now.toISOString().slice(0, 10);
  const outDir = path.join(process.cwd(), 'marketing-out', date);
  fs.mkdirSync(outDir, { recursive: true });
  const postsFile = path.join(outDir, 'POST-THESE.md');

  const { resolveSceneClips, assembleVideo } = await import('../lib/video-generator');
  const { synthesizeSceneVoiceovers } = await import('../lib/voiceover');
  const { CAPTION_PRESETS } = await import('../lib/captions');

  console.log(`Rendering ${picked.length} marketing clip(s) -> ${outDir}\n`);
  let rendered = 0;

  for (const topic of picked) {
    const outPath = path.join(outDir, `${topic.slug}.mp4`);
    if (fs.existsSync(outPath)) {
      console.log(`- ${topic.slug}: already rendered today, skipping render.`);
      if (opts.email) {
        await emailClip(opts.email, topic, outPath, fs.statSync(outPath).size);
      }
      continue;
    }
    console.log(`- ${topic.slug} [${topic.lang}] (${topic.scenes.length} scenes)`);

    try {
      const planned = topic.scenes.map((s, i) => ({
        id: `scene-${i + 1}`,
        index: i,
        description: s.narration,
        narration: s.narration,
        searchQuery: s.query,
        keywords: s.keywords,
        duration: 2, // narration paces each scene
        visualElements: [] as string[],
      }));

      const resolved = await resolveSceneClips(planned as any, '9:16');
      console.log(`    stock: ${resolved.length}/${planned.length} scenes matched`);

      const sceneVoiceovers = await synthesizeSceneVoiceovers(
        resolved.map((s: any) => ({ id: s.id, description: s.narration })),
        process.env.ELEVENLABS_VOICE_ID ?? null,
      );
      if (!sceneVoiceovers) throw new Error('narration synthesis failed (ELEVENLABS_API_KEY?)');

      const { videoUrl, cues } = await assembleVideo(resolved as any, ['voiceover', 'subtitles'], '9:16', {
        sceneVoiceovers,
        voiceId: process.env.ELEVENLABS_VOICE_ID ?? null,
        transition: null, // hard cuts keep length matched to paced audio
        renderQuality: 'full',
        captionStyle: CAPTION_PRESETS.karaoke,
        captionAnimation: 'karaoke',
        language: topic.lang,
      });

      // Collect the result into today's folder: local paths are copied, and a
      // Cloudinary URL (when CLOUDINARY_* is configured) is downloaded.
      if (videoUrl.startsWith('/')) {
        fs.copyFileSync(path.join(process.cwd(), 'public', videoUrl.replace(/^\/+/, '')), outPath);
      } else {
        const res = await fetch(videoUrl);
        if (!res.ok) throw new Error(`could not download render (${res.status})`);
        fs.writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
      }

      fs.appendFileSync(
        postsFile,
        `## ${topic.slug}.mp4\n\n${topic.postCaption}\n\n${topic.hashtags}\n\n---\n\n`,
      );
      rendered++;
      console.log(`    done: ${outPath} (${cues.length} caption cues)`);

      if (opts.email) {
        await emailClip(opts.email, topic, outPath, fs.statSync(outPath).size);
      }
    } catch (error) {
      console.error(`    FAILED: ${error instanceof Error ? error.message : error}`);
      console.error('    (continuing with the next topic — re-run to retry this one)');
    }
  }

  console.log(`\n${rendered}/${picked.length} clip(s) rendered.`);
  if (rendered > 0) {
    console.log(`Post them: open ${postsFile} for paste-ready captions + hashtags.`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('\nBatch failed:', e);
  process.exit(1);
});
