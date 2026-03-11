import Link from 'next/link';
import { Github, Twitter, Linkedin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-bg-void">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
 <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-teal"></div>
              <span className="text-lg font-bold gradient-text">StealthPilot</span>
            </div>
            <p className="text-text-muted text-sm">
              Your invisible AI co-pilot for interviews and presentations.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <div className="space-y-2">
              <Link href="#features" className="block text-text-muted hover:text-text-primary text-sm">Features</Link>
              <Link href="#pricing" className="block text-text-muted hover:text-text-primary text-sm">Pricing</Link>
              <Link href="#how-it-works" className="block text-text-muted hover:text-text-primary text-sm">How It Works</Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <div className="space-y-2">
              <Link href="/about" className="block text-text-muted hover:text-text-primary text-sm">About</Link>
              <Link href="/blog" className="block text-text-muted hover:text-text-primary text-sm">Blog</Link>
              <Link href="/contact" className="block text-text-muted hover:text-text-primary text-sm">Contact</Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <div className="space-y-2">
              <Link href="/privacy" className="block text-text-muted hover:text-text-primary text-sm">Privacy</Link>
              <Link href="/terms" className="block text-text-muted hover:text-text-primary text-sm">Terms</Link>
              <Link href="/admin/login" className="block text-brand-primary/70 hover:text-brand-primary text-sm mt-4">🔐 Admin Login</Link>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border-subtle flex flex-col md:flex-row justify-between items-center">
          <p className="text-text-muted text-sm">
            © 2026 StealthPilot. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="text-text-muted hover:text-brand-primary transition-colors">
              <Twitter size={20} />
            </a>
            <a href="#" className="text-text-muted hover:text-brand-primary transition-colors">
              <Github size={20} />
            </a>
            <a href="#" className="text-text-muted hover:text-brand-primary transition-colors">
              <Linkedin size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
