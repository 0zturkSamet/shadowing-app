'use client';

import { Github, Linkedin, Mail } from 'lucide-react';
import { SOCIAL_LINKS } from '@/lib/constants/branding';

export default function Footer() {
  const socialIcons = [
    { name: 'GitHub', icon: Github, href: SOCIAL_LINKS.github },
    { name: 'LinkedIn', icon: Linkedin, href: SOCIAL_LINKS.linkedin },
    { name: 'Email', icon: Mail, href: SOCIAL_LINKS.email },
  ];

  return (
    <footer className="bg-secondary text-white py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left: GitHub */}
          <a
            href={SOCIAL_LINKS.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 hover:text-youtube-red transition-colors"
            aria-label="GitHub"
          >
            <Github className="w-5 h-5" />
            <span className="text-sm font-medium">GitHub</span>
          </a>

          {/* Middle: LinkedIn */}
          <a
            href={SOCIAL_LINKS.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 hover:text-youtube-red transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin className="w-5 h-5" />
            <span className="text-sm font-medium">LinkedIn</span>
          </a>

          {/* Right: Email */}
          <a
            href={SOCIAL_LINKS.email}
            className="flex items-center space-x-2 hover:text-youtube-red transition-colors"
            aria-label="Email"
          >
            <Mail className="w-5 h-5" />
            <span className="text-sm font-medium">Email</span>
          </a>
        </div>

        {/* Copyright */}
        <div className="text-center mt-4 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} ShadowTube. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
