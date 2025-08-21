import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import Link from 'next/link';

/**
 * Messages page. Shows a list of conversation threads involving the current
 * user. Each thread links to the detailed conversation view. The list
 * displays the name of the other participant, a snippet of the last
 * message and a badge if there are unread messages.
 */
export default async function MessagesPage() {
  const session = await auth();
  if (!session || !session.user) {
    return <p>You must be signed in to view messages.</p>;
  }
  const userId = session.user.id;
  // Fetch last 50 messages of the user to derive threads
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const threads: Record<string, typeof messages[0]> = {};
  for (const msg of messages) {
    if (!threads[msg.threadId]) {
      threads[msg.threadId] = msg;
    }
  }
  const threadEntries = Object.entries(threads);
  // Prepare data for rendering: get counterpart user and unread count for each thread
  const threadList = await Promise.all(threadEntries.map(async ([threadId, msg]) => {
    const counterpartId = msg.senderId === userId ? msg.receiverId : msg.senderId;
    const counterpart = await prisma.user.findUnique({ where: { id: counterpartId } });
    const unreadCount = await prisma.message.count({
      where: {
        threadId,
        receiverId: userId,
        readAt: null,
      },
    });
    return {
      threadId,
      counterpartName: counterpart?.email || 'Unknown',
      lastMessage: msg.body,
      unreadCount,
    };
  }));
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Messages</h2>
      <ul className="space-y-4">
        {threadList.map((t) => (
          <li key={t.threadId} className="border p-4 rounded bg-white flex justify-between items-center">
            <Link href={`/messages/${t.threadId}`} className="flex-1">
              <div className="font-semibold">{t.counterpartName}</div>
              <div className="text-sm text-gray-600 truncate w-64">{t.lastMessage}</div>
            </Link>
            {t.unreadCount > 0 && (
              <span className="ml-2 inline-block bg-blue-600 text-white text-xs font-medium px-2 py-1 rounded-full">{t.unreadCount}</span>
            )}
          </li>
        ))}
        {threadList.length === 0 && <p>No conversations yet.</p>}
      </ul>
    </div>
  );
}