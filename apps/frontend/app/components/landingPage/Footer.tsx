import { Github, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-black text-white py-6 text-center">
      <div className="container mx-auto">
        <p className="text-gray-400">&copy; {new Date().getFullYear()} MarkForge. All rights reserved.</p>
        <div className="mt-4 flex justify-center space-x-4">
          <a href="#" className="hover:text-gray-400">
            <Github className="w-6 h-6" />
          </a>
          <a href="#" className="hover:text-gray-400">
            <Twitter className="w-6 h-6" />
          </a>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Designed and developed by{' '}
          <a
            href="https://adiikj.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gray-300 hover:text-white transition-colors"
          >
            Aditya
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
