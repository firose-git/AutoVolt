import React, { useState, useRef, useEffect } from 'react';
import { X, AtSign } from 'lucide-react';
import { Badge } from './badge';
import { Input } from './input';
import { ScrollArea } from './scroll-area';

interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
}

interface MentionInputProps {
  mentionedUsers: User[];
  onMentionedUsersChange: (users: User[]) => void;
  onSearchUsers: (query: string) => Promise<User[]>;
  placeholder?: string;
  label?: string;
  maxMentions?: number;
}

export const MentionInput: React.FC<MentionInputProps> = ({
  mentionedUsers,
  onMentionedUsersChange,
  onSearchUsers,
  placeholder = "Type @ to mention users...",
  label = "Mention Users",
  maxMentions = 10
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Fetch users when @ is typed
  useEffect(() => {
    const fetchUsers = async () => {
      if (inputValue.startsWith('@')) {
        const searchQuery = inputValue.slice(1);
        setIsLoading(true);
        try {
          const users = await onSearchUsers(searchQuery);
          // Filter out already mentioned users
          const filteredUsers = users.filter(
            user => !mentionedUsers.some(m => (m._id || m.id) === (user._id || user.id))
          );
          setSuggestions(filteredUsers);
          setShowSuggestions(filteredUsers.length > 0);
          setSelectedIndex(0);
        } catch (error) {
          console.error('Error fetching users:', error);
          setSuggestions([]);
          setShowSuggestions(false);
        } finally {
          setIsLoading(false);
        }
      } else {
        setShowSuggestions(false);
        setSuggestions([]);
      }
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [inputValue, onSearchUsers, mentionedUsers]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionRef.current &&
        !suggestionRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Show suggestions when @ is typed
    if (value === '@' || (value.startsWith('@') && value.length > 1)) {
      setShowSuggestions(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          handleSelectUser(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  const handleSelectUser = (user: User) => {
    if (mentionedUsers.length >= maxMentions) {
      return;
    }

    onMentionedUsersChange([...mentionedUsers, user]);
    setInputValue('');
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleRemoveUser = (userId: string) => {
    onMentionedUsersChange(mentionedUsers.filter(u => (u._id || u.id) !== userId));
  };

  const handleAtClick = () => {
    if (inputValue === '') {
      setInputValue('@');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <AtSign className="h-4 w-4" />
        {label}
        {mentionedUsers.length > 0 && (
          <span className="text-muted-foreground">({mentionedUsers.length}/{maxMentions})</span>
        )}
      </label>

      <div className="relative">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={mentionedUsers.length >= maxMentions}
            className="flex-1"
          />
          <button
            type="button"
            onClick={handleAtClick}
            disabled={mentionedUsers.length >= maxMentions}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <AtSign className="h-4 w-4" />
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && (
          <div
            ref={suggestionRef}
            className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[200px] overflow-hidden"
          >
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading users...
              </div>
            ) : suggestions.length > 0 ? (
              <ScrollArea className="h-full max-h-[200px]">
                {suggestions.map((user, index) => (
                  <button
                    key={user._id || user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className={`w-full px-4 py-2 text-left hover:bg-accent transition-colors ${
                      index === selectedIndex ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                      {user.role && (
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </ScrollArea>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mentioned users badges */}
      {mentionedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {mentionedUsers.map(user => (
            <Badge
              key={user._id || user.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <AtSign className="h-3 w-3" />
              <span>{user.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveUser(user._id || user.id || '')}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Type @ to search and mention users. Mentioned users will be notified when the ticket is created and when status changes.
      </p>
    </div>
  );
};
