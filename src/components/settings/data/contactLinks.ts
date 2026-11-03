export interface SocialContactLink {
  id: 'github' | 'linkedin' | 'youtube' | 'whatsapp' | 'email-primary' | 'email-secondary';
  title: string;
  subtitle: string;
  href: string;
  external?: boolean;
}

export const SOCIAL_CONTACT_LINKS: SocialContactLink[] = [
  {
    id: 'github',
    title: 'GitHub',
    subtitle: 'github.com/abu-dojana',
    href: 'https://github.com/abu-dojana',
    external: true,
  },
  {
    id: 'linkedin',
    title: 'LinkedIn',
    subtitle: 'linkedin.com/in/abu-dojana',
    href: 'https://www.linkedin.com/in/abu-dojana/',
    external: true,
  },
  {
    id: 'youtube',
    title: 'YouTube',
    subtitle: 'youtube.com/@abuDojanaTahmid',
    href: 'https://www.youtube.com/@abuDojanaTahmid',
    external: true,
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    subtitle: '+880 1521-566157',
    href: 'https://wa.me/8801521566157',
    external: true,
  },
  {
    id: 'email-primary',
    title: 'Personal Email',
    subtitle: 'abudojana2001@gmail.com',
    href: 'mailto:abudojana2001@gmail.com',
  },
  {
    id: 'email-secondary',
    title: 'Direct Email',
    subtitle: 'abudojanatahmid@gmail.com',
    href: 'mailto:abudojanatahmid@gmail.com',
  },
];
