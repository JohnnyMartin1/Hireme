/**
 * CheckList Component
 * Checkmark list items matching the landing page feature lists.
 */
import { ReactNode } from 'react';

interface CheckListProps {
  items: (string | ReactNode)[];
  className?: string;
  iconColor?: 'navy' | 'sky' | 'green';
}

export default function CheckList({ 
  items, 
  className = '',
  iconColor = 'navy'
}: CheckListProps) {
  const iconColorClasses = {
    navy: 'text-navy-600',
    sky: 'text-sky-600',
    green: 'text-green-600',
  };
  
  return (
    <ul className={`space-y-2 ${className}`}>
      {items.map((item, index) => (
        <li key={index} className="flex items-center text-sm text-slate-700">
          <i className={`fa-solid fa-check ${iconColorClasses[iconColor]} mr-2 flex-shrink-0`}></i>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
