"use client";
import React, { useEffect, useRef, useState } from 'react';

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
  const wheelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const animationRef = useRef<number>();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const radius = 200;
  const numNodes = wheelNodes.length;
  const angleStep = (2 * Math.PI) / numNodes;

  useEffect(() => {
    const wheel = wheelRef.current;
    if (!wheel) return;

    let rotation = 0;
    const rotationSpeed = 0.5; // degrees per frame

    const animate = () => {
      if (!isPaused && !isDragging) {
        rotation += rotationSpeed;
        wheel.style.transform = `rotate(${rotation}deg)`;
        
        // Update highlighted node based on rotation
        const normalizedRotation = ((rotation % 360) + 360) % 360;
        const topAngle = 270; // Top position
        let closestNode = '';
        let minDistance = Infinity;

        wheelNodes.forEach((node, i) => {
          const nodeAngle = (i * 360 / numNodes - 90 + rotation) % 360;
          const distance = Math.min(
            Math.abs(nodeAngle - topAngle),
            360 - Math.abs(nodeAngle - topAngle)
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            closestNode = node.id;
          }
        });

        if (minDistance < 20) {
          setHighlightedNode(closestNode);
        } else {
          setHighlightedNode(null);
        }
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, isDragging]);

  const getCurrentRotation = (element: HTMLElement): number => {
    const style = window.getComputedStyle(element);
    const transform = style.transform;
    if (transform === 'none') return 0;
    const values = transform.split('(')[1].split(')')[0].split(',');
    return Math.round(Math.atan2(parseFloat(values[1]), parseFloat(values[0])) * (180 / Math.PI));
  };

  const getAngle = (event: MouseEvent | TouchEvent): number => {
    const container = containerRef.current;
    if (!container) return 0;
    
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX;
    const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY;
    
    return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setIsPaused(true);
    
    const wheel = wheelRef.current;
    if (!wheel) return;
    
    wheel.style.transition = 'none';
    const startAngle = getAngle(e.nativeEvent);
    const startRotation = getCurrentRotation(wheel);
    
    const handleMouseMove = (e: MouseEvent) => {
      const currentAngle = getAngle(e);
      const angleDiff = currentAngle - startAngle;
      wheel.style.transform = `rotate(${startRotation + angleDiff}deg)`;
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsPaused(false);
      wheel.style.transition = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setIsPaused(true);
    
    const wheel = wheelRef.current;
    if (!wheel) return;
    
    wheel.style.transition = 'none';
    const startAngle = getAngle(e.nativeEvent);
    const startRotation = getCurrentRotation(wheel);
    
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const currentAngle = getAngle(e);
      const angleDiff = currentAngle - startAngle;
      wheel.style.transform = `rotate(${startRotation + angleDiff}deg)`;
    };
    
    const handleTouchEnd = () => {
      setIsDragging(false);
      setIsPaused(false);
      wheel.style.transition = '';
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  if (!isMounted) {
    return (
      <div className="min-h-[480px] flex items-center justify-center">
        <div className="relative" style={{ width: radius * 2 + 80, height: radius * 2 + 80 }}>
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-light-blue to-blue-100 rounded-full flex flex-col items-center justify-center z-10 shadow-lg">
            <i className="fa-solid fa-handshake-angle text-navy text-3xl"></i>
            <span className="text-sm font-medium text-navy mt-1">Hiring</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[480px] flex items-center justify-center">
      <div 
        ref={containerRef}
        className="relative"
        style={{ 
          width: radius * 2 + 80, 
          height: radius * 2 + 80 
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => !isDragging && setIsPaused(false)}
      >
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
        
        {/* Wheel */}
        <div 
          ref={wheelRef}
          className="absolute w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {wheelNodes.map((node, i) => {
            const angle = i * angleStep - (Math.PI / 2);
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            const isHighlighted = highlightedNode === node.id;
            
            return (
              <div
                key={node.id}
                className="absolute flex flex-col items-center justify-center text-center transition-transform duration-300"
                style={{ 
                  left: '50%', 
                  top: '50%', 
                  marginLeft: -40, 
                  marginTop: -40,
                  transform: `translate(${x}px, ${y}px)`
                }}
              >
                <div 
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                    isHighlighted 
                      ? 'scale-110 shadow-lg bg-gradient-to-br from-light-blue to-blue-200' 
                      : 'bg-gradient-to-br from-light-blue/50 to-blue-100/50 shadow-md'
                  }`}
                  style={{ 
                    boxShadow: isHighlighted 
                      ? '0 8px 25px rgba(0, 0, 128, 0.2)' 
                      : '0 4px 10px rgba(173, 216, 230, 0.5)' 
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
    </div>
  );
}
