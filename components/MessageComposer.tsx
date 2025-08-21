"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MessageComposerProps {
  threadId: string;
  receiverId: string;
}

/**
 * Message composer component. Allows the user to type a message and send
 * it to the server. After sending, the page is refreshed to show the
 * new message. Uses the messages/send API route.
 */
export default function MessageComposer({ threadId, receiverId }: MessageComposerProps) {
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    const res = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, receiverId, body }),
    });
    setLoading(false);
    if (res.ok) {
      setBody('');
      // refresh to load new messages
      router.refresh();
    } else {
      alert('Failed to send message');
    }
  };
  return (
    <form onSubmit={handleSend} className="mt-4 flex items-center space-x-2">
      <input
        type="text"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="flex-1 px-3 py-2 border rounded"
        placeholder="Type your message..."
      />
      <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
        Send
      </button>
    </form>
  );
}