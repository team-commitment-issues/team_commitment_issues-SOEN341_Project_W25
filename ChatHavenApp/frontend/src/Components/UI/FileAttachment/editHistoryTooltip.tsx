// Components/UI/FileAttachment/EditHistoryTooltip.tsx
import React from 'react';
import { useTheme } from '../../../Context/ThemeContext.tsx';
import '../../../Styles/FileAttachment.css';

interface EditHistoryEntry {
    username: string;
    timestamp: Date;
}

interface EditHistoryTooltipProps {
    history: EditHistoryEntry[];
    visible: boolean;
}

const EditHistoryTooltip: React.FC<EditHistoryTooltipProps> = ({ history, visible }) => {
    const { theme } = useTheme();

    if (!visible || !history || history.length === 0) return null;

    // Sort by most recent first
    const sortedHistory = [...history].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return (
        <div className={`standalone-tooltip ${theme}`}>
            <div className="tooltip-arrow"></div>
            <div className="tooltip-header">Edit History</div>
            <div className="tooltip-content">
                {sortedHistory.map((edit, index) => (
                    <div key={index} className="history-item">
                        <div className="history-user">{edit.username}</div>
                        <div className="history-time">
                            {new Date(edit.timestamp).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EditHistoryTooltip;