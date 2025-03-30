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
    loading?: boolean;
}

const EditHistoryTooltip: React.FC<EditHistoryTooltipProps> = ({
    history,
    visible,
    loading = false
}) => {
    const { theme } = useTheme();

    if (!visible) return null;

    // Sort by most recent first (if history exists)
    const sortedHistory = history && history.length > 0
        ? [...history].sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        : [];

    return (
        <div className={`standalone-tooltip ${theme}`}>
            <div className="tooltip-arrow"></div>
            <div className="tooltip-header">Edit History</div>
            <div className="tooltip-content">
                {loading ? (
                    <div className={`loading-indicator ${theme}`}>
                        Loading history...
                    </div>
                ) : sortedHistory.length > 0 ? (
                    sortedHistory.map((edit, index) => (
                        <div key={index} className="history-item">
                            <div className="history-user">{edit.username}</div>
                            <div className="history-time">
                                {new Date(edit.timestamp).toLocaleString()}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className={`empty-history ${theme}`}>
                        No edit history available
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditHistoryTooltip;