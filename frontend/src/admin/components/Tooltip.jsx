import React from 'react';
import '../AdminPortal.css';

const Tooltip = ({ title, description }) => {
  return (
    <div className="admin-tooltip-wrapper">
      <span className="admin-tooltip-icon">?</span>
      <div className="admin-tooltip-content">
        <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--admin-primary)' }}>
          {title}
        </strong>
        {description}
      </div>
    </div>
  );
};

export default Tooltip;
