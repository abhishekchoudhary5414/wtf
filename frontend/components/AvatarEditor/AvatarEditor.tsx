'use client';

import React, { useState } from 'react';
import AvatarViewer from '../AvatarViewer/AvatarViewer';
import { avatarCategories, AvatarConfigType, AvatarGender, defaultMaleConfig, defaultFemaleConfig } from './avatarConfig';
import './AvatarEditor.css';

interface AvatarEditorProps {
  initialConfig: AvatarConfigType;
  onSave: (config: AvatarConfigType) => void;
  saving?: boolean;
}

export default function AvatarEditor({ initialConfig, onSave, saving = false }: AvatarEditorProps) {
  // Ensure config has a gender, default to male if migrating from old format
  const startingConfig = initialConfig.gender ? initialConfig : { ...defaultMaleConfig, ...initialConfig, gender: 'male' as AvatarGender };
  const [config, setConfig] = useState<AvatarConfigType>(startingConfig);
  const [activeCategory, setActiveCategory] = useState<string>(avatarCategories[0].id);

  const handleSelectOption = (categoryId: string, optionFile: string) => {
    setConfig(prev => ({
      ...prev,
      [categoryId]: optionFile
    }));
  };

  const handleGenderChange = (newGender: AvatarGender) => {
    if (config.gender === newGender) return;
    const newConfig = newGender === 'female' ? defaultFemaleConfig : defaultMaleConfig;
    setConfig(newConfig);
  };

  const activeCategoryData = avatarCategories.find(c => c.id === activeCategory);
  const currentOptions = activeCategoryData ? activeCategoryData.options[config.gender] : [];

  return (
    <div className="avatar-editor-wrapper">
      
      {/* Top section: Preview & Save */}
      <div className="avatar-preview-header">
        <div className="avatar-preview-info">
          <AvatarViewer config={config} size={80} />
          <div>
            <h3>Your Custom Avatar</h3>
            <p>Mix and match to create your look.</p>
          </div>
        </div>
        <button 
          onClick={() => onSave(config)} 
          className="btn-primary" 
          disabled={saving}
          style={{ cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Saving...' : 'Save Avatar'}
        </button>
      </div>

      {/* Editor Section */}
      <div className="avatar-editor-main">
        
        {/* Categories Sidebar */}
        <div className="avatar-sidebar">
          {avatarCategories.map((cat) => {
            // Hide category if it has no options for the selected gender (e.g. mustache for female)
            if (cat.options[config.gender].length === 0) return null;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`avatar-category-btn ${activeCategory === cat.id ? 'active' : ''}`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Options Grid */}
        <div className="avatar-options-grid">
          
          {/* Gender Toggle & Header */}
          <div className="avatar-options-header">
            <h4>Select {activeCategoryData?.name}</h4>
            <div className="gender-toggle">
              <button 
                className={`gender-btn ${config.gender === 'male' ? 'active' : ''}`}
                onClick={() => handleGenderChange('male')}
              >
                Male
              </button>
              <button 
                className={`gender-btn ${config.gender === 'female' ? 'active' : ''}`}
                onClick={() => handleGenderChange('female')}
              >
                Female
              </button>
            </div>
          </div>
          
          {currentOptions.length === 0 && (
            <p style={{ color: '#6b7280' }}>No options available yet for this category.</p>
          )}

          <div className="options-grid-container">
            {currentOptions.map((option) => {
              const isSelected = config[activeCategoryData!.id] === option;
              
              // To preview just this feature, we create a temporary config that shows the default body + this feature
              const previewConfig: AvatarConfigType = { 
                gender: config.gender,
                body: 'body_01.svg', 
                [activeCategoryData!.id]: option 
              };
              if (activeCategoryData!.id !== 'body' && activeCategoryData!.id !== 'face') {
                previewConfig.face = 'face_01.svg'; // Show face context for features
              }

              return (
                <button
                  key={option}
                  onClick={() => handleSelectOption(activeCategoryData!.id, option)}
                  className={`avatar-option-btn ${isSelected ? 'selected' : ''}`}
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
