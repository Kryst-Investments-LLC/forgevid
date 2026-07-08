"use client";

export default function RootPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Tech Grid Background */}
      <div className="absolute inset-0 tech-grid opacity-30"></div>
      
      {/* Gradient Orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/20 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Hero Section */}
        <div className="text-center max-w-5xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full glass-card border border-cyan-500/30 mb-8 hover-lift">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-sm text-cyan-300 font-medium">AI-Powered Platform • Live Now</span>
          </div>
          
          {/* Main Heading */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
            <span className="gradient-text">ForgeVid</span>
            <br />
            <span className="text-white">Video Creation</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
              Reimagined
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Transform ideas into stunning videos with cutting-edge AI technology.
            <br />
            <span className="text-cyan-400">Create. Edit. Publish.</span> All in one powerful platform.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <a 
              href="/en" 
              className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold text-lg hover-lift glow-cyan transition-all duration-300 shadow-xl hover:shadow-cyan-500/50"
            >
              <span className="relative z-10">Enter Platform</span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-sm"></div>
            </a>
            
            <a 
              href="/dashboard" 
              className="group px-8 py-4 glass-card text-white rounded-xl font-semibold text-lg hover-lift border border-purple-500/30 hover:border-purple-400/60 transition-all duration-300"
            >
              <span className="flex items-center gap-2">
                <span>Dashboard</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </a>
          </div>
          
          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="glass-card p-6 rounded-2xl hover-lift group">
              <div className="text-cyan-400 text-3xl mb-3">⚡</div>
              <h3 className="text-lg font-semibold mb-2 text-white">Lightning Fast</h3>
              <p className="text-sm text-gray-400">Sub-second load times with 100/100 performance scores</p>
            </div>
            
            <div className="glass-card p-6 rounded-2xl hover-lift group">
              <div className="text-purple-400 text-3xl mb-3">🤖</div>
              <h3 className="text-lg font-semibold mb-2 text-white">AI-Powered</h3>
              <p className="text-sm text-gray-400">Advanced AI for editing, generation, and automation</p>
            </div>
            
            <div className="glass-card p-6 rounded-2xl hover-lift group">
              <div className="text-pink-400 text-3xl mb-3">🎨</div>
              <h3 className="text-lg font-semibold mb-2 text-white">Professional Grade</h3>
              <p className="text-sm text-gray-400">Enterprise-ready tools for content creators</p>
            </div>
          </div>

          {/* Trusted By */}
          <div className="mt-16">
            <p className="text-center text-sm text-gray-400 mb-4">Trusted by creators and teams</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 opacity-80">
              <div className="glass-card rounded-xl p-4 text-center">TechCorp</div>
              <div className="glass-card rounded-xl p-4 text-center">StartupXYZ</div>
              <div className="glass-card rounded-xl p-4 text-center">MediaCo</div>
              <div className="glass-card rounded-xl p-4 text-center">CreativeInc</div>
            </div>
          </div>

          {/* Examples Gallery */}
          <div className="mt-16 max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">Examples</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="glass-card rounded-xl overflow-hidden hover-lift">
                  <div className="aspect-video bg-gradient-to-br from-purple-500/30 to-pink-500/30"></div>
                  <div className="p-4 text-sm text-gray-300">Sample Project #{i}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Status Indicator */}
          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Server Online</span>
            </div>
            <span className="mx-2">•</span>
            <span>All Systems Operational</span>
            <span className="mx-2">•</span>
            <button onClick={(e)=>{e.preventDefault(); const btn=document.querySelector('[data-cookie-preferences-trigger]') as HTMLButtonElement|null; btn?.click();}} className="underline text-cyan-400 hover:text-cyan-300" data-testid="manage-cookies-link">Manage Cookies</button>
          </div>
        </div>
      </div>
    </div>
  )
}
