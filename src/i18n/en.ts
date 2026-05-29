import type { sv } from './sv';
// en must define exactly the same keys as sv (a missing/extra key is a compile error).
export const en: { [K in keyof typeof sv]: string } = {
  // ---- Nav (Task 5) ----
  navProduct: 'Product',
  navProductFeaturesLabel: 'Features',
  navProductFeaturesTitle: 'Features',
  navProductFeaturesDesc: 'The AI assistant that understands your finances',
  navProductHowTitle: 'How it works',
  navProductHowDesc: 'From question to answer with your real data',
  navProductIntegrationsTitle: 'Integrations',
  navProductIntegrationsDesc: 'Connect Fortnox, Skatteverket and more systems',
  navProductSecurityTitle: 'Security',
  navProductSecurityDesc: 'Swedish data handling, GDPR-safe',
  navPromoEyebrow: 'Lucra for firms',
  navPromoTitle: 'Scale your accounting firm',
  navPromoDesc: 'All clients, one interface.',
  navPromoLink: 'Learn more',

  navResources: 'Resources',
  navResourcesBlogTitle: 'Blog',
  navResourcesBlogDesc: 'Insights on finance and AI',
  navResourcesGuidesTitle: 'Guides',
  navResourcesGuidesDesc: 'Get started and get more out of it',
  navResourcesHelpTitle: 'Help center',
  navResourcesHelpDesc: 'Answers to common questions',
  navResourcesStoriesTitle: 'Customer stories',
  navResourcesStoriesDesc: 'How others use Lucra',

  navNews: 'News',
  navAbout: 'About us',
  navContact: 'Contact',

  navLogin: 'Log in',
  navGetStarted: 'Get started',
} as const;
