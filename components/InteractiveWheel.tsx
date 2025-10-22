"use client";
import React from 'react';

interface WheelNode {
  id: string;
  icon: string;
  label: string;
}

const wheelNodes: WheelNode[] = [
  { id: 'interview', icon: 'fa-lightbulb', label: 'Interview' },
  { id: 'create', icon: 'fa-hammer', label: 'Create' },
  { id: 'enhance', icon: 'fa-feather-pointed', label: 'Enhance' },
  { id: 'scout', icon: 'fa-bullseye', label: 'Scout' },
  { id: 'communicate', icon: 'fa-comments', label: 'Communicate' }
];

export default function InteractiveWheel() {

  const radius = 200;
  const angleStep = (2 * Math.PI) / wheelNodes.length;

  return (
    <div className="min-h-[480px] flex items-center justify-center">
      <div className="relative" style={{ width: radius * 2 + 80, height: radius * 2 + 80 }}>
        {/* Guide Circle */}
        <div 
          className="absolute border-2 border-dashed border-light-blue/80 rounded-full"
          style={{ 
            left: 40, 
            top: 40, 
            width: radius * 2, 
            height: radius * 2 
          }}
        />
        
        {/* Center Icon */}
        <div 
          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-light-blue to-blue-100 rounded-full flex flex-col items-center justify-center z-10 shadow-lg"
          style={{ boxShadow: '0 0 20px rgba(0, 0, 128, 0.1)' }}
        >
          <i className="fa-solid fa-handshake-angle text-navy text-3xl"></i>
          <span className="text-sm font-medium text-navy mt-1">Hiring</span>
        </div>
        
        {/* Static Wheel Nodes */}
        {wheelNodes.map((node, i) => {
          const angle = i * angleStep - (Math.PI / 2);
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);
          
          return (
            <div
              key={node.id}
              className="absolute flex flex-col items-center justify-center text-center"
              style={{ 
                left: '50%', 
                top: '50%', 
                marginLeft: -40, 
                marginTop: -40,
                transform: `translate(${x}px, ${y}px)`
              }}
            >
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mb-2 bg-gradient-to-br from-light-blue/50 to-blue-100/50 shadow-md"
                style={{ 
                  boxShadow: '0 4px 10px rgba(173, 216, 230, 0.5)' 
                }}
              >
                <i className={`fa-solid ${node.icon} text-navy text-2xl`}></i>
              </div>
              <span className="text-sm font-medium text-navy">{node.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}