import { HomeWorkspace } from "@/components/HomeWorkspace";
import { SeoGeoSection } from "@/components/SeoGeoSection";

export default function HomePage() {
  return <HomeWorkspace seoSection={<SeoGeoSection />} />;
}
