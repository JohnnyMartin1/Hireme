"use client";
import { useState, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X, Plus } from 'lucide-react';

export interface LanguageSkill {
  language: string;
  listening: number;
  writing: number;
  speaking: number;
  comprehension: number;
}

interface LanguageSelectorProps {
  options: string[];
  values: LanguageSkill[];
  onChange: (values: LanguageSkill[]) => void;
  placeholder: string;
  label: string;
  required?: boolean;
  className?: string;
  allowCustom?: boolean;
  maxSelections?: number;
}

const LanguageSelector = memo(function LanguageSelector({
  options,
  values,
  onChange,
  placeholder,
  label,
  required = false,
  className = "",
  allowCustom = false,
  maxSelections = 10
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options || []);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [customInput, setCustomInput] = useState('');

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
    const filtered = options.filter(option =>
      option.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !values.some(v => v.language === option)
    );
    setFilteredOptions(filtered);
  }, [searchTerm, options, values]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
        setCustomInput('');
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        updatePosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  const handleSelect = (language: string) => {
    if (values.length >= maxSelections) return;
    
    const newLanguage: LanguageSkill = {
      language,
      listening: 1,
      writing: 1,
      speaking: 1,
      comprehension: 1
    };
    
    onChange([...values, newLanguage]);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleRemove = (language: string) => {
    onChange(values.filter(v => v.language !== language));
  };

  const handleSkillChange = (language: string, skill: 'listening' | 'writing' | 'speaking' | 'comprehension', value: number) => {
    onChange(values.map(v => 
      v.language === language ? { ...v, [skill]: value } : v
    ));
  };

  const handleCustomAdd = () => {
    if (customInput.trim() && values.length < maxSelections) {
      handleSelect(customInput.trim());
      setCustomInput('');
    }
  };

  const selectedLanguages = values.map(v => v.language);

  return (
    <div className={`w-full ${className}`}>
      <label className="block text-sm font-semibold text-navy-900 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
        {maxSelections && (
          <span className="text-slate-500 font-normal ml-2">
            ({values.length}/{maxSelections})
          </span>
        )}
      </label>
      
      <div ref={triggerRef} className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg cursor-pointer hover:border-sky-500 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-200 transition-colors flex items-center justify-between"
        >
          <div className="flex flex-wrap gap-2 flex-1 min-h-[24px]">
            {values.length === 0 ? (
              <span className="text-slate-400">{placeholder}</span>
            ) : (
              values.map((langSkill) => (
                <div
                  key={langSkill.language}
                  className="bg-sky-100 text-sky-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"
                >
                  <span>{langSkill.language}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(langSkill.language);
                    }}
                    className="hover:bg-sky-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
          <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {isOpen && createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-50 bg-white border border-slate-300 rounded-lg shadow-xl max-h-96 overflow-hidden"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`
            }}
          >
            <div className="p-2 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search languages..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <div
                    key={option}
                    onClick={() => handleSelect(option)}
                    className="px-4 py-2 hover:bg-sky-50 cursor-pointer transition-colors"
                  >
                    {option}
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-slate-400 text-sm">
                  No languages found
                </div>
              )}
            </div>

            {allowCustom && (
              <div className="p-2 border-t border-slate-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCustomAdd();
                      }
                    }}
                    placeholder="Add custom language..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCustomAdd();
                    }}
                    className="px-3 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors flex items-center gap-1 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
      </div>

      {/* Skill Rating Dropdowns for each selected language */}
      {values.length > 0 && (
        <div className="mt-4 space-y-4">
          {values.map((langSkill) => (
            <div key={langSkill.language} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-navy-900">{langSkill.language}</h4>
                <button
                  onClick={() => handleRemove(langSkill.language)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Listening
                  </label>
                  <select
                    value={langSkill.listening}
                    onChange={(e) => handleSkillChange(langSkill.language, 'listening', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500 bg-white text-sm"
                  >
                    <option value={1}>1. Basic/ Classroom Study</option>
                    <option value={2}>2. Elementary / Limited Working</option>
                    <option value={3}>3. Professional Working</option>
                    <option value={4}>4. Full Professional / Fluent</option>
                    <option value={5}>5. Native / Bilingual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Writing
                  </label>
                  <select
                    value={langSkill.writing}
                    onChange={(e) => handleSkillChange(langSkill.language, 'writing', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500 bg-white text-sm"
                  >
                    <option value={1}>1. Basic/ Classroom Study</option>
                    <option value={2}>2. Elementary / Limited Working</option>
                    <option value={3}>3. Professional Working</option>
                    <option value={4}>4. Full Professional / Fluent</option>
                    <option value={5}>5. Native / Bilingual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Speaking
                  </label>
                  <select
                    value={langSkill.speaking}
                    onChange={(e) => handleSkillChange(langSkill.language, 'speaking', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500 bg-white text-sm"
                  >
                    <option value={1}>1. Basic/ Classroom Study</option>
                    <option value={2}>2. Elementary / Limited Working</option>
                    <option value={3}>3. Professional Working</option>
                    <option value={4}>4. Full Professional / Fluent</option>
                    <option value={5}>5. Native / Bilingual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Comprehension
                  </label>
                  <select
                    value={langSkill.comprehension}
                    onChange={(e) => handleSkillChange(langSkill.language, 'comprehension', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500 bg-white text-sm"
                  >
                    <option value={1}>1. Basic/ Classroom Study</option>
                    <option value={2}>2. Elementary / Limited Working</option>
                    <option value={3}>3. Professional Working</option>
                    <option value={4}>4. Full Professional / Fluent</option>
                    <option value={5}>5. Native / Bilingual</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default LanguageSelector;
