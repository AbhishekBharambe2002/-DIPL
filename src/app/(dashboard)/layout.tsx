import { Sidebar } from "@/components/layout/sidebar";
import { MainContainer } from "@/components/layout/main-container";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row lg:h-dvh min-h-dvh lg:overflow-hidden">
      <Sidebar />
      <main className="relative flex-1 min-w-0 lg:overflow-y-auto bg-paper-100">
        <MainContainer>{children}</MainContainer>
      </main>
    </div>
  );
}
