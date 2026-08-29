'use client';

import React, { useState } from 'react';
import AvatarViewer from '../AvatarViewer/AvatarViewer';
import { avatarCategories, AvatarConfigType } from './avatarConfig';

interface AvatarEditorProps {
  initialConfig: AvatarConfigType;
  onSave: (config: AvatarConfigType) => void;
  saving?: boolean;
}

export default function AvatarEditor({ initialConfig, onSave, saving = false }: AvatarEditorProps) {
  const [config, setConfig] = useState<AvatarConfigType>(initialConfig);
  const [activeCategory, setActiveCategory] = useState<string>(avatarCategories[0].id);

  const handleSelectOption = (categoryId: string, optionFile: string) => {
    setConfig(prev => ({
      ...prev,
      [categoryId]: optionFile
    }));
  };

  const activeCategoryData = avatarCategories.find(c => c.id === activeCategory);

  return (
    <div className="avatar-editor-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      
      {/* Top section: Preview & Save */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <AvatarViewer config={config} size={100} />
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem' }}>Your Custom Avatar</h3>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>Mix and match to create your look.</p>
          </div>
        </div>
        <button 
          onClick={() => onSave(config)} 
          className="btn-primary" 
          disabled={saving}
          style={{ padding: '10px 24px', fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Saving...' : 'Save Avatar'}
        </button>
      </div>

      {/* Editor Section */}
      <div style={{ display: 'flex', gap: '24px', minHeight: '350px' }}>
        
        {/* Categories Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '200px' }}>
          {avatarCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                textAlign: 'left',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeCategory === cat.id ? '#f4e8fb' : 'transparent',
                color: activeCategory === cat.id ? '#77008f' : '#4b5563',
                fontWeight: activeCategory === cat.id ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Options Grid */}
        <div style={{ flex: 1, background: '#f9fafb', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' }}>
          <h4 style={{ margin: '0 0 16px 0' }}>Select {activeCategoryData?.name}</h4>
          
          {activeCategoryData && activeCategoryData.options.length === 0 && (
            <p style={{ color: '#6b7280' }}>No options available yet for this category.</p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '16px' }}>
            {activeCategoryData?.options.map((option) => {
              const isSelected = config[activeCategoryData.id] === option;
              
              // To preview just this feature, we create a temporary config that shows the default body + this feature
              const previewConfig: AvatarConfigType = { body: 'body_01.svg', [activeCategoryData.id]: option };
              if (activeCategoryData.id !== 'body' && activeCategoryData.id !== 'face') {
                previewConfig.face = 'face_01.svg'; // Show face context for features
              }

              return (
                <button
                  key={option}
                  onClick={() => handleSelectOption(activeCategoryData.id, option)}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: `2px solid ${isSelected ? '#77008f' : '#e5e7eb'}`,
                    background: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  {/* Small preview of the individual part */}
                  <div style={{ transform: 'scale(0.8)', transformOrigin: 'center' }}>
                     <AvatarViewer config={previewConfig} size={64} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
