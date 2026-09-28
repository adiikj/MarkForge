import Header from "./components/landingPage/Header";
import Hero from "./components/landingPage/Hero";
import Toolkit from "./components/landingPage/Toolkit";
import HealthScore from "./components/landingPage/HealthScore";
import HowItWorks from "./components/landingPage/HowItWorks";
import CTA from "./components/landingPage/CTA";
import Footer from "./components/landingPage/Footer";

export default function Home() {
  return (
    <div className="font-sans">
      <Header />
      <Hero />
      <Toolkit />
      <HealthScore />
      <HowItWorks />
      <CTA />
      <Footer />
    </div>
  );
}
