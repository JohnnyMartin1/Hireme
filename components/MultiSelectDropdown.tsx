"use client";
import { useState, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X, Plus } from 'lucide-react';

interface MultiSelectDropdownProps {
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  label: string;
  required?: boolean;
  className?: string;
  allowCustom?: boolean;
  maxSelections?: number;
}

const MultiSelectDropdown = memo(function MultiSelectDropdown({
  options,
  values,
  onChange,
  placeholder,
  label,
  required = false,
  className = "",
  allowCustom = false,
  maxSelections
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options || []);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      updatePosition();
    };

    const handleResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!options) return;
    
    if (searchTerm.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !values.includes(option)
      );
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options, values]);

  const handleSelect = (option: string) => {
    if (maxSelections && values.length >= maxSelections) {
      return;
    }
    if (!values.includes(option)) {
      onChange([...values, option]);
    }
    setSearchTerm('');
  };

  const handleRemove = (optionToRemove: string) => {
    onChange(values.filter(option => option !== optionToRemove));
  };

  const handleCustomInput = () => {
    if (allowCustom && searchTerm.trim() && !values.includes(searchTerm.trim())) {
      if (maxSelections && values.length >= maxSelections) {
        return;
      }
      onChange([...values, searchTerm.trim()]);
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

  const isMaxReached = maxSelections ? values.length >= maxSelections : false;

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {maxSelections && (
          <span className="text-sm text-gray-500 ml-2">
            ({values.length}/{maxSelections})
          </span>
        )}
      </label>
      
      <div className="relative" ref={triggerRef}>
        <div
          className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer bg-white ${
            isMaxReached ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={() => !isMaxReached && setIsOpen(!isOpen)}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-h-6">
              {values.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {values.map((value, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {value}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(value);
                        }}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-gray-500">{placeholder}</span>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {isOpen && !isMaxReached && typeof window !== 'undefined' && createPortal(
          <div 
            ref={dropdownRef}
            className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden"
            style={{ 
              top: `${position.top}px`, 
              left: `${position.left}px`, 
              width: `${position.width}px` 
            }}
          >
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="max-h-48 overflow-y-auto pb-2">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-gray-700 hover:text-blue-900 flex items-center justify-between"
                    onClick={() => handleSelect(option)}
                  >
                    <span>{option}</span>
                    <Plus className="h-4 w-4 text-blue-500" />
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-gray-500 text-center">
                  {allowCustom ? (
                    <div>
                      <p>No matches found</p>
                      {searchTerm.trim() && !values.includes(searchTerm.trim()) && (
                        <button
                          type="button"
                          onClick={handleCustomInput}
                          className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
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
          </div>,
          document.body
        )}
      </div>
    </div>
  );
});

export default MultiSelectDropdown;
