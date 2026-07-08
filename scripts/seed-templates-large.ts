/**
 * Seed Templates Database - Large Scale
 * Generates 500+ templates across all categories programmatically
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

// Template generator based on patterns
const BUSINESS_PATTERNS = {
  names: [
    'Corporate Strategy', 'Board Presentation', 'Investor Update', 'Market Analysis',
    'Client Success Story', 'Quarterly Review', 'Annual Report', 'Team Meeting',
    'Company Culture', 'Workplace Wellness', 'Leadership Training', 'Sales Training',
    'Customer Onboarding', 'Product Training', 'Compliance Training', 'HR Announcement',
    'Employee Recognition', 'Merger Announcement', 'Partnership Announcement', 'Industry Report',
    'Case Study', 'White Paper', 'Research Findings', 'Competitive Analysis',
    'Business Plan Presentation', 'Budget Review', 'Performance Metrics', 'Goal Setting',
  ],
  styles: ['professional', 'modern', 'corporate', 'formal', 'data-driven', 'structured'],
  music: ['corporate', 'professional', 'uplifting', 'motivational', 'neutral'],
  scenePatterns: [
    ['intro', 'analysis', 'findings', 'recommendations', 'conclusion'],
    ['overview', 'data', 'insights', 'action-items'],
    ['hook', 'problem', 'solution', 'results', 'cta'],
    ['welcome', 'agenda', 'topics', 'qna', 'closing'],
  ],
};

const MARKETING_PATTERNS = {
  names: [
    'Brand Campaign', 'Product Launch', 'Holiday Promotion', 'Seasonal Sale',
    'Customer Testimonial', 'Influencer Partnership', 'Event Promotion', 'Webinar Promotion',
    'Newsletter Video', 'Email Marketing', 'Landing Page Video', 'Checkout Video',
    'Retargeting Ad', 'Awareness Ad', 'Conversion Ad', 'Retention Campaign',
    'Loyalty Program', 'Referral Program', 'Cross-sell', 'Up-sell',
    'Companion App Ad', 'Mobile Game Ad', 'Subscription Ad', 'Free Trial',
    'Demo Request', 'Download CTA', 'Sign-up CTA', 'Limited Time Offer',
  ],
  styles: ['dynamic', 'energetic', 'trendy', 'attention-grabbing', 'emotional', 'modern'],
  music: ['energetic', 'upbeat', 'trendy', 'catchy', 'emotional', 'bold'],
  scenePatterns: [
    ['hook', 'problem', 'benefit', 'social-proof', 'cta'],
    ['awareness', 'interest', 'desire', 'action'],
    ['intro', 'feature1', 'feature2', 'offer', 'close'],
    ['testimonial1', 'testimonial2', 'testimonial3', 'cta'],
  ],
};

const SOCIAL_PATTERNS = {
  names: [
    'Birthday Celebration', 'Wedding Highlights', 'Anniversary', 'Graduation',
    'New Baby', 'Pet Birthday', 'Housewarming', 'Retirement Party',
    'Friends Reunion', 'Girls Night', 'Guys Night', 'College Memories',
    'Summer Vacation', 'Winter Holiday', 'Spring Break', 'Beach Trip',
    'Mountain Adventure', 'City Exploration', 'Food Adventure', 'Concert Experience',
    'Sports Event', 'Concert Highlights', 'Festival Fun', 'Camping Trip',
    'Road Trip', 'Backpacking Journey', 'Food Trip', 'Cultural Visit',
  ],
  styles: ['heartwarming', 'festive', 'romantic', 'playful', 'sentimental', 'cinematic'],
  music: ['celebratory', 'uplifting', 'emotional', 'lighthearted', 'adventurous', 'romantic'],
  scenePatterns: [
    ['wishes', 'memories', 'celebrating', 'closing'],
    ['beginning', 'journey', 'moments', 'together'],
    ['introduction', 'activities', 'highlights', 'conclusion'],
    ['departure', 'destination', 'adventures', 'return'],
  ],
};

const EDUCATIONAL_PATTERNS = {
  names: [
    'Math Tutorial', 'Science Experiment', 'History Lesson', 'Language Learning',
    'Coding Tutorial', 'Design Tutorial', 'Photography Course', 'Video Editing Course',
    'Music Theory', 'Art Class', 'Writing Workshop', 'Speaking Course',
    'Business Course', 'Finance Course', 'Marketing Course', 'Entrepreneurship',
    'Programming Bootcamp', 'Web Development', 'Mobile Development', 'Data Science',
    'Machine Learning', 'AI Basics', 'Digital Marketing', 'Content Creation',
    'Public Speaking', 'Presentation Skills', 'Time Management', 'Productivity Skills',
  ],
  styles: ['clear', 'structured', 'interactive', 'engaging', 'professional', 'informative'],
  music: ['educational', 'informative', 'neutral', 'background', 'academic'],
  scenePatterns: [
    ['intro', 'lesson1', 'lesson2', 'lesson3', 'summary'],
    ['welcome', 'objectives', 'content', 'exercises', 'wrap-up'],
    ['overview', 'step1', 'step2', 'step3', 'practice', 'conclusion'],
    ['hook', 'explanation', 'example', 'demonstration', 'review'],
  ],
};

const ENTERTAINMENT_PATTERNS = {
  names: [
    'Gaming Highlights', 'Streaming Intro', 'Esports Tournament', 'Speedrun',
    'Game Review', 'Walkthrough', 'Tutorial', 'Funny Moments',
    'Top 10 List', 'Reaction Video', 'Unboxing', 'Mukbang',
    'ASMR Content', 'Relaxation Video', 'Meditation Guide', 'Workout Video',
    'Dance Challenge', 'Lip Sync', 'Singing Performance', 'Cover Song',
    'Comedy Skit', 'Prank Video', 'Meme Compilation', 'Trending Topic',
    'Daily Vlog', 'Lifestyle Vlog', 'Beauty Vlog', 'Tech Review',
  ],
  styles: ['dynamic', 'trendy', 'fun', 'engaging', 'casual', 'polished'],
  music: ['intense', 'upbeat', 'trendy', 'energetic', 'dramatic', 'chill'],
  scenePatterns: [
    ['intro', 'moment1', 'moment2', 'moment3', 'outro'],
    ['opening', 'content', 'highlights', 'closing'],
    ['hook', 'setup', 'action', 'reaction', 'cta'],
    ['beginning', 'rise', 'climax', 'resolution', 'ending'],
  ],
};

const PRESENTATION_PATTERNS = {
  names: [
    'Keynote Presentation', 'Conference Talk', 'Workshop', 'Webinar',
    'Sales Pitch', 'Investor Pitch', 'Project Proposal', 'Status Update',
    'Progress Report', 'Milestone Celebration', 'Achievement Recognition', 'Award Ceremony',
    'Opening Ceremony', 'Closing Ceremony', 'Graduation Speech', 'Commencement Address',
    'Panel Discussion', 'Interview', 'Q&A Session', 'Town Hall',
    'All-Hands Meeting', 'Department Meeting', 'Team Standup', 'Retrospective',
    'Product Demo', 'Feature Demo', 'Beta Launch', 'Release Announcement',
  ],
  styles: ['professional', 'engaging', 'academic', 'persuasive', 'formal', 'informative'],
  music: ['professional', 'motivational', 'background', 'neutral', 'uplifting'],
  scenePatterns: [
    ['intro', 'topic1', 'topic2', 'topic3', 'conclusion'],
    ['opening', 'agenda', 'content', 'qna', 'closing'],
    ['welcome', 'overview', 'details', 'summary', 'next-steps'],
    ['hook', 'value-prop', 'evidence', 'recommendation', 'call-to-action'],
  ],
};

function generateTemplates(
  patterns: typeof BUSINESS_PATTERNS,
  category: TemplateSeed['category'],
  count: number
): TemplateSeed[] {
  const templates: TemplateSeed[] = [];
  const durations = [15, 30, 45, 60, 90, 120, 180, 240];
  const aspectRatios = ['16:9', '9:16', '1:1'];
  const resolutions = ['1080p', '720p', '4k'];

  for (let i = 0; i < count && i < patterns.names.length; i++) {
    const name = patterns.names[i % patterns.names.length];
    const isShortForm = category === 'SOCIAL' || (category === 'MARKETING' && Math.random() > 0.5);
    const aspectRatio = isShortForm && Math.random() > 0.3 ? '9:16' : aspectRatios[0];
    const resolution = resolutions[Math.floor(Math.random() * resolutions.length)];
    
    // Generate variant name if we're cycling
    const displayName = i < patterns.names.length 
      ? name 
      : `${name} ${Math.ceil(i / patterns.names.length)}`;

    const style = patterns.styles[Math.floor(Math.random() * patterns.styles.length)];
    const music = patterns.music[Math.floor(Math.random() * patterns.music.length)];
    const scenePattern = patterns.scenePatterns[Math.floor(Math.random() * patterns.scenePatterns.length)];

    templates.push({
      name: displayName,
      description: `Professional ${category.toLowerCase()} video template for ${name.toLowerCase()}`,
      category,
      duration: durations[Math.floor(Math.random() * durations.length)],
      aspectRatio,
      resolution,
      tags: `${category.toLowerCase()},${name.toLowerCase().replace(/\s+/g, ',')},video,template`,
      thumbnail: `https://via.placeholder.com/400x225?text=${encodeURIComponent(displayName)}`,
      templateData: {
        style,
        music,
        scenes: scenePattern,
      },
    });
  }

  return templates;
}

async function main() {
  console.log('🌱 Starting template seeding (500+ templates)...');

  try {
    // Generate templates for each category
    const allTemplates: TemplateSeed[] = [
      ...generateTemplates(BUSINESS_PATTERNS, 'BUSINESS', 100),
      ...generateTemplates(MARKETING_PATTERNS, 'MARKETING', 100),
      ...generateTemplates(SOCIAL_PATTERNS, 'SOCIAL', 100),
      ...generateTemplates(EDUCATIONAL_PATTERNS, 'EDUCATIONAL', 100),
      ...generateTemplates(ENTERTAINMENT_PATTERNS, 'ENTERTAINMENT', 50),
      ...generateTemplates(PRESENTATION_PATTERNS, 'PRESENTATION', 50),
    ];

    // Generate additional templates with variants to reach 500+
    const variantTemplates: TemplateSeed[] = [];
    for (let i = 0; i < 350; i++) {
      const sourceTemplate = allTemplates[i % allTemplates.length];
      variantTemplates.push({
        name: `${sourceTemplate.name} ${Math.floor(i / allTemplates.length) + 2}`,
        description: sourceTemplate.description,
        category: sourceTemplate.category,
        duration: sourceTemplate.duration + (i % 30),
        aspectRatio: sourceTemplate.aspectRatio,
        resolution: sourceTemplate.resolution,
        tags: `${sourceTemplate.tags},variant`,
        thumbnail: `https://via.placeholder.com/400x225?text=${encodeURIComponent(sourceTemplate.name)}`,
        templateData: sourceTemplate.templateData,
      });
    }
    
    allTemplates.push(...variantTemplates);

    console.log(`📦 Generated ${allTemplates.length} templates`);

    // Seed in batches to avoid overwhelming the database
    const batchSize = 50;
    let seeded = 0;

    for (let i = 0; i < allTemplates.length; i += batchSize) {
      const batch = allTemplates.slice(i, i + batchSize);
      
      // Use createMany for efficiency
      await prisma.template.createMany({
        data: batch.map(t => ({
          name: t.name,
          description: t.description,
          category: t.category,
          duration: t.duration,
          aspectRatio: t.aspectRatio,
          resolution: t.resolution,
          tags: t.tags,
          thumbnail: t.thumbnail,
          previewUrl: null,
          templateData: JSON.stringify(t.templateData),
          usageCount: 0,
          rating: null,
          isPublic: true,
          createdById: null,
        })),
        skipDuplicates: true, // Skip if name already exists
      });

      seeded += batch.length;
      console.log(`✅ Seeded ${seeded}/${allTemplates.length} templates`);
    }

    // Print summary
    const counts = await prisma.template.groupBy({
      by: ['category'],
      _count: true,
    });

    console.log('\n📊 Template summary by category:');
    counts.forEach(c => {
      console.log(`  ${c.category}: ${c._count} templates`);
    });

    console.log(`\n🎉 Successfully seeded ${allTemplates.length} templates!`);
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

