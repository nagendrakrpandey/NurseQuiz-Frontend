
import HeroSection from "@/components/homepage/HeroSection";
import AnnouncementBanner from "@/components/homepage/AnnouncementBanner";
import Navbar from "@/components/homepage/Navbar";
import AboutSection from "@/components/homepage/AboutSection";
import TimelineSection from "@/components/homepage/TimelineSection";
import Footer from "@/components/homepage/Footer";

const Index = () => (
  <div className="min-h-screen bg-white">
    <AnnouncementBanner />
    <Navbar />
    <HeroSection />
    <AboutSection />
    <TimelineSection />
    <Footer />
  </div>
);
export default Index;
