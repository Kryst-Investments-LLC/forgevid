"use client";
export const dynamic = "force-dynamic";

import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Play,
  Sparkles,
  CheckCircle,
  Star,
  Clock,
  Image as ImageIcon,
  Zap,
  Globe,
  Users,
  Shield,
  Heart,
  Download,
  Share2,
  Eye,
  Video,
  Wand2,
  Mic
} from "lucide-react"
import ClientDarkModeToggle from "@/components/ClientDarkModeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function LandingPage() {
  const t = useTranslations();

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      {/* Language Switcher */}
      <LanguageSwitcher />
      
      {/* Dark Mode Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ClientDarkModeToggle />
      </div>

      {/* Animated Background */}
      <div className="absolute inset-0 tech-grid opacity-20"></div>
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full filter blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full filter blur-3xl animate-pulse-slow delay-500"></div>
      
      {/* Header */}
      <header className="relative z-20 glass-card border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold gradient-text">🎬 ForgeVid</h1>
              <div className="hidden md:flex space-x-6">
                <button onClick={() => scrollToSection('hero')} className="hover:text-cyan-400 transition-colors cursor-pointer">
                  {t('navigation.home')}
                </button>
                <button onClick={() => scrollToSection('features')} className="hover:text-cyan-400 transition-colors cursor-pointer">
                  {t('navigation.templates')}
                </button>
                <button onClick={() => scrollToSection('pricing')} className="hover:text-cyan-400 transition-colors cursor-pointer">
                  {t('navigation.billing')}
                </button>
                <button onClick={() => scrollToSection('testimonials')} className="hover:text-cyan-400 transition-colors cursor-pointer">
                  {t('testimonials.title')}
                </button>
              </div>
            </div>
            <div className="flex space-x-4">
              <a href="/auth/signin" className="px-6 py-2.5 rounded-lg border border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all duration-300">
                {t('common.signin')}
              </a>
              <a href="/dashboard" className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold transition-all duration-300 glow-cyan">
                {t('hero.cta.startCreating')}
              </a>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-4">
        <section id="hero" className="text-center py-20 mb-16">
          <div className="inline-flex items-center px-4 py-2 rounded-full glass-card border border-cyan-500/30 mb-6">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-sm text-cyan-300 font-medium">{t('hero.badge')}</span>
          </div>
          
          <h2 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="gradient-text">{t('hero.title')}</span>
            <br />
            <span className="text-white">{t('hero.titleHighlight')}</span>
          </h2>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto">
            {t('hero.subtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <a href="/dashboard" className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-lg hover-lift glow-cyan transition-all duration-300 shadow-xl hover:shadow-cyan-500/50">
              <Play className="inline-block mr-2 h-5 w-5" />
              {t('hero.cta.startCreating')}
            </a>
            <button onClick={() => scrollToSection('examples')} className="px-8 py-4 rounded-xl glass-card border border-purple-500/30 hover:border-purple-400/60 font-semibold text-lg transition-all duration-300">
              <Eye className="inline-block mr-2 h-5 w-5" />
              {t('hero.cta.watchDemo')}
            </button>
          </div>

          {/* Stats */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>{t('hero.stats.videosCreated')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span>{t('hero.stats.rating')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>{t('hero.stats.setupTime')}</span>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">{t('features.title')}</h3>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">{t('features.subtitle')}</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* AI Video Generator */}
            <div className="glass-card p-8 rounded-2xl hover-lift group border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                <Wand2 className="h-12 w-12 text-cyan-400" />
              </div>
              <h4 className="text-2xl font-bold mb-3 text-white">{t('features.aiVideoGenerator.title')}</h4>
              <p className="text-gray-400 leading-relaxed">{t('features.aiVideoGenerator.description')}</p>
            </div>

            {/* Stock Assets */}
            <div className="glass-card p-8 rounded-2xl hover-lift group border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                <ImageIcon className="h-12 w-12 text-purple-400" />
              </div>
              <h4 className="text-2xl font-bold mb-3 text-white">{t('features.stockAssets.title')}</h4>
              <p className="text-gray-400 leading-relaxed">{t('features.stockAssets.description')}</p>
            </div>

            {/* Collaboration */}
            <div className="glass-card p-8 rounded-2xl hover-lift group border border-pink-500/20 hover:border-pink-400/40 transition-all duration-300">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                <Users className="h-12 w-12 text-pink-400" />
              </div>
              <h4 className="text-2xl font-bold mb-3 text-white">{t('features.collaboration.title')}</h4>
              <p className="text-gray-400 leading-relaxed">{t('features.collaboration.description')}</p>
            </div>

            {/* Emotion AI */}
            <div className="glass-card p-8 rounded-2xl hover-lift group border border-indigo-500/20 hover:border-indigo-400/40 transition-all duration-300">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                <Heart className="h-12 w-12 text-indigo-400" />
              </div>
              <h4 className="text-2xl font-bold mb-3 text-white">{t('features.emotionAI.title')}</h4>
              <p className="text-gray-400 leading-relaxed">{t('features.emotionAI.description')}</p>
            </div>

            {/* VR Preview */}
            <div className="glass-card p-8 rounded-2xl hover-lift group border border-green-500/20 hover:border-green-400/40 transition-all duration-300">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                <Eye className="h-12 w-12 text-green-400" />
              </div>
              <h4 className="text-2xl font-bold mb-3 text-white">{t('features.vrPreview.title')}</h4>
              <p className="text-gray-400 leading-relaxed">{t('features.vrPreview.description')}</p>
            </div>

            {/* Multilingual */}
            <div className="glass-card p-8 rounded-2xl hover-lift group border border-yellow-500/20 hover:border-yellow-400/40 transition-all duration-300">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                <Globe className="h-12 w-12 text-yellow-400" />
              </div>
              <h4 className="text-2xl font-bold mb-3 text-white">{t('features.multilingual.title')}</h4>
              <p className="text-gray-400 leading-relaxed">{t('features.multilingual.description')}</p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-16">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">{t('pricing.title')}</h3>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">{t('pricing.subtitle')}</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Free Plan */}
            <Card className="glass-card border-gray-700 hover:border-cyan-500/50 transition-all">
              <CardHeader>
                <CardTitle className="text-2xl">{t('pricing.plans.free.title')}</CardTitle>
                <div className="text-4xl font-bold text-cyan-400">{t('pricing.plans.free.price')}</div>
                <CardDescription>{t('pricing.plans.free.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 mb-4">{t('pricing.plans.free.button')}</Button>
                <ul className="space-y-2 text-sm text-gray-400">
                  {(t.raw('pricing.plans.free.features') as string[]).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Plus Plan */}
            <Card className="glass-card border-purple-500 relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500">Popular</Badge>
              <CardHeader>
                <CardTitle className="text-2xl">{t('pricing.plans.plus.title')}</CardTitle>
                <div className="text-4xl font-bold text-purple-400">{t('pricing.plans.plus.price')}</div>
                <CardDescription>{t('pricing.plans.plus.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 mb-4">{t('pricing.plans.plus.button')}</Button>
                <ul className="space-y-2 text-sm text-gray-400">
                  {(t.raw('pricing.plans.plus.features') as string[]).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Max Plan */}
            <Card className="glass-card border-gray-700 hover:border-pink-500/50 transition-all">
              <CardHeader>
                <CardTitle className="text-2xl">{t('pricing.plans.max.title')}</CardTitle>
                <div className="text-4xl font-bold text-pink-400">{t('pricing.plans.max.price')}</div>
                <CardDescription>{t('pricing.plans.max.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-gradient-to-r from-pink-500 to-red-600 mb-4">{t('pricing.plans.max.button')}</Button>
                <ul className="space-y-2 text-sm text-gray-400">
                  {(t.raw('pricing.plans.max.features') as string[]).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-16">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">{t('testimonials.title')}</h3>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">{t('testimonials.subtitle')}</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="glass-card border-cyan-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-4 italic">"{t('testimonials.sarah.quote')}"</p>
                <div>
                  <p className="font-bold text-white">{t('testimonials.sarah.name')}</p>
                  <p className="text-sm text-gray-400">{t('testimonials.sarah.position')}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-purple-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-4 italic">"{t('testimonials.michael.quote')}"</p>
                <div>
                  <p className="font-bold text-white">{t('testimonials.michael.name')}</p>
                  <p className="text-sm text-gray-400">{t('testimonials.michael.position')}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-pink-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-4 italic">"{t('testimonials.emily.quote')}"</p>
                <div>
                  <p className="font-bold text-white">{t('testimonials.emily.name')}</p>
                  <p className="text-sm text-gray-400">{t('testimonials.emily.position')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 text-center">
          <div className="glass-card p-12 rounded-3xl border border-cyan-500/30">
            <h3 className="text-4xl font-bold mb-4 gradient-text">{t('cta.title')}</h3>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">{t('cta.subtitle')}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
              <a href="/dashboard" className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold text-lg hover-lift transition-all">
                {t('cta.buttons.startTrial')}
              </a>
              <a href="/help" className="px-8 py-4 rounded-xl glass-card border border-white/20 hover:border-white/40 font-semibold text-lg transition-all">
                {t('cta.buttons.scheduleDemo')}
              </a>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-400">
              {(t.raw('cta.guarantees') as string[]).map((guarantee, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>{guarantee}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-16">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold gradient-text mb-4">ForgeVid</h3>
              <p className="text-gray-400 text-sm">{t('footer.description')}</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">{t('footer.product.title')}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/dashboard/templates" className="hover:text-cyan-400 transition-colors">{t('footer.product.links.features')}</a></li>
                <li><a href="/dashboard/templates" className="hover:text-cyan-400 transition-colors">{t('footer.product.links.templates')}</a></li>
                <li><a href="/dashboard/billing" className="hover:text-cyan-400 transition-colors">{t('footer.product.links.pricing')}</a></li>
                <li><a href="/docs/api" className="hover:text-cyan-400 transition-colors">{t('footer.product.links.api')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">{t('footer.company.title')}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/docs" className="hover:text-cyan-400 transition-colors">{t('footer.company.links.about')}</a></li>
                <li><a href="/docs" className="hover:text-cyan-400 transition-colors">{t('footer.company.links.blog')}</a></li>
                <li><a href="/docs" className="hover:text-cyan-400 transition-colors">{t('footer.company.links.careers')}</a></li>
                <li><a href="/help" className="hover:text-cyan-400 transition-colors">{t('footer.company.links.contact')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">{t('footer.legal.title')}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/help" className="hover:text-cyan-400 transition-colors">{t('footer.legal.links.help')}</a></li>
                <li><a href="/docs" className="hover:text-cyan-400 transition-colors">{t('footer.legal.links.community')}</a></li>
                <li><a href="/privacy" className="hover:text-cyan-400 transition-colors">{t('footer.legal.links.privacy')}</a></li>
                <li><a href="/terms" className="hover:text-cyan-400 transition-colors">{t('footer.legal.links.terms')}</a></li>
                <li><button 
                  onClick={() => {
                    localStorage.removeItem('forgevid_cookie_consent_v1');
                    window.location.reload();
                  }}
                  className="hover:text-cyan-400 transition-colors text-left"
                >
                  Manage Cookies
                </button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-sm text-gray-400">
            <p>{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
