import { FileText } from "lucide-react";
import { Link } from "react-router-dom";
import HowItWorks from "./HowItWorks";
import dummy from "../../assets/dummy.png";
import github from "../../assets/github.png";

const Hero = () => {
  return (
    <>
    {/* Hero Section */}
    <section className="bg-black text-white py-10 md:py-24 flex min-h-screen">
      <div className="container relative mx-auto px-6 flex flex-col items-center text-center mt-8">
      <div className="absolute md:inline -top-16 md:-top-36 opacity-10">
      <img src={github} alt="" className="w-5/6 h-5/6 md:w-full md:h-full" />
      </div>
        {/* Text Content */}
        <h1 className="text-4xl md:text-6xl font-bold bg-transparent leading-tight text-shadow">
  Generate Stunning <span className="text-gray-400">README</span> Files
</h1>
        <p className="text-md md:text-xl mt-4 text-gray-300 max-w-2xl drop-shadow-md">
          MarkForge makes it easy to create professional, well-structured README files for your projects with just a few clicks.
        </p>

        {/* Call-to-Action Button */}
        <Link to="/generate">
        <button className="mt-6 relative text-md md:text-lg bg-white text-black border-2 px-8 py-3 rounded-3xl shadow-md hover:shadow-md hover:shadow-white hover:bg-black hover:text-white duration-300 transition font-semibold">
          Generate Now
        </button>
        </Link>

        {/* Image Preview with Gradient, Blur, and Shadows */}
        <div className="mt-10 relative w-full max-w-5xl">
          {/* Div with Gradient, Blur, and Shadows */}
          <div className=" rounded-lg overflow-hidden shadow-2xl">
            <img
              src={dummy}
              alt="README Preview"
              className="w-full object-cover"
            />
            {/* Gradient Overlay */}
            <div className=" inset-0 "></div>
            {/* Blur and Glassmorphism Effect */}
            <div className=" inset-0 bg-black "></div>
          </div>

          {/* Floating Lucide Icon */}
          <div className="absolute -top-6 right-8 bg-white bg-opacity-10 p-4 rounded-full shadow-lg backdrop-blur-lg">
            <FileText className="w-8 h-8 md:w-12 md:h-12 text-gray-400" />
          </div>
        </div>
      </div>
    </section>
    
    {/* How It Works Section */} 
    <HowItWorks />
    </>
  );
};

export default Hero;
