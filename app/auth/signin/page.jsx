export default function SignInPage() {
    return (<div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">🎬 ForgeVid</h1>
          <p className="text-gray-400">Sign in to your account</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input type="email" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:border-blue-500 focus:outline-none" placeholder="Enter your email"/>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input type="password" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:border-blue-500 focus:outline-none" placeholder="Enter your password"/>
            </div>
            
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded transition-colors">
              Sign In
            </button>
          </form>
          
          <div className="text-center mt-4">
            <a href="/auth/signup" className="text-blue-400 hover:text-blue-300 text-sm">
              Don't have an account? Sign up
            </a>
          </div>
          
          <div className="text-center mt-6">
            <a href="/en" className="text-gray-400 hover:text-gray-300 text-sm">
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>);
}
