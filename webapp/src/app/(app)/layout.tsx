// Auth-gated layout for all app screens.
// Middleware already blocked unauthenticated requests; this is a belt-and-
// suspenders server-side check that also provides the session to Nav.
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { StoreProvider } from "@/lib/store";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/");

  return (
    <StoreProvider>
      <div className="min-h-screen flex">
        <Sidebar session={session} />
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="mx-auto w-full max-w-4xl px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </StoreProvider>
  );
}
