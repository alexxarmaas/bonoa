import BusinessOnboarding from "@/components/business/BusinessOnboarding";
import BusinessOnboardingGate from "@/components/business/BusinessOnboardingGate";
import BusinessSectionNav from "@/components/business/BusinessSectionNav";

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <BusinessOnboardingGate>
      <BusinessSectionNav />
      <BusinessOnboarding />
      {children}
    </BusinessOnboardingGate>
  );
}
