import { useEffect, useState } from 'react';

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface Tag {
  tag: string;
  count: number;
}

interface ConversationListProps {
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  selectedConversationId: string | null;
}

export default function ConversationList({
  onSelectConversation,
  onNewConversation,
  selectedConversationId,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTags();
    fetchConversations();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      setTags(data);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const fetchConversations = async (tag?: string) => {
    try {
      const url = tag ? `/api/conversations?tag=${encodeURIComponent(tag)}` : '/api/conversations';
      const response = await fetch(url);
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null);
      fetchConversations(); // 重新获取所有对话
    } else {
      setSelectedTag(tag);
      fetchConversations(tag); // 按标签筛选
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hours}:${minutes}`;
  };

  const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个对话吗？')) return;

    try {
      await fetch(`/api/conversations/${conversationId}`, { method: 'DELETE' });
      setConversations(conversations.filter(c => c.id !== conversationId));
      if (selectedConversationId === conversationId) {
        onNewConversation();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-calm-200">
      <div className="p-4 border-b border-calm-200">
        <button
          onClick={onNewConversation}
          className="w-full px-4 py-2 bg-calm-500 text-white rounded-lg hover:bg-calm-600 transition-colors"
        >
          新对话
        </button>
      </div>

      {/* Tags Section */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 border-b border-calm-100">
          {tags.map(t => (
            <button
              key={t.tag}
              onClick={() => handleTagClick(t.tag)}
              className={`px-2 py-1 rounded-full text-xs transition-colors ${
                selectedTag === t.tag
                  ? 'bg-calm-500 text-white'
                  : 'bg-calm-100 text-calm-600 hover:bg-calm-200'
              }`}
            >
              {t.tag} ({t.count})
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-calm-400">加载中...</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-calm-400">
            {selectedTag ? `没有包含"${selectedTag}"标签的对话` : '暂无对话记录'}
          </div>
        ) : (
          <div className="divide-y divide-calm-100">
            {conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`p-4 cursor-pointer hover:bg-calm-50 transition-colors ${
                  selectedConversationId === conv.id ? 'bg-calm-100' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm text-calm-600">
                    {formatDate(conv.updated_at)}
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className="text-calm-400 hover:text-red-500 text-sm"
                  >
                    删除
                  </button>
                </div>
                <div className="text-xs text-calm-500">
                  {conv.message_count} 条消息
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
