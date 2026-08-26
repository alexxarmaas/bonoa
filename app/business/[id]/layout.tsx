import BusinessOnboarding from "@/components/business/BusinessOnboarding";
import BusinessSectionNav from "@/components/business/BusinessSectionNav";

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BusinessSectionNav />
      <BusinessOnboarding />
      {children}
    </>
  );
}
