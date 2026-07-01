import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import ProblemSection from '@/components/ProblemSection';
import HowItWorks from '@/components/HowItWorks';
import ScannerGrid from '@/components/ScannerGrid';
import ReportPreview from '@/components/ReportPreview';
import AgentLoopSection from '@/components/AgentLoopSection';
import CISection from '@/components/CISection';
import ComparisonTable from '@/components/ComparisonTable';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <ScannerGrid />
        <ReportPreview />
        <AgentLoopSection />
        <CISection />
        <ComparisonTable />
      </main>
      <Footer />
    </>
  );
}
