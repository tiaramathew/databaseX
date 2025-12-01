import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ErrorBoundary } from "@/components/error-boundary";

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex h-dvh overflow-hidden bg-mesh">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden min-h-0">
                <Header />
                <main className="flex-1 overflow-y-auto p-6">
                    <ErrorBoundary>{children}</ErrorBoundary>
                </main>
            </div>
        </div>
    );
}
