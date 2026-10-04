import { BrandBar } from "@/components/Brand";
import { SignOutButton } from "@/components/SignOutButton";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BrandBar href="/parent" right={<SignOutButton />} />
      {children}
    </>
  );
}
