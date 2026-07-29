import Header from "./components/landingPage/Header";
import Hero from "./components/landingPage/Hero";
import HowItWorks from "./components/landingPage/HowItWorks";
import Footer from "./components/landingPage/Footer";

export default function Home() {
  return (
    <div className="font-sans">
      <Header />
      <Hero />
      <HowItWorks />
      <Footer />
    </div>
  );
}
