import React from 'react';
import { avatarCategories, AvatarConfigType } from '../AvatarEditor/avatarConfig';

interface AvatarViewerProps {
  config: AvatarConfigType;
  size?: number;
}

export default function AvatarViewer({ config, size = 150 }: AvatarViewerProps) {
  return (
    <div 
      className="avatar-viewer" 
      style={{ 
        position: 'relative', 
        width: size, 
        height: size,
        background: '#f3f4f6',
        borderRadius: '50%',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {avatarCategories.map((category) => {
        const selectedFile = config[category.id];
        if (!selectedFile) return null;

        const assetPath = `/avatar/${category.folder}/${selectedFile}`;

        return (
          <img
            key={category.id}
            src={assetPath}
            alt={category.name}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              zIndex: category.zIndex,
            }}
          />
        );
      })}
    </div>
  );
}
