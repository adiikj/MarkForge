import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="w-full py-4 bg-black text-white shadow-md">
      <div className="container mx-auto flex justify-between items-center px-6 md:px-16">
        {/* Logo */}
        <Link to="/">
        <div className="flex flex-row">
          <img src={logo} alt="" className="w-10 h-10 mr-2" />
          <h1 className="hidden md:inline text-2xl md:text-3xl font-bold tracking-wide">MarkForge</h1>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-6 mt-3 border-2 px-10 py-3 rounded-full bg-white/5 shadow-md shadow-gray-200">
          <a href="#features" className="hover:text-gray-400">Features</a>
          <a href="#how-it-works" className="hover:text-gray-400">How It Works</a>
          <a href="#contact" className="hover:text-gray-400">Contact</a>
        </nav>

        {/* Get Started Button (Visible on all screens) */}
        <Link to="/generate">
        <button className="hidden md:block bg-white text-black px-6 border-2 border-white py-2.5 hover:shadow-md hover:shadow-white rounded-3xl hover:bg-black hover:text-white transition-all duration-300">
          Get Started
        </button>
        </Link>

        {/* Mobile Menu Button */}
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden">
          {isOpen ? <X className="text-white w-6 h-6" /> : <Menu className="text-white w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      <div
        className={`md:hidden flex flex-col items-center space-y-4 bg-black py-6 transition-all duration-300 ${
          isOpen ? "block" : "hidden"
        }`}
      >
        <a href="#features" className="hover:text-gray-400">Features</a>
        <a href="#how-it-works" className="hover:text-gray-400">How It Works</a>
        <a href="#contact" className="hover:text-gray-400">Contact</a>
        <button className="bg-white text-black px-6 border-2 border-white py-2.5 hover:shadow-md hover:shadow-white rounded-3xl hover:bg-black hover:text-white transition-all duration-300">
          Get Started
        </button>
      </div>
    </header>
  );
};

export default Header;
