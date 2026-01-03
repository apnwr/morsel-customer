'use client';

import React from 'react';
import Image from 'next/image';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onMenuClick: () => void;
}

export function SearchBar({ searchQuery, onSearchChange, onMenuClick }: SearchBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-[60px] bg-white border-t-[3px] border-[#F1F1F1] rounded-t-[30px] z-20">
      <div className="h-full px-[22px] flex items-center gap-4">
        {/* Search Input */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search"
          className="flex-1 h-full text-[20px] font-normal text-black placeholder:text-black placeholder:opacity-30 focus:outline-none bg-transparent"
          style={{ fontFamily: 'Lato, sans-serif', lineHeight: '1.2em' }}
        />
        
        {/* Menu Button */}
        <button
          onClick={onMenuClick}
          className="flex items-center justify-center gap-[10px] w-[120px] h-[44px] px-[40px] py-[20px] bg-black rounded-[42px] hover:opacity-90 active:scale-95 transition-all shrink-0"
          aria-label="Open menu navigation"
        >
          <Image
            src="/icons/Hamburger_menu.png"
            alt="Menu"
            width={18}
            height={18}
            className="shrink-0"
          />
          <span 
            className="text-[18px] font-bold text-white whitespace-nowrap"
            style={{ fontFamily: 'Lato, sans-serif', lineHeight: '1.2em' }}
          >
            Menu
          </span>
        </button>
      </div>
    </div>
  );
}

