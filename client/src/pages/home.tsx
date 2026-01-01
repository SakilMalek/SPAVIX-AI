import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-linear-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-3xl">S</span>
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900">SPAVIX</h1>
          <p className="text-xl text-gray-600">
            Transform Your Space with AI-Powered Interior Design
          </p>
          <p className="text-gray-500 max-w-lg mx-auto">
            Upload a photo of your room and let our AI reimagine it with different styles, colors, and materials. Get instant design inspiration and shopping recommendations.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🎨</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI Design</h3>
            <p className="text-sm text-gray-600">
              Transform your room with AI-powered design suggestions
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🛍️</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Shopping</h3>
            <p className="text-sm text-gray-600">
              Find and buy products that match your design
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">💾</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Save & Share</h3>
            <p className="text-sm text-gray-600">
              Keep your designs and share them with others
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => setLocation("/login")}
            className="px-8 py-3 bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg"
          >
            Sign In
          </Button>
          <Button
            onClick={() => setLocation("/signup")}
            className="px-8 py-3 bg-white text-purple-600 font-semibold rounded-lg border-2 border-purple-600 hover:bg-purple-50"
          >
            Create Account
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-8 border-t border-gray-200">
          <p>© 2025 SPAVIX. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
