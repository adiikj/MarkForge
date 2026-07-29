"use client";

import { FC } from "react";
import Link from "next/link";
import Image from "next/image";
import { FileText } from "lucide-react";
import HowItWorks from "./HowItWorks";
import dummy from "../../../public/dummy.png";
import github from "../../../public/github.png";

const Hero: FC = () => {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-black text-white py-10 md:py-24 flex min-h-screen">
        <div className="container relative mx-auto px-6 flex flex-col items-center text-center mt-8">
          {/* Background Github Image */}
          <div className="absolute md:inline -top-16 md:-top-36 opacity-10">
            <Image
              src={github}
              alt="GitHub Logo"
              className="w-5/6 h-5/6 md:w-full md:h-full"
              width={800}
              height={800}
              priority
            />
          </div>

          {/* Text Content */}
          <h1 className="text-4xl md:text-6xl font-bold bg-transparent leading-tight text-shadow">
            Generate Stunning{" "}
            <span className="text-gray-400">README</span> Files
          </h1>
          <p className="text-md md:text-xl mt-4 text-gray-300 max-w-2xl drop-shadow-md">
            MarkForge makes it easy to create professional, well-structured
            README files for your projects with just a few clicks.
          </p>

          {/* Call-to-Action Button */}
          <Link href="/generate" passHref>
            <button className="mt-6 relative text-md md:text-lg bg-white text-black border-2 px-8 py-3 rounded-3xl shadow-md hover:shadow-md hover:shadow-white hover:bg-black hover:text-white duration-300 transition font-semibold">
              Generate Now
            </button>
          </Link>

          {/* Image Preview with Gradient, Blur, and Shadows */}
          <div className="mt-10 relative w-full max-w-5xl">
            {/* Image Container */}
            <div className="rounded-lg overflow-hidden shadow-2xl relative">
              <Image
                src={dummy}
                alt="README Preview"
                className="w-full object-cover"
                width={1200}
                height={800}
              />
              {/* You can add overlays here if desired */}
            </div>

            {/* Floating Lucide Icon */}
            <div className="absolute -top-6 right-8 bg-white bg-opacity-10 p-4 rounded-full shadow-lg backdrop-blur-lg">
              <FileText className="w-8 h-8 md:w-12 md:h-12 text-gray-400" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;
