import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Palette, Home, Image, DollarSign } from "lucide-react";

export default function HomePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">SPAVIX</span>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-900 hover:text-gray-600 px-3 py-2 text-sm font-medium">
                Home
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Design
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Gallery
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Pricing
              </a>
            </nav>

            {/* Sign In / Sign Up Buttons */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setLocation("/login")}
                className="text-gray-700 hover:text-gray-900 font-medium"
              >
                Sign In
              </Button>
              <Button
                onClick={() => setLocation("/signup")}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main id="main-content" className="relative">
        <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
            <div className="text-center">
              <h1 className="text-5xl font-bold text-gray-900 sm:text-6xl lg:text-7xl">
                Transform Your
                <br />
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Space
                </span>
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600">
                Use AI to redesign your interior spaces. Get professional design recommendations, 
                virtual staging, and find the perfect products for your home.
              </p>
              <div className="mt-10 flex justify-center space-x-4">
                <Button
                  onClick={() => setLocation("/signup")}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 text-lg"
                >
                  Get Started Free
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 text-lg"
                >
                  View Demo
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* AI-Powered Design Card */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-6">
                <Palette className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AI-Powered Design</h3>
              <p className="text-gray-600 leading-relaxed">
                Our advanced AI analyzes your space and provides personalized design recommendations 
                tailored to your style and preferences.
              </p>
            </div>

            {/* Virtual Staging Card */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-6">
                <Home className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Virtual Staging</h3>
              <p className="text-gray-600 leading-relaxed">
                Transform empty spaces into beautifully furnished rooms. Perfect for real estate 
                listings and home staging.
              </p>
            </div>

            {/* Real Estate Solutions Card */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-6">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Real Estate Solutions</h3>
              <p className="text-gray-600 leading-relaxed">
                Increase property value with professional interior design visualizations. 
                Help buyers envision their future home.
              </p>
            </div>
          </div>
        </div>

        {/* Secondary CTA Section */}
        <div className="bg-gray-50 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Ready to transform your space?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Join thousands of homeowners and designers using SPAVIX
              </p>
              <Button
                onClick={() => setLocation("/signup")}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 text-lg"
              >
                Start Designing Now
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>© 2025 SPAVIX. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
