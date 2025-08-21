import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import MessageComposer from '@/components/MessageComposer';
import BackButton from '@/components/BackButton';

interface Props {
  params: { threadId: string };
}

/**
 * Detailed conversation view. Displays the messages exchanged in a thread
 * between the current user and another user. Marks unread messages as
 * read when the page loads and provides a composer for sending new
 * messages.
 */
export default async function ThreadPage({ params }: Props) {
  const { threadId } = params;
  const session = await auth();
  if (!session || !session.user) {
    return <p>You must be signed in to view messages.</p>;
  }
  const userId = session.user.id;
  // Fetch all messages in this thread
  const messages = await prisma.message.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
  });
  // Mark unread messages as read for the current user
  await prisma.message.updateMany({
    where: {
      threadId,
      receiverId: userId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  // Determine the other participant's id for sending messages
  const otherUserId = messages.length
    ? messages[0].senderId === userId ? messages[0].receiverId : messages[0].senderId
    : threadId.split('-').find((id) => id !== userId);
  return (
    <div className="max-w-2xl mx-auto">
      <BackButton fallback="/messages" />
      <h2 className="text-2xl font-bold my-4">Conversation</h2>
      <div className="space-y-2">
        {messages.map((msg) => (
          <div key={msg.id} className={msg.senderId === userId ? 'text-right' : 'text-left'}>
            <span className="inline-block px-3 py-2 rounded bg-gray-200 max-w-xs">
              {msg.body}
            </span>
          </div>
        ))}
        {messages.length === 0 && <p>No messages yet. Start the conversation!</p>}
      </div>
      {otherUserId && (
        <MessageComposer threadId={threadId} receiverId={otherUserId} />
      )}
    </div>
  );
}