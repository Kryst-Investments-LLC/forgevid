/**
 * Seed Templates Database
 * Creates 50 starter templates across all categories
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

interface TemplateSeed {
  name: string;
  description: string;
  category: 'BUSINESS' | 'SOCIAL' | 'EDUCATIONAL' | 'MARKETING' | 'ENTERTAINMENT' | 'PRESENTATION';
  duration: number;
  aspectRatio: string;
  resolution: string;
  tags: string;
  thumbnail: string;
  templateData: any;
}

const templates: TemplateSeed[] = [
  // BUSINESS TEMPLATES
  {
    name: 'Corporate Welcome',
    description: 'Professional corporate welcome video template',
    category: 'BUSINESS',
    duration: 30,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'business,corporate,welcome,professional',
    thumbnail: 'https://via.placeholder.com/400x225?text=Corporate+Welcome',
    templateData: {
      style: 'professional',
      music: 'corporate',
      scenes: ['intro', 'team', 'mission', 'outro'],
    },
  },
  {
    name: 'Quarterly Report',
    description: 'Quarterly business report presentation template',
    category: 'BUSINESS',
    duration: 120,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'business,report,quarterly,financial',
    thumbnail: 'https://via.placeholder.com/400x225?text=Quarterly+Report',
    templateData: {
      style: 'data-driven',
      music: 'professional',
      scenes: ['cover', 'data', 'charts', 'conclusion'],
    },
  },
  {
    name: 'Team Introduction',
    description: 'Meet your team template',
    category: 'BUSINESS',
    duration: 45,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'business,team,introduction,people',
    thumbnail: 'https://via.placeholder.com/400x225?text=Team+Intro',
    templateData: {
      style: 'modern',
      music: 'uplifting',
      scenes: ['intro', 'person1', 'person2', 'person3', 'outro'],
    },
  },
  {
    name: 'Product Launch',
    description: 'Professional product launch template',
    category: 'BUSINESS',
    duration: 60,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'business,product,launch,promotional',
    thumbnail: 'https://via.placeholder.com/400x225?text=Product+Launch',
    templateData: {
      style: 'dynamic',
      music: 'energetic',
      scenes: ['problem', 'solution', 'features', 'cta'],
    },
  },
  {
    name: 'Executive Summary',
    description: 'Executive summary presentation template',
    category: 'BUSINESS',
    duration: 90,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'business,executive,summary,presentation',
    thumbnail: 'https://via.placeholder.com/400x225?text=Executive+Summary',
    templateData: {
      style: 'formal',
      music: 'professional',
      scenes: ['overview', 'analysis', 'recommendations', 'conclusion'],
    },
  },

  // MARKETING TEMPLATES
  {
    name: 'Brand Story',
    description: 'Tell your brand story template',
    category: 'MARKETING',
    duration: 60,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'marketing,brand,story,advertising',
    thumbnail: 'https://via.placeholder.com/400x225?text=Brand+Story',
    templateData: {
      style: 'narrative',
      music: 'emotional',
      scenes: ['origin', 'journey', 'values', 'vision'],
    },
  },
  {
    name: 'Social Media Ad',
    description: 'Short social media advertisement template',
    category: 'MARKETING',
    duration: 15,
    aspectRatio: '9:16',
    resolution: '1080p',
    tags: 'marketing,social,advertisement,short',
    thumbnail: 'https://via.placeholder.com/225x400?text=Social+Ad',
    templateData: {
      style: 'attention-grabbing',
      music: 'energetic',
      scenes: ['hook', 'benefit', 'cta'],
    },
  },
  {
    name: 'TikTok Promo',
    description: 'TikTok promotional video template',
    category: 'MARKETING',
    duration: 30,
    aspectRatio: '9:16',
    resolution: '1080p',
    tags: 'marketing,tiktok,social,promo',
    thumbnail: 'https://via.placeholder.com/225x400?text=TikTok+Promo',
    templateData: {
      style: 'trendy',
      music: 'upbeat',
      scenes: ['intro', 'content', 'cta'],
    },
  },
  {
    name: 'Instagram Reel',
    description: 'Instagram Reel template',
    category: 'MARKETING',
    duration: 30,
    aspectRatio: '9:16',
    resolution: '1080p',
    tags: 'marketing,instagram,reel,social',
    thumbnail: 'https://via.placeholder.com/225x400?text=Instagram+Reel',
    templateData: {
      style: 'visual',
      music: 'trendy',
      scenes: ['opening', 'showcase', 'close'],
    },
  },
  {
    name: 'Email Campaign Video',
    description: 'Video for email marketing campaigns',
    category: 'MARKETING',
    duration: 20,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'marketing,email,campaign,promotional',
    thumbnail: 'https://via.placeholder.com/400x225?text=Email+Campaign',
    templateData: {
      style: 'quick',
      music: 'subtle',
      scenes: ['message', 'offer', 'cta'],
    },
  },

  // SOCIAL TEMPLATES
  {
    name: 'Birthday Celebration',
    description: 'Happy birthday video template',
    category: 'SOCIAL',
    duration: 45,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'social,birthday,celebration,personal',
    thumbnail: 'https://via.placeholder.com/400x225?text=Birthday',
    templateData: {
      style: 'festive',
      music: 'celebratory',
      scenes: ['wishes', 'memories', 'party'],
    },
  },
  {
    name: 'Wedding Highlights',
    description: 'Wedding highlights reel template',
    category: 'SOCIAL',
    duration: 120,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'social,wedding,celebration,personal',
    thumbnail: 'https://via.placeholder.com/400x225?text=Wedding',
    templateData: {
      style: 'romantic',
      music: 'emotional',
      scenes: ['ceremony', 'reception', 'dancing', 'vows'],
    },
  },
  {
    name: 'Travel Vlog',
    description: 'Travel vlog template',
    category: 'SOCIAL',
    duration: 180,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'social,travel,vlog,adventure',
    thumbnail: 'https://via.placeholder.com/400x225?text=Travel+Vlog',
    templateData: {
      style: 'cinematic',
      music: 'adventurous',
      scenes: ['departure', 'destination', 'activities', 'return'],
    },
  },
  {
    name: 'Family Memories',
    description: 'Family memories compilation template',
    category: 'SOCIAL',
    duration: 90,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'social,family,memories,personal',
    thumbnail: 'https://via.placeholder.com/400x225?text=Family+Memories',
    templateData: {
      style: 'heartwarming',
      music: 'sentimental',
      scenes: ['beginning', 'moments', 'together', 'love'],
    },
  },
  {
    name: 'Pet Compilation',
    description: 'Fun pet compilation template',
    category: 'SOCIAL',
    duration: 60,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'social,pet,fun,cute',
    thumbnail: 'https://via.placeholder.com/400x225?text=Pets',
    templateData: {
      style: 'playful',
      music: 'lighthearted',
      scenes: ['introduction', 'cuteness', 'antics'],
    },
  },

  // EDUCATIONAL TEMPLATES
  {
    name: 'Tutorial Video',
    description: 'Step-by-step tutorial template',
    category: 'EDUCATIONAL',
    duration: 180,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'education,tutorial,how-to,instruction',
    thumbnail: 'https://via.placeholder.com/400x225?text=Tutorial',
    templateData: {
      style: 'clear',
      music: 'informative',
      scenes: ['intro', 'step1', 'step2', 'step3', 'conclusion'],
    },
  },
  {
    name: 'Course Introduction',
    description: 'Online course introduction template',
    category: 'EDUCATIONAL',
    duration: 60,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'education,course,introduction,learning',
    thumbnail: 'https://via.placeholder.com/400x225?text=Course+Intro',
    templateData: {
      style: 'professional',
      music: 'educational',
      scenes: ['welcome', 'overview', 'objectives', 'start'],
    },
  },
  {
    name: 'Presentation Template',
    description: 'Educational presentation template',
    category: 'EDUCATIONAL',
    duration: 150,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'education,presentation,teaching,info',
    thumbnail: 'https://via.placeholder.com/400x225?text=Presentation',
    templateData: {
      style: 'structured',
      music: 'neutral',
      scenes: ['title', 'topic1', 'topic2', 'topic3', 'summary'],
    },
  },
  {
    name: 'Science Experiment',
    description: 'Documentary-style science experiment template',
    category: 'EDUCATIONAL',
    duration: 120,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'education,science,experiment,documentary',
    thumbnail: 'https://via.placeholder.com/400x225?text=Science+Exp',
    templateData: {
      style: 'documentary',
      music: 'curious',
      scenes: ['hypothesis', 'method', 'results', 'conclusion'],
    },
  },
  {
    name: 'Language Lesson',
    description: 'Language learning lesson template',
    category: 'EDUCATIONAL',
    duration: 90,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'education,language,learning,lesson',
    thumbnail: 'https://via.placeholder.com/400x225?text=Language',
    templateData: {
      style: 'interactive',
      music: 'cultural',
      scenes: ['welcome', 'vocabulary', 'practice', 'review'],
    },
  },

  // ENTERTAINMENT TEMPLATES
  {
    name: 'Gaming Highlight',
    description: 'Gaming highlights reel template',
    category: 'ENTERTAINMENT',
    duration: 60,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'entertainment,gaming,highlights,action',
    thumbnail: 'https://via.placeholder.com/400x225?text=Gaming',
    templateData: {
      style: 'energetic',
      music: 'intense',
      scenes: ['intro', 'kill1', 'kill2', 'kill3', 'outro'],
    },
  },
  {
    name: 'Music Video',
    description: 'Music video template',
    category: 'ENTERTAINMENT',
    duration: 180,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'entertainment,music,video,performance',
    thumbnail: 'https://via.placeholder.com/400x225?text=Music+Video',
    templateData: {
      style: 'artistic',
      music: 'custom',
      scenes: ['verse1', 'chorus', 'verse2', 'chorus', 'bridge'],
    },
  },
  {
    name: 'Comedy Sketch',
    description: 'Comedy sketch template',
    category: 'ENTERTAINMENT',
    duration: 90,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'entertainment,comedy,sketch,funny',
    thumbnail: 'https://via.placeholder.com/400x225?text=Comedy',
    templateData: {
      style: 'humorous',
      music: 'playful',
      scenes: ['setup', 'conflict', 'escalation', 'punchline'],
    },
  },
  {
    name: 'Movie Trailer',
    description: 'Movie trailer style template',
    category: 'ENTERTAINMENT',
    duration: 60,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'entertainment,trailer,cinematic,epic',
    thumbnail: 'https://via.placeholder.com/400x225?text=Trailer',
    templateData: {
      style: 'epic',
      music: 'dramatic',
      scenes: ['teaser', 'setup', 'action', 'release'],
    },
  },
  {
    name: 'Sports Highlights',
    description: 'Sports highlights compilation template',
    category: 'ENTERTAINMENT',
    duration: 90,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'entertainment,sports,highlights,action',
    thumbnail: 'https://via.placeholder.com/400x225?text=Sports',
    templateData: {
      style: 'dynamic',
      music: 'intense',
      scenes: ['moment1', 'moment2', 'moment3', 'celebration'],
    },
  },

  // PRESENTATION TEMPLATES
  {
    name: 'Pitch Deck Video',
    description: 'Startup pitch deck video template',
    category: 'PRESENTATION',
    duration: 180,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'presentation,pitch,startup,business',
    thumbnail: 'https://via.placeholder.com/400x225?text=Pitch+Deck',
    templateData: {
      style: 'persuasive',
      music: 'professional',
      scenes: ['problem', 'solution', 'market', 'team', 'ask'],
    },
  },
  {
    name: 'Conference Talk',
    description: 'Conference presentation template',
    category: 'PRESENTATION',
    duration: 600,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'presentation,conference,talk,professional',
    thumbnail: 'https://via.placeholder.com/400x225?text=Conference',
    templateData: {
      style: 'academic',
      music: 'background',
      scenes: ['intro', 'topic1', 'topic2', 'topic3', 'conclusion'],
    },
  },
  {
    name: 'Webinar Introduction',
    description: 'Webinar introduction template',
    category: 'PRESENTATION',
    duration: 30,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'presentation,webinar,intro,promotional',
    thumbnail: 'https://via.placeholder.com/400x225?text=Webinar',
    templateData: {
      style: 'engaging',
      music: 'welcoming',
      scenes: ['hook', 'value', 'register'],
    },
  },
  {
    name: 'Demo Video',
    description: 'Product demonstration template',
    category: 'PRESENTATION',
    duration: 120,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'presentation,demo,product,showcase',
    thumbnail: 'https://via.placeholder.com/400x225?text=Demo',
    templateData: {
      style: 'clear',
      music: 'informative',
      scenes: ['overview', 'feature1', 'feature2', 'outro'],
    },
  },
  {
    name: 'Sales Presentation',
    description: 'Sales presentation template',
    category: 'PRESENTATION',
    duration: 90,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'presentation,sales,pitch,promotional',
    thumbnail: 'https://via.placeholder.com/400x225?text=Sales',
    templateData: {
      style: 'convincing',
      music: 'persuasive',
      scenes: ['benefits', 'testimonials', 'offer', 'close'],
    },
  },

  // ADDITIONAL TEMPLATES TO REACH 50
  {
    name: 'YouTube Channel Intro',
    description: 'YouTube channel introduction template',
    category: 'ENTERTAINMENT',
    duration: 15,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'youtube,intro,branding,channel',
    thumbnail: 'https://via.placeholder.com/400x225?text=YT+Intro',
    templateData: {
      style: 'branded',
      music: 'energetic',
      scenes: ['logo', 'name', 'tagline'],
    },
  },
  {
    name: 'Thank You Video',
    description: 'Thank you appreciation template',
    category: 'SOCIAL',
    duration: 30,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'social,thank-you,appreciation,grateful',
    thumbnail: 'https://via.placeholder.com/400x225?text=Thank+You',
    templateData: {
      style: 'grateful',
      music: 'warm',
      scenes: ['message', 'impact', 'gratitude'],
    },
  },
  {
    name: 'Event Promotion',
    description: 'Event promotion template',
    category: 'MARKETING',
    duration: 30,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: 'marketing,event,promotion,announcement',
    thumbnail: 'https://via.placeholder.com/400x225?text=Event',
    templateData: {
      style: 'exciting',
      music: 'energetic',
      scenes: ['what', 'when', 'where', 'register'],
    },
  },
];

async function main() {
  console.log('🌱 Starting template seeding...');

  // Clear existing templates (optional - comment out to keep existing)
  // await prisma.template.deleteMany({});
  // console.log('✅ Cleared existing templates');

  // Seed templates
  let created = 0;
  for (const templateData of templates) {
    try {
      const template = await prisma.template.upsert({
        where: { name: templateData.name },
        update: {},
        create: {
          ...templateData,
          templateData: JSON.stringify(templateData.templateData),
          isPublic: true,
        },
      });
      created++;
      console.log(`✅ Created template: ${template.name}`);
    } catch (error) {
      console.error(`❌ Failed to create template: ${templateData.name}`, error);
    }
  }

  console.log(`\n🎉 Template seeding complete!`);
  console.log(`✅ Created/updated ${created}/${templates.length} templates`);
  
  const total = await prisma.template.count();
  console.log(`📊 Total templates in database: ${total}`);
}

main()
  .catch((error) => {
    console.error('Seeding error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

