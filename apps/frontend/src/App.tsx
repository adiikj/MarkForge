import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Hero from "./components/landingPage/Hero";
import Header from "./components/landingPage/Header";
import Main from "./components/readmegen/Main";
import Footer from "./components/landingPage/Footer";

function App() {
  return (
    <Router>
      <div className="font-sans">
        <Header />
        <Routes>
          {/* Landing Page Route */}
          <Route path="/" element={<Hero />} />
          {/* README Generator Main Page */}
          <Route path="/generate" element={<Main />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
