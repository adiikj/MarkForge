import { Pencil, Settings, Download } from "lucide-react";

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-16 md:py-20 bg-black text-white">
      <div className="container mx-auto text-center px-6">
        <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
        
        {/* Steps Grid */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
          <div className="p-6 bg-white/5 border-2 border-gray-100 rounded-lg shadow-md max-w-md mx-auto">
            <Pencil className="w-8 h-8 md:w-12 md:h-12 text-gray-400 mx-auto" />
            <h3 className="text-xl md:text-2xl font-semibold mt-4">1. Enter Project Details</h3>
            <p className="mt-2 text-md md:text-lg text-gray-400">Provide name, description, and tech stack.</p>
          </div>

          <div className="p-6 bg-white/5 border-2 border-gray-100 rounded-lg shadow-md max-w-md mx-auto">
            <Settings className="w-8 h-8 md:w-12 md:h-12 text-gray-400 mx-auto" />
            <h3 className="text-xl md:text-2xl font-semibold mt-4">2. Customize Your README</h3>
            <p className="mt-2 text-md md:text-lg text-gray-400">Select templates and adjust formatting.</p>
          </div>

          <div className="p-6 bg-white/5 border-2 border-gray-100 rounded-lg shadow-md max-w-md mx-auto">
            <Download className="w-8 h-8 md:w-12 md:h-12 text-gray-400 mx-auto" />
            <h3 className="text-xl md:text-2xl font-semibold mt-4">3. Generate & Download</h3>
            <p className="mt-2 text-md md:text-lg text-gray-400">Preview and download your README file.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
