/**
 * ForgeVid's daily self-marketing machine — the platform advertises itself.
 *
 * Renders vertical (9:16) marketing clips with karaoke captions using
 * ForgeVid's OWN pipeline (Pexels stock -> ElevenLabs narration -> Whisper
 * word-timing -> ffmpeg), from hand-authored scene scripts. Every topic is
 * BILINGUAL: each renders as <slug>-en.mp4 and <slug>-es.mp4 (same voice,
 * both languages) so EN and ES accounts can post in parallel. No DB, no
 * Redis; needs .env.local keys (PEXELS_API_KEY, ELEVENLABS_API_KEY,
 * OPENAI_API_KEY for Whisper captions).
 *
 *   npx tsx scripts/marketing-batch.ts                 # today's 2 topics x EN+ES (4 clips)
 *   npx tsx scripts/marketing-batch.ts --count 3       # 3 topics today (6 clips)
 *   npx tsx scripts/marketing-batch.ts --lang es       # Spanish only
 *   npx tsx scripts/marketing-batch.ts --topic dealer-inventory
 *   npx tsx scripts/marketing-batch.ts --list          # show all topics
 *   npx tsx scripts/marketing-batch.ts --email you@x.com   # ALSO email each clip
 *
 * Email delivery (post from your phone): pass --email or set MARKETING_EMAIL
 * in .env.local. Each clip arrives as its own email with the MP4 attached and
 * the post caption + hashtags in the body — save the attachment, open TikTok/
 * Instagram, paste the caption. Needs SMTP_* in .env.local (Resend works; with
 * forgevid.com verified there, set SMTP_FROM to noreply@forgevid.com).
 *
 * Narrations write urls as "dot com"/"punto com" so the voice says them
 * naturally; lib/captions normalizeSpokenUrls turns the captions back into
 * "ForgeVid.com" with karaoke timing intact.
 *
 * Cost: ~$0.15-0.30 per clip (TTS + Whisper; TTS cached by content, so
 * re-rendering the same topic is nearly free). Pexels is free.
 */
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

type Lang = 'en' | 'es';

interface MarketingScene {
  /** Concrete, high-availability Pexels query — abstract terms get no hits. */
  query: string;
  keywords: string[];
  narration: Record<Lang, string>;
}

interface MarketingTopic {
  slug: string;
  post: Record<Lang, { caption: string; hashtags: string }>;
  scenes: MarketingScene[];
}

const TOPICS: MarketingTopic[] = [
  {
    slug: 'dealer-inventory',
    post: {
      en: {
        caption:
          'Your whole inventory, turned into videos, before your first coffee. Paste your feed — ForgeVid does the rest.',
        hashtags: '#cardealership #automarketing #AIvideo #dealerlife #carsales',
      },
      es: {
        caption:
          'Todo tu inventario convertido en videos, antes de tu primer café. Pega tu feed — ForgeVid hace el resto.',
        hashtags: '#concesionario #autosusados #videoAI #ventasdeautos #marketingautomotriz',
      },
    },
    scenes: [
      {
        query: 'car dealership lot',
        keywords: ['car showroom', 'cars parked'],
        narration: {
          en: 'Forty cars on your lot. Zero videos on your page. That gap is costing you buyers every single day.',
          es: 'Cuarenta autos en tu lote. Cero videos en tu página. Esa brecha te cuesta compradores todos los días.',
        },
      },
      {
        query: 'car showroom',
        keywords: ['luxury car interior', 'new car'],
        narration: {
          en: 'ForgeVid turns your inventory feed into a video for every vehicle — narrated, captioned, and branded.',
          es: 'ForgeVid convierte tu inventario en un video por cada vehículo — narrado, con subtítulos y con tu marca.',
        },
      },
      {
        query: 'salesman handshake car',
        keywords: ['car keys handover', 'happy customer car'],
        narration: {
          en: 'Price and specs burned into every clip. English and Spanish, same natural voice.',
          es: 'Precio y detalles en cada clip. En inglés y español, con la misma voz natural.',
        },
      },
      {
        query: 'pouring coffee cup',
        keywords: ['coffee cup desk', 'morning coffee'],
        narration: {
          en: 'Paste your feed. Pour a coffee. Post forty videos. ForgeVid dot com.',
          es: 'Pega tu feed. Sírvete un café. Publica cuarenta videos. ForgeVid punto com.',
        },
      },
    ],
  },
  {
    slug: 'url-to-video',
    post: {
      en: {
        caption:
          'Paste a website. Get a commercial. ForgeVid reads the page, writes the script, and uses the site’s own images.',
        hashtags: '#AIvideo #smallbusiness #videomarketing #contentcreation #startup',
      },
      es: {
        caption:
          'Pega un sitio web. Recibe un comercial. ForgeVid lee la página, escribe el guion y usa las imágenes del propio sitio.',
        hashtags: '#videoAI #negocios #marketingdigital #emprendedores #pymes',
      },
    },
    scenes: [
      {
        query: 'typing laptop close up',
        keywords: ['laptop keyboard', 'hands typing'],
        narration: {
          en: 'This is the laziest way to make a commercial ever invented. Watch closely.',
          es: 'Esta es la forma más fácil de hacer un comercial jamás inventada. Mira con atención.',
        },
      },
      {
        query: 'website design screen',
        keywords: ['computer screen webpage', 'scrolling website'],
        narration: {
          en: 'Paste any website into ForgeVid. It reads the page, writes the script from what it actually says, and pulls in the site’s own images.',
          es: 'Pega cualquier sitio web en ForgeVid. Lee la página, escribe el guion con lo que realmente dice, y usa las imágenes del propio sitio.',
        },
      },
      {
        query: 'video editing screen',
        keywords: ['video timeline', 'editing software'],
        narration: {
          en: 'A narrated, captioned commercial — grounded in your real product, not made-up claims.',
          es: 'Un comercial narrado y subtitulado — basado en tu producto real, sin promesas inventadas.',
        },
      },
      {
        query: 'person smiling phone',
        keywords: ['happy person smartphone', 'watching phone'],
        narration: {
          en: 'One link in. One commercial out. Try it at ForgeVid dot com.',
          es: 'Entra un enlace. Sale un comercial. Pruébalo en ForgeVid punto com.',
        },
      },
    ],
  },
  {
    slug: 'karaoke-captions',
    post: {
      en: {
        caption:
          'Word-by-word captions, timed by AI to the actual voiceover. The style that keeps viewers watching — built in.',
        hashtags: '#captions #reels #tiktokmarketing #AIvideo #videotips',
      },
      es: {
        caption:
          'Subtítulos palabra por palabra, sincronizados por IA con la voz real. El estilo que retiene a la audiencia — integrado.',
        hashtags: '#subtitulos #reels #tiktokespañol #videoAI #contenidodigital',
      },
    },
    scenes: [
      {
        query: 'person scrolling phone',
        keywords: ['smartphone scrolling', 'commuter phone'],
        narration: {
          en: 'Eighty percent of social video gets watched on mute. If your captions are boring, you already lost.',
          es: 'El ochenta por ciento de los videos se ven sin sonido. Si tus subtítulos aburren, ya perdiste.',
        },
      },
      {
        query: 'neon lights night',
        keywords: ['neon sign', 'colorful lights'],
        narration: {
          en: 'ForgeVid burns in karaoke captions — every word lights up exactly as it’s spoken.',
          es: 'ForgeVid graba subtítulos estilo karaoke — cada palabra se ilumina justo cuando se pronuncia.',
        },
      },
      {
        query: 'sound waveform screen',
        keywords: ['audio waveform', 'recording studio screen'],
        narration: {
          en: 'Not guessed. Timed by AI to the real voiceover, word by word.',
          es: 'Sin adivinar. Sincronizados por IA con la voz real, palabra por palabra.',
        },
      },
      {
        query: 'person pointing camera',
        keywords: ['pointing at camera', 'confident person'],
        narration: {
          en: 'These captions? Made by ForgeVid. Obviously. ForgeVid dot com.',
          es: '¿Estos subtítulos? Hechos con ForgeVid. Obvio. ForgeVid punto com.',
        },
      },
    ],
  },
  {
    slug: 'ten-languages',
    post: {
      en: {
        caption:
          'One video. Ten languages. Same natural voice in every one — Spanish, Chinese, Hindi, Japanese and more.',
        hashtags: '#multilingual #globalmarketing #AIvideo #translation #internationalbusiness',
      },
      es: {
        caption:
          'Un video. Diez idiomas. La misma voz natural en todos — inglés, chino, hindi, japonés y más.',
        hashtags: '#idiomas #marketingglobal #videoAI #traduccion #negociosinternacionales',
      },
    },
    scenes: [
      {
        query: 'world map globe',
        keywords: ['spinning globe', 'international flags'],
        narration: {
          en: 'Your customers don’t all speak English. Your videos shouldn’t either.',
          es: 'Tus clientes no hablan un solo idioma. Tus videos tampoco deberían.',
        },
      },
      {
        query: 'diverse people talking',
        keywords: ['multicultural people', 'people conversation'],
        narration: {
          en: 'ForgeVid narrates your videos in ten languages — Spanish, French, Chinese, Japanese, Hindi and more.',
          es: 'ForgeVid narra tus videos en diez idiomas — inglés, francés, chino, japonés, hindi y más.',
        },
      },
      {
        query: 'microphone studio',
        keywords: ['podcast microphone', 'voice recording'],
        narration: {
          en: 'Same natural voice across every language. Captions in the right script, every time.',
          es: 'La misma voz natural en cada idioma. Subtítulos en el alfabeto correcto, siempre.',
        },
      },
      {
        query: 'busy city crosswalk',
        keywords: ['crowd walking', 'city street people'],
        narration: {
          en: 'Speak to the whole market, not a tenth of it. ForgeVid dot com.',
          es: 'Háblale a todo el mercado, no a una parte. ForgeVid punto com.',
        },
      },
    ],
  },
  {
    slug: 'natural-voices',
    post: {
      en: {
        caption:
          'Eight natural AI voices, your own cloned voice, or your real recording. Your videos finally sound human.',
        hashtags: '#voiceover #AIvoice #contentcreator #videomarketing #texttospeech',
      },
      es: {
        caption:
          'Ocho voces naturales de IA, tu voz clonada o tu grabación real. Tus videos por fin suenan humanos.',
        hashtags: '#vozenoff #vozAI #creadordecontenido #videomarketing #locucion',
      },
    },
    scenes: [
      {
        query: 'robot toy',
        keywords: ['robot head', 'android machine'],
        narration: {
          en: 'You can always tell a robot voice. And so can your customers — right before they scroll past.',
          es: 'Una voz robótica se nota al instante. Tus clientes también la notan — justo antes de seguir de largo.',
        },
      },
      {
        query: 'microphone studio',
        keywords: ['radio host', 'voice actor studio'],
        narration: {
          en: 'ForgeVid uses natural voices that breathe, pause, and emphasize like real narrators.',
          es: 'ForgeVid usa voces naturales que respiran, pausan y dan énfasis como narradores reales.',
        },
      },
      {
        query: 'headphones listening',
        keywords: ['person headphones', 'listening music'],
        narration: {
          en: 'Pick from eight voices, clone your own, or upload your real recording. Preview each one before you commit.',
          es: 'Elige entre ocho voces, clona la tuya o sube tu propia grabación. Escucha cada una antes de decidir.',
        },
      },
      {
        query: 'person winking smiling',
        keywords: ['smiling face closeup', 'confident smile'],
        narration: {
          en: 'This voice? AI. Couldn’t tell, could you? ForgeVid dot com.',
          es: '¿Esta voz? Es IA. No se nota, ¿verdad? ForgeVid punto com.',
        },
      },
    ],
  },
  {
    slug: 'realestate-listings',
    post: {
      en: {
        caption:
          'Every listing deserves a video tour. Address, price, beds and baths — burned in automatically.',
        hashtags: '#realestate #realtor #listingvideo #AIvideo #realestatemarketing',
      },
      es: {
        caption:
          'Cada propiedad merece su video tour. Dirección, precio, cuartos y baños — integrados automáticamente.',
        hashtags: '#bienesraices #realtorlatino #propiedades #videoAI #inmobiliaria',
      },
    },
    scenes: [
      {
        query: 'modern house exterior',
        keywords: ['luxury home', 'house front yard'],
        narration: {
          en: 'Listings with video get four hundred percent more inquiries. So why does your newest listing have five photos and silence?',
          es: 'Las propiedades con video reciben cuatrocientos por ciento más consultas. ¿Y tu última propiedad tiene cinco fotos y silencio?',
        },
      },
      {
        query: 'modern house interior',
        keywords: ['living room interior', 'modern kitchen'],
        narration: {
          en: 'ForgeVid turns your listing feed into narrated video tours — the address, price, beds and baths burned right in.',
          es: 'ForgeVid convierte tus propiedades en video tours narrados — con dirección, precio, cuartos y baños en pantalla.',
        },
      },
      {
        query: 'real estate agent keys',
        keywords: ['house keys handover', 'realtor showing house'],
        narration: {
          en: 'Your own listing photos, Ken Burns motion, natural narration. Every listing, automatically.',
          es: 'Tus propias fotos, movimiento cinematográfico, narración natural. Cada propiedad, automáticamente.',
        },
      },
      {
        query: 'sold sign house',
        keywords: ['for sale sign', 'happy family house'],
        narration: {
          en: 'Twenty-five listings a batch. ForgeVid dot com.',
          es: 'Veinticinco propiedades por lote. ForgeVid punto com.',
        },
      },
    ],
  },
  {
    slug: 'speed-meta',
    post: {
      en: {
        caption:
          'This entire ad — script, voice, captions, footage — was made by the product it’s advertising. In 4 minutes.',
        hashtags: '#AIvideo #meta #videomarketing #automation #buildinpublic',
      },
      es: {
        caption:
          'Todo este anuncio — guion, voz, subtítulos — lo hizo el mismo producto que anuncia. En 4 minutos.',
        hashtags: '#videoAI #marketingdigital #emprendedores #automatizacion #negocios',
      },
    },
    scenes: [
      {
        query: 'video editing screen',
        keywords: ['computer video editing', 'timeline software'],
        narration: {
          en: 'Everything you’re watching right now — the script, this voice, these captions — was made by the product it’s advertising.',
          es: 'Todo lo que estás viendo — el guion, esta voz, estos subtítulos — lo hizo el mismo producto que se está anunciando.',
        },
      },
      {
        query: 'stopwatch timer',
        keywords: ['clock ticking', 'hourglass'],
        narration: {
          en: 'No editor. No agency. No camera. One prompt into ForgeVid, four minutes of rendering.',
          es: 'Sin editor. Sin agencia. Sin cámara. Una idea en ForgeVid, cuatro minutos de espera.',
        },
      },
      {
        query: 'rocket launch',
        keywords: ['rocket taking off', 'launch pad'],
        narration: {
          en: 'If it can sell itself, imagine what it does for your product.',
          es: 'Si puede venderse solo, imagina lo que hará por tu negocio.',
        },
      },
      {
        query: 'person smiling phone',
        keywords: ['happy person laptop', 'thumbs up'],
        narration: {
          en: 'Make yours at ForgeVid dot com.',
          es: 'Crea el tuyo en ForgeVid punto com.',
        },
      },
    ],
  },
  {
    slug: 'ecommerce-product',
    post: {
      en: {
        caption: 'Product feed in. Scroll-stopping reels out. Every SKU gets its own video.',
        hashtags: '#ecommerce #shopify #productvideo #AIvideo #onlinestore',
      },
      es: {
        caption: 'Entra tu catálogo. Salen reels que detienen el scroll. Cada producto con su propio video.',
        hashtags: '#ecommerce #tiendaonline #videoproducto #videoAI #ventasonline',
      },
    },
    scenes: [
      {
        query: 'online shopping phone',
        keywords: ['ecommerce phone', 'shopping app'],
        narration: {
          en: 'Product photos don’t stop thumbs. Video does — and your whole catalog has none.',
          es: 'Las fotos de producto no detienen el scroll. El video sí — y tu catálogo entero no tiene ninguno.',
        },
      },
      {
        query: 'product photography studio',
        keywords: ['product unboxing', 'package box'],
        narration: {
          en: 'ForgeVid turns your product feed into a vertical video for every single SKU.',
          es: 'ForgeVid convierte tu catálogo en un video vertical para cada producto.',
        },
      },
      {
        query: 'warehouse packages',
        keywords: ['delivery boxes', 'online store'],
        narration: {
          en: 'Your product shots, motion, narration, captions. Batch of twenty at a time.',
          es: 'Tus fotos de producto, movimiento, narración y subtítulos. Lotes de veinte a la vez.',
        },
      },
      {
        query: 'person smiling phone',
        keywords: ['influencer filming', 'happy shopper'],
        narration: {
          en: 'Your catalog wants to be famous. ForgeVid dot com.',
          es: 'Tu catálogo quiere ser famoso. ForgeVid punto com.',
        },
      },
    ],
  },
  {
    slug: 'presenter-pip',
    post: {
      en: {
        caption:
          'Put YOUR face on every video — presenter overlay in a corner while your product takes the screen.',
        hashtags: '#personalbrand #salesvideo #AIvideo #videoselling #realtorlife',
      },
      es: {
        caption:
          'Pon TU cara en cada video — tu imagen en una esquina mientras tu producto llena la pantalla.',
        hashtags: '#marcapersonal #ventas #videoAI #vendedores #realtorlatino',
      },
    },
    scenes: [
      {
        query: 'person talking camera',
        keywords: ['vlogger recording', 'selfie video'],
        narration: {
          en: 'People buy from people. But you can’t film yourself walking every car, every house, every product.',
          es: 'La gente le compra a la gente. Pero no puedes grabarte mostrando cada auto, cada casa, cada producto.',
        },
      },
      {
        query: 'picture in picture screen',
        keywords: ['video call screen', 'phone recording person'],
        narration: {
          en: 'ForgeVid puts your face in the corner while your inventory takes the screen — record yourself once.',
          es: 'ForgeVid pone tu cara en la esquina mientras tu inventario llena la pantalla — grábate una sola vez.',
        },
      },
      {
        query: 'confident business person',
        keywords: ['professional portrait', 'business smile'],
        narration: {
          en: 'Your voice as the narration. Your face on the video. Zero filming days.',
          es: 'Tu voz como narración. Tu cara en el video. Cero días de grabación.',
        },
      },
      {
        query: 'city timelapse',
        keywords: ['busy city', 'time lapse street'],
        narration: {
          en: 'Be everywhere without going anywhere. ForgeVid dot com.',
          es: 'Está en todas partes sin ir a ninguna. ForgeVid punto com.',
        },
      },
    ],
  },
  {
    slug: 'price-anchor',
    post: {
      en: {
        caption:
          'A video agency: $500 per video, 2-week turnaround. ForgeVid: your whole month of content for $29.',
        hashtags: '#marketingbudget #smallbusinessowner #AIvideo #contentmarketing #videoproduction',
      },
      es: {
        caption:
          'Una agencia: $500 por video y dos semanas de espera. ForgeVid: todo tu mes de contenido por $29.',
        hashtags: '#presupuesto #negociospequeños #videoAI #marketingdecontenidos #produccionaudiovisual',
      },
    },
    scenes: [
      {
        query: 'money counting cash',
        keywords: ['dollar bills', 'expensive invoice'],
        narration: {
          en: 'A production agency charges five hundred dollars per video and takes two weeks.',
          es: 'Una agencia de producción cobra quinientos dólares por video y tarda dos semanas.',
        },
      },
      {
        query: 'stopwatch timer',
        keywords: ['fast clock', 'speed'],
        narration: {
          en: 'ForgeVid renders a narrated, captioned video in about four minutes. Starting at twenty-nine dollars a month.',
          es: 'ForgeVid produce un video narrado y subtitulado en unos cuatro minutos. Desde veintinueve dólares al mes.',
        },
      },
      {
        query: 'video editing screen',
        keywords: ['professional editing', 'color grading screen'],
        narration: {
          en: 'Same polish. Natural voice, karaoke captions, your branding. A fraction of one agency invoice.',
          es: 'El mismo acabado. Voz natural, subtítulos karaoke, tu marca. Una fracción de una sola factura de agencia.',
        },
      },
      {
        query: 'calculator desk',
        keywords: ['calculating finances', 'budget planning'],
        narration: {
          en: 'Do the math, then do the demo. ForgeVid dot com.',
          es: 'Haz las cuentas, y luego haz la prueba. ForgeVid punto com.',
        },
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
  const langArg = (get('--lang') || 'both') as Lang | 'both';
  return {
    list: args.includes('--list'),
    count: Number(get('--count')) || 2,
    langs: (langArg === 'both' ? ['en', 'es'] : [langArg]) as Lang[],
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
  lang: Lang,
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

  const post = topic.post[lang];
  const attach = fileBytes <= MAX_ATTACH_BYTES;
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'ForgeVid <noreply@forgevid.com>',
      to,
      subject: `📱 Post this [${lang.toUpperCase()}]: ${topic.slug}`,
      text:
        `Caption (copy-paste):\n\n${post.caption}\n\n${post.hashtags}\n\n` +
        (attach
          ? 'The clip is attached — save it to your camera roll and post.'
          : `Clip is ${(fileBytes / 1e6).toFixed(1)}MB (too big to attach) — grab it from ${filePath}.`),
      attachments: attach
        ? [{ filename: `${topic.slug}-${lang}.mp4`, path: filePath, contentType: 'video/mp4' }]
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
    for (const t of TOPICS) console.log(`  ${t.slug}`);
    return;
  }

  let pool = TOPICS;
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

  const jobs = picked.length * opts.langs.length;
  console.log(`Rendering ${jobs} clip(s) (${picked.length} topic(s) x ${opts.langs.join('+')}) -> ${outDir}\n`);
  let rendered = 0;

  for (const topic of picked) {
    for (const lang of opts.langs) {
      const outPath = path.join(outDir, `${topic.slug}-${lang}.mp4`);
      if (fs.existsSync(outPath)) {
        console.log(`- ${topic.slug} [${lang}]: already rendered today, skipping render.`);
        if (opts.email) {
          await emailClip(opts.email, topic, lang, outPath, fs.statSync(outPath).size);
        }
        continue;
      }
      console.log(`- ${topic.slug} [${lang}] (${topic.scenes.length} scenes)`);

      try {
        const planned = topic.scenes.map((s, i) => ({
          id: `scene-${i + 1}`,
          index: i,
          description: s.narration[lang],
          narration: s.narration[lang],
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
          language: lang,
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

        const post = topic.post[lang];
        fs.appendFileSync(
          postsFile,
          `## ${topic.slug}-${lang}.mp4\n\n${post.caption}\n\n${post.hashtags}\n\n---\n\n`,
        );
        rendered++;
        console.log(`    done: ${outPath} (${cues.length} caption cues)`);

        if (opts.email) {
          await emailClip(opts.email, topic, lang, outPath, fs.statSync(outPath).size);
        }
      } catch (error) {
        console.error(`    FAILED: ${error instanceof Error ? error.message : error}`);
        console.error('    (continuing with the next clip — re-run to retry this one)');
      }
    }
  }

  console.log(`\n${rendered}/${jobs} clip(s) rendered.`);
  if (rendered > 0) {
    console.log(`Post them: open ${postsFile} for paste-ready captions + hashtags.`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('\nBatch failed:', e);
  process.exit(1);
});
