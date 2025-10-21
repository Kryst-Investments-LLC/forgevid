"use client";
export default function EnglishHomePage() {
    const scrollToSection = (sectionId) => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    };
    return (<div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 tech-grid opacity-20"></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full filter blur-3xl"></div>
      
      {/* Header */}
      <header className="relative z-20 glass-card border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold gradient-text">🎬 ForgeVid</h1>
              <div className="hidden md:flex space-x-6">
                <button onClick={() => scrollToSection('home')} className="hover:text-cyan-400 transition-colors cursor-pointer">
                  Home
                </button>
                <button onClick={() => scrollToSection('explore')} className="hover:text-cyan-400 transition-colors cursor-pointer">
                  Explore
                </button>
                <button onClick={() => scrollToSection('features')} className="hover:text-cyan-400 transition-colors cursor-pointer">
                  Features
                </button>
                <button onClick={() => scrollToSection('templates')} className="hover:text-cyan-400 transition-colors cursor-pointer">
                  Templates
                </button>
              </div>
            </div>
            <div className="flex space-x-4">
              <a href="/auth/signin" className="px-6 py-2.5 rounded-lg border border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all duration-300">
                Sign In
              </a>
              <a href="/dashboard" className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold transition-all duration-300 glow-cyan">
                Get Started
              </a>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-4 py-20">
        <section id="home" className="text-center mb-24">
          <div className="inline-flex items-center px-4 py-2 rounded-full glass-card border border-cyan-500/30 mb-6">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-sm text-cyan-300 font-medium">Powered by Advanced AI</span>
          </div>
          
          <h2 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="gradient-text">Create Amazing Videos</span>
            <br />
            <span className="text-white">with AI Technology</span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto">
            Transform your ideas into professional videos using cutting-edge AI technology. 
            No experience required.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="/dashboard" className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-lg hover-lift glow-cyan transition-all duration-300 shadow-xl hover:shadow-cyan-500/50">
              Start Creating →
            </a>
            <button onClick={() => scrollToSection('features')} className="px-8 py-4 rounded-xl glass-card border border-purple-500/30 hover:border-purple-400/60 font-semibold text-lg transition-all duration-300">
              Explore Features
            </button>
          </div>
        </section>

        {/* Explore Section */}
        <section id="explore" className="mt-32">
          <h3 className="text-4xl font-bold text-center mb-12 gradient-text">Explore ForgeVid</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card p-8 rounded-2xl hover-lift border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300">
              <div className="text-4xl mb-4">🚀</div>
              <h4 className="text-2xl font-bold mb-3 text-cyan-300">Quick Start</h4>
              <p className="text-gray-300 mb-6 leading-relaxed">Jump right in and create your first AI video in minutes. Our intuitive interface makes video creation effortless.</p>
              <a href="/dashboard" className="inline-flex items-center text-cyan-400 hover:text-cyan-300 transition-colors font-medium group">
                Go to Dashboard 
                <svg className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </a>
            </div>
            <div className="glass-card p-8 rounded-2xl hover-lift border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300">
              <div className="text-4xl mb-4">📚</div>
              <h4 className="text-2xl font-bold mb-3 text-purple-300">Templates</h4>
              <p className="text-gray-300 mb-6 leading-relaxed">Browse our collection of professional video templates designed by experts. Customizable and ready to use.</p>
              <a href="/dashboard/templates" className="inline-flex items-center text-purple-400 hover:text-purple-300 transition-colors font-medium group">
                View Templates
                <svg className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </a>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="mt-32">
          <h3 className="text-4xl md:text-5xl font-bold text-center mb-16 gradient-text">Powerful Features</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-card p-8 rounded-2xl hover-lift group border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300 cursor-pointer">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🤖</div>
              <h4 className="text-2xl font-bold mb-3 text-white">AI Video Generation</h4>
              <p className="text-gray-400 mb-6 leading-relaxed">Create videos from text prompts using advanced AI models. State-of-the-art technology at your fingertips.</p>
              <a href="/dashboard/ai" className="inline-flex items-center text-cyan-400 hover:text-cyan-300 transition-colors font-medium group">
                Try AI Tools
                <svg className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </a>
            </div>
            <div className="glass-card p-8 rounded-2xl hover-lift group border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 cursor-pointer">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🎨</div>
              <h4 className="text-2xl font-bold mb-3 text-white">Smart Editing</h4>
              <p className="text-gray-400 mb-6 leading-relaxed">Intelligent editing tools that understand your content. Professional results without the complexity.</p>
              <a href="/dashboard/editor" className="inline-flex items-center text-purple-400 hover:text-purple-300 transition-colors font-medium group">
                Open Editor
                <svg className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </a>
            </div>
            <div className="glass-card p-8 rounded-2xl hover-lift group border border-pink-500/20 hover:border-pink-400/40 transition-all duration-300 cursor-pointer">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🗣️</div>
              <h4 className="text-2xl font-bold mb-3 text-white">Voice to Video</h4>
              <p className="text-gray-400 mb-6 leading-relaxed">Convert speech into engaging video content automatically. Your voice, transformed into visual stories.</p>
              <a href="/dashboard/media" className="inline-flex items-center text-pink-400 hover:text-pink-300 transition-colors font-medium group">
                Try Voice Tools
                <svg className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </a>
            </div>
          </div>
        </section>

        {/* Templates Section */}
        <section id="templates" className="mt-32">
          <h3 className="text-3xl font-bold text-center mb-12">Video Templates</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 h-32 rounded mb-4"></div>
              <h4 className="font-bold mb-2">Business Presentation</h4>
              <p className="text-gray-400 text-sm">Professional templates for business content</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
              <div className="bg-gradient-to-br from-green-500 to-blue-600 h-32 rounded mb-4"></div>
              <h4 className="font-bold mb-2">Social Media</h4>
              <p className="text-gray-400 text-sm">Perfect for Instagram, TikTok, and YouTube</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 h-32 rounded mb-4"></div>
              <h4 className="font-bold mb-2">Marketing Videos</h4>
              <p className="text-gray-400 text-sm">Engaging promotional content templates</p>
            </div>
          </div>
          <div className="text-center mt-8">
            <a href="/dashboard/templates" className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors">
              View All Templates
            </a>
          </div>
        </section>

        {/* Status */}
        <div className="text-center mt-16">
          <div className="bg-green-900/20 border border-green-600 rounded-lg p-4 inline-block">
            <p className="text-green-400">✅ ForgeVid Platform is running successfully!</p>
          </div>
        </div>
      </main>
    </div>);
}
