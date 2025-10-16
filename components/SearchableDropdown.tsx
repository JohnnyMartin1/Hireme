"use client";
import { useState, useRef, useEffect, memo, useMemo } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface SearchableDropdownProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  required?: boolean;
  className?: string;
  allowCustom?: boolean;
}

const SearchableDropdown = memo(function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder,
  label,
  required = false,
  className = "",
  allowCustom = false
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options]);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCustomInput = () => {
    if (allowCustom && searchTerm.trim()) {
      onChange(searchTerm.trim());
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0]);
      } else if (allowCustom) {
        handleCustomInput();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const clearValue = () => {
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <div
          className="w-full px-4 py-3 bg-white border border-light-gray rounded-xl text-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy transition-all duration-200 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center justify-between">
            <span className={value ? 'text-navy' : 'text-gray-400'}>
              {value || placeholder}
            </span>
            <div className="flex items-center space-x-2">
              {value && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearValue();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <i className={`fa-solid fa-chevron-down text-navy transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-light-gray rounded-xl shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-light-gray">
              <div className="relative">
                <i className="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-4 py-2 border border-light-gray rounded-lg focus:ring-2 focus:ring-navy focus:border-navy"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="max-h-48 overflow-y-auto pb-2">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 hover:bg-light-blue hover:bg-opacity-20 cursor-pointer text-navy hover:text-navy"
                    onClick={() => handleSelect(option)}
                  >
                    {option}
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-gray-500 text-center">
                  {allowCustom ? (
                    <div>
                      <p>No matches found</p>
                      {searchTerm.trim() && (
                        <button
                          type="button"
                          onClick={handleCustomInput}
                          className="mt-2 text-navy hover:text-light-blue font-medium"
                        >
                          Add "{searchTerm.trim()}"
                        </button>
                      )}
                    </div>
                  ) : (
                    <p>No matches found</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default SearchableDropdown;
