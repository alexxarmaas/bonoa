import BusinessSectionNav from "@/components/business/BusinessSectionNav";

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BusinessSectionNav />
      {children}
    </>
  );
}
