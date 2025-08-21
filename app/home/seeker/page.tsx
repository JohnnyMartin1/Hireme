import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function SeekerHomePage() {
  const session = await auth();
  if (!session?.user) return <p>Not authorized</p>;
  const userId = (session.user as any).id as string;

  // Get latest messages, one per thread
  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { sender: true, receiver: true },
  });

  const byThread = new Map<string, typeof messages[number]>();
  for (const m of messages) if (!byThread.has(m.threadId)) byThread.set(m.threadId, m);
  const threads = Array.from(byThread.values());

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold mb-6">Home</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Account Settings */}
        <aside className="md:col-span-1 bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-3">Account Settings</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link className="text-blue-600 hover:underline" href="/account/profile">
                Edit profile
              </Link>
            </li>
            <li>
              <Link className="text-blue-600 hover:underline" href="/account/uploads">
                Resume &amp; video
              </Link>
            </li>
            <li>
              <Link className="text-blue-600 hover:underline" href="/account/security">
                Security
              </Link>
            </li>
          </ul>

          {/* Quick Actions (simplified) */}
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Quick Actions</h3>
            <div className="space-y-2 text-sm">
              <Link className="text-blue-600 hover:underline" href="/account/profile">
                Edit profile
              </Link>
              <br />
              <Link className="text-blue-600 hover:underline" href="/messages">
                Open inbox
              </Link>
            </div>
          </div>
        </aside>

        {/* Right: Inbox */}
        <section className="md:col-span-2 bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-3">Inbox</h2>
          {threads.length === 0 ? (
            <p className="text-sm text-gray-600">No messages yet.</p>
          ) : (
            <ul className="divide-y">
              {threads.map((m) => {
                const counterpart = m.senderId === userId ? m.receiver : m.sender;
                return (
                  <li key={m.id} className="py-3">
                    <Link href={`/messages/${m.threadId}`} className="block hover:bg-gray-50 rounded p-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{counterpart?.email ?? "User"}</div>
                          <div className="text-sm text-gray-600 truncate">{m.body}</div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {m.createdAt.toLocaleString()}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
