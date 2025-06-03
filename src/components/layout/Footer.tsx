import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-500">
            © 2025 MedSecure. All rights reserved. | Tugas Besar Kemjar
          </div>
          <div className="flex items-center space-x-4 mt-2 md:mt-0">
            <span className="text-xs text-gray-400">
              Secure Medical Platform
            </span>
            <div className="flex items-center">
              <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="ml-1 text-xs text-gray-500">Online</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
