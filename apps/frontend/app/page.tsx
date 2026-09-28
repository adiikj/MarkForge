import Header from "./components/landingPage/Header";
import Hero from "./components/landingPage/Hero";
import Toolkit from "./components/landingPage/Toolkit";
import HealthScore from "./components/landingPage/HealthScore";
import HowItWorks from "./components/landingPage/HowItWorks";
import CTA from "./components/landingPage/CTA";
import Footer from "./components/landingPage/Footer";
import Aurora from "./components/landingPage/Aurora";

export default function Home() {
  return (
    <div className="relative font-sans">
      <Aurora />
      {/* Content sits above the fixed gradient layer. */}
      <div className="relative z-10">
        <Header />
        <Hero />
        <Toolkit />
        <HealthScore />
        <HowItWorks />
        <CTA />
        <Footer />
      </div>
    </div>
  );
}
