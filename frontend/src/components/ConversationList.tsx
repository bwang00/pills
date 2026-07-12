import { useEffect, useState } from 'react';

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  first_message?: string;
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
  const [selectMode, setSelectMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

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
      // Limit to 20 conversations
      setConversations(data.slice(0, 20));
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
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today: show time only
      return date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
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

  const toggleCheck = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (checkedIds.size === conversations.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(conversations.map(c => c.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (checkedIds.size === 0) return;
    if (!confirm(`确定要删除选中的 ${checkedIds.size} 个对话吗？`)) return;

    try {
      await Promise.all(
        Array.from(checkedIds).map(id =>
          fetch(`/api/conversations/${id}`, { method: 'DELETE' })
        )
      );
      setConversations(conversations.filter(c => !checkedIds.has(c.id)));
      if (selectedConversationId && checkedIds.has(selectedConversationId)) {
        onNewConversation();
      }
      setCheckedIds(new Set());
      setSelectMode(false);
    } catch (error) {
      console.error('Failed to batch delete:', error);
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setCheckedIds(new Set());
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-calm-200">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-calm-200">
        <div className="flex gap-2">
          <button
            onClick={onNewConversation}
            className="flex-1 px-4 py-2 bg-calm-500 text-white rounded-lg hover:bg-calm-600 transition-colors"
          >
            新对话
          </button>
          <button
            onClick={selectMode ? exitSelectMode : () => setSelectMode(true)}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              selectMode
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-calm-100 text-calm-600 hover:bg-calm-200'
            }`}
          >
            {selectMode ? '取消' : '管理'}
          </button>
        </div>
      </div>

      {/* Tags Section */}
      {tags.length > 0 && (
        <div className="flex-shrink-0 flex flex-wrap gap-2 p-3 border-b border-calm-100">
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

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto min-h-0">
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
                onClick={() => selectMode ? toggleCheck(conv.id) : onSelectConversation(conv.id)}
                className={`px-3 py-2.5 cursor-pointer hover:bg-calm-50 transition-colors flex items-center gap-2 ${
                  selectedConversationId === conv.id && !selectMode ? 'bg-calm-100' : ''
                }`}
              >
                {selectMode && (
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    checkedIds.has(conv.id)
                      ? 'bg-calm-500 border-calm-500'
                      : 'border-calm-300'
                  }`}>
                    {checkedIds.has(conv.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-calm-400">
                      {formatDate(conv.updated_at)}
                    </span>
                    {!selectMode && (
                      <button
                        onClick={(e) => handleDelete(e, conv.id)}
                        className="text-calm-300 hover:text-red-400 text-xs ml-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {conv.first_message && (
                    <p className="text-sm text-calm-700 truncate leading-snug">
                      {conv.first_message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batch delete bar */}
      {selectMode && checkedIds.size > 0 && (
        <div className="flex-shrink-0 p-3 border-t border-calm-200 bg-white flex items-center justify-between">
          <button
            onClick={toggleSelectAll}
            className="text-sm text-calm-500 hover:text-calm-700"
          >
            {checkedIds.size === conversations.length ? '取消全选' : '全选'}
          </button>
          <button
            onClick={handleBatchDelete}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
          >
            删除 ({checkedIds.size})
          </button>
        </div>
      )}
    </div>
  );
}
