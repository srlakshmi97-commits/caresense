import { BrandBar } from "@/components/Brand";
import { ReminderManager } from "@/components/ReminderManager";
import { SignOutButton } from "@/components/SignOutButton";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BrandBar href="/parent" right={<SignOutButton />} />
      <ReminderManager />
      {children}
    </>
  );
}
