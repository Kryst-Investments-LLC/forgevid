const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const catalog = [
  ['Business Pitch', 'Turn a company idea into a concise investor-ready story.', 'BUSINESS', 60, '16:9', '/business-presentation-thumbnail.jpg', 'professional', ['Problem', 'Solution', 'Market proof', 'Call to action']],
  ['Quarterly Results', 'Present milestones, metrics, and the next-quarter plan clearly.', 'PRESENTATION', 75, '16:9', '/business-presentation-thumbnail.jpg', 'data-driven', ['Headline result', 'Key metrics', 'What changed', 'Next steps']],
  ['Product Launch', 'Build anticipation and explain a new product in under a minute.', 'MARKETING', 45, '16:9', '/product-launch-thumbnail.png', 'cinematic', ['Pattern interrupt', 'Customer problem', 'Product reveal', 'Benefits', 'Call to action']],
  ['Product Demo', 'Show a workflow from pain point to successful result.', 'BUSINESS', 60, '16:9', '/product-demo-thumbnail.png', 'clean', ['Use case', 'Before', 'Three-step demo', 'Result', 'Next action']],
  ['Social Ad', 'A fast hook-benefit-proof format for paid social campaigns.', 'MARKETING', 20, '9:16', '/social-media-ad-thumbnail.png', 'energetic', ['Hook', 'Benefit', 'Proof', 'Offer', 'Call to action']],
  ['Vertical Story', 'Create a mobile-first story with quick visual beats.', 'SOCIAL', 30, '9:16', '/social-media-ad-thumbnail.png', 'trendy', ['Cold open', 'Context', 'Moment', 'Takeaway']],
  ['How-to Tutorial', 'Teach one practical task with simple, repeatable steps.', 'EDUCATIONAL', 60, '16:9', '/tutorial-intro-thumbnail.jpg', 'instructional', ['Outcome preview', 'What you need', 'Step one', 'Step two', 'Recap']],
  ['Course Introduction', 'Welcome learners, set expectations, and establish outcomes.', 'EDUCATIONAL', 45, '16:9', '/tutorial-intro-thumbnail.jpg', 'friendly', ['Welcome', 'Learning outcomes', 'Course map', 'First action']],
  ['Event Promo', 'Announce an event with the essential details and urgency.', 'MARKETING', 30, '16:9', '/event-highlights-thumbnail.jpg', 'exciting', ['Big promise', 'What', 'When and where', 'Why attend', 'Register']],
  ['Event Highlights', 'Transform event footage into a memorable recap.', 'ENTERTAINMENT', 45, '16:9', '/event-highlights-thumbnail.jpg', 'celebratory', ['Opening energy', 'Best moments', 'People', 'Impact', 'Closing memory']],
  ['Creator Channel Intro', 'Introduce a channel identity and give viewers a reason to follow.', 'ENTERTAINMENT', 15, '16:9', '/product-launch-thumbnail.png', 'bold', ['Logo reveal', 'Creator promise', 'Content preview', 'Subscribe']],
  ['Customer Testimonial', 'Frame a credible customer transformation with proof.', 'SOCIAL', 45, '1:1', '/diverse-user-avatars.png', 'authentic', ['Who they are', 'Challenge', 'Experience', 'Result', 'Recommendation']],
];

function templateData(row) {
  const [name, description, category, duration, aspectRatio, thumbnail, style, scenes] = row;
  return {
    version: 1,
    name,
    goal: description,
    prompt: `${name}: ${description}`,
    style,
    aspectRatio,
    duration,
    scenes: scenes.map((title, index) => ({
      id: `scene-${index + 1}`,
      title,
      duration: Math.max(3, Math.round(duration / scenes.length)),
      prompt: `${title}. Use ${style} visuals appropriate for a ${category.toLowerCase()} video.`,
    })),
  };
}

async function main() {
  for (const row of catalog) {
    const [name, description, category, duration, aspectRatio, thumbnail, style] = row;
    await prisma.template.upsert({
      where: { name },
      update: {
        description,
        category,
        duration,
        aspectRatio,
        resolution: '1080p',
        tags: `${category.toLowerCase()},${style},starter,forgevid`,
        thumbnail,
        templateData: JSON.stringify(templateData(row)),
        isPublic: true,
        moderationStatus: 'approved',
      },
      create: {
        name,
        description,
        category,
        duration,
        aspectRatio,
        resolution: '1080p',
        tags: `${category.toLowerCase()},${style},starter,forgevid`,
        thumbnail,
        templateData: JSON.stringify(templateData(row)),
        isPublic: true,
        moderationStatus: 'approved',
      },
    });
  }

  const assets = [...new Set(catalog.map((row) => row[5]))];
  for (const url of assets) {
    const fileName = url.slice(1);
    const name = `ForgeVid Starter - ${fileName}`;
    await prisma.mediaAsset.upsert({
      where: { name },
      update: { url, thumbnail: url, isPublic: true },
      create: {
        name,
        fileName,
        type: 'IMAGE',
        category: 'ForgeVid starter library',
        url,
        thumbnail: url,
        resolution: '1920x1080',
        metadata: JSON.stringify({ source: 'forgevid', license: 'platform-owned', purpose: 'template-starter' }),
        isPublic: true,
      },
    });
  }

  console.log(`[Seed] ${catalog.length} built-in templates and ${assets.length} starter assets are ready.`);
}

main()
  .catch((error) => {
    console.error('[Seed] Production starter data failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
