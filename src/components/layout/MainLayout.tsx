import React from 'react';
import ResponsiveLayout from './ResponsiveLayout';

interface MainLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  showBackButton?: boolean;
  showSearch?: boolean;
  emergencyMode?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  pageTitle,
  showBackButton = false,
  showSearch = false,
  emergencyMode = false,
}) => {
  return (
    <ResponsiveLayout
      pageTitle={pageTitle}
      showBackButton={showBackButton}
      showSearch={showSearch}
      emergencyMode={emergencyMode}
    >
      {children}
    </ResponsiveLayout>
  );
};

export default MainLayout;
