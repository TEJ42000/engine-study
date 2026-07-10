// Auth-gated layout for all app screens.
// Middleware already blocked unauthenticated requests; this is a belt-and-
// suspenders server-side check that also provides the session to Nav.
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Nav } from "@/components/nav";
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
      <div className="min-h-screen flex flex-col">
        <Nav session={session} />
        <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">
          {children}
        </main>
      </div>
    </StoreProvider>
  );
}
