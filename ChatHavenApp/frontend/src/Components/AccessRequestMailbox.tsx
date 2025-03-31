import React, { useEffect, useState } from 'react';
import { FaCheck, FaTimes, FaEnvelope, FaEnvelopeOpen } from 'react-icons/fa';
import styles from '../Styles/dashboardStyles.ts';
import { useTheme } from '../Context/ThemeContext.tsx';
import { useUser } from '../Context/UserContext.tsx';
import { getChannelAccessRequests, respondToAccessRequest } from '../Services/channelService.ts';
import { getUsersInTeam } from '../Services/dashboardService.ts';

interface AccessRequest {
    requestId: string;
    username: string;
    teamName: string;
    channelName: string;
    requestDate: string;
    status: 'pending' | 'approved' | 'rejected';
}

interface AccessRequestMailboxProps {
    selectedTeam: string | null;
    refreshState: boolean;
    onActionCompleted: () => void;
}

const AccessRequestMailbox: React.FC<AccessRequestMailboxProps> = ({
    selectedTeam,
    refreshState,
    onActionCompleted
}) => {
    const [collapsed, setCollapsed] = useState(true);
    const [requests, setRequests] = useState<AccessRequest[]>([]);
    const [actionInProgress, setActionInProgress] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const { theme } = useTheme();
    const { userData } = useUser();
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch user's role in the current team
    useEffect(() => {
        const fetchUserTeamRole = async () => {
            if (!selectedTeam || !userData?.username) {
                setIsAdmin(false);
                return;
            }

            try {
                const teamMembers = await getUsersInTeam(selectedTeam);
                const currentUser = teamMembers.find((member: { username: string }) =>
                    member.username === userData.username
                );

                if (currentUser) {
                    // Check if user is admin in this team
                    setIsAdmin(currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN');
                } else {
                    setIsAdmin(false);
                }
            } catch (err) {
                console.error('Failed to fetch user team role', err);
                setIsAdmin(false);
            }
        };

        fetchUserTeamRole();
    }, [selectedTeam, userData?.username]);

    // Then, fetch access requests only if user is an admin
    useEffect(() => {
        const fetchRequests = async () => {
            if (!selectedTeam || !isAdmin) {
                setRequests([]);
                setUnreadCount(0);
                return;
            }

            try {
                const requestsList = await getChannelAccessRequests(selectedTeam);
                setRequests(requestsList);

                // Count pending (unread) requests
                const pendingCount = requestsList.filter(req => req.status === 'pending').length;
                setUnreadCount(pendingCount);
            } catch (err) {
                console.error('Failed to fetch access requests', err);
            }
        };

        fetchRequests();
    }, [selectedTeam, refreshState, isAdmin]);

    const handleApprove = async (requestId: string) => {
        if (!selectedTeam) return;

        setActionInProgress(requestId);

        try {
            console.log('Approving request:', requestId);
            await respondToAccessRequest(selectedTeam, requestId, 'approved');

            // Update local state
            setRequests(prevRequests =>
                prevRequests.map(req =>
                    req.requestId === requestId
                        ? { ...req, status: 'approved' }
                        : req
                )
            );

            // Notify parent component to refresh channel list
            onActionCompleted();

            // Update unread count
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to approve request', err);
        } finally {
            setActionInProgress(null);
        }
    };

    const handleReject = async (requestId: string) => {
        if (!selectedTeam) return;

        setActionInProgress(requestId);

        try {
            await respondToAccessRequest(selectedTeam, requestId, 'rejected');

            // Update local state
            setRequests(prevRequests =>
                prevRequests.map(req =>
                    req.requestId === requestId
                        ? { ...req, status: 'rejected' }
                        : req
                )
            );

            // Update unread count
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to reject request', err);
        } finally {
            setActionInProgress(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    // Don't render if user is not admin in this team or no team is selected
    if (!selectedTeam || !isAdmin) {
        return null;
    }

    return (
        <div
            style={{
                ...styles.mailboxContainer,
                ...(theme === 'dark' && styles.mailboxContainer['&.dark-mode']),
                marginTop: '15px'
            }}
        >
            <h3
                onClick={() => setCollapsed(!collapsed)}
                style={{
                    ...styles.listHeader,
                    ...(theme === 'dark' && styles.listHeader['&.dark-mode']),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {collapsed ? <FaEnvelope /> : <FaEnvelopeOpen />}
                    <span>Channel Access Requests</span>
                </div>
                {unreadCount > 0 && (
                    <span style={{
                        background: '#e74c3c',
                        color: 'white',
                        borderRadius: '50%',
                        padding: '2px 6px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                    }}>
                        {unreadCount}
                    </span>
                )}
                <span>{collapsed ? '▼' : '▲'}</span>
            </h3>
            {!collapsed && (
                <div
                    style={{
                        ...styles.requestsContainer,
                        ...(theme === 'dark' && styles.requestsContainer['&.dark-mode']),
                        maxHeight: '300px',
                        overflowY: 'auto',
                        padding: '10px'
                    }}
                >
                    {requests.length === 0 ? (
                        <div style={{ padding: '10px', textAlign: 'center', color: theme === 'dark' ? '#aaa' : '#666' }}>
                            No pending access requests
                        </div>
                    ) : (
                        requests.map(request => (
                            <div
                                key={request.requestId}
                                style={{
                                    ...styles.requestItem,
                                    ...(theme === 'dark' && styles.requestItem['&.dark-mode']),
                                    padding: '10px',
                                    marginBottom: '8px',
                                    borderRadius: '4px',
                                    borderLeft: request.status === 'pending'
                                        ? '3px solid #3498db'
                                        : request.status === 'approved'
                                            ? '3px solid #2ecc71'
                                            : '3px solid #e74c3c',
                                    background: theme === 'dark' ? '#2c3e50' : '#f5f5f5',
                                    opacity: request.status === 'pending' ? 1 : 0.7
                                }}
                            >
                                <div style={{ marginBottom: '5px' }}>
                                    <strong>{request.username}</strong> requested access to <strong>{request.channelName}</strong>
                                </div>
                                <div style={{ fontSize: '12px', color: theme === 'dark' ? '#bbb' : '#666', marginBottom: '10px' }}>
                                    {formatDate(request.requestDate)}
                                </div>

                                {request.status === 'pending' ? (
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                        <button
                                            disabled={!!actionInProgress}
                                            style={{
                                                ...styles.actionButton,
                                                ...(theme === 'dark' && styles.actionButton['&.dark-mode']),
                                                background: '#2ecc71',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                opacity: actionInProgress ? 0.7 : 1
                                            }}
                                            onClick={() => handleApprove(request.requestId)}
                                        >
                                            <FaCheck /> Approve
                                        </button>
                                        <button
                                            disabled={!!actionInProgress}
                                            style={{
                                                ...styles.actionButton,
                                                ...(theme === 'dark' && styles.actionButton['&.dark-mode']),
                                                background: '#e74c3c',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                opacity: actionInProgress ? 0.7 : 1
                                            }}
                                            onClick={() => handleReject(request.requestId)}
                                        >
                                            <FaTimes /> Reject
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{
                                        textAlign: 'right',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        color: request.status === 'approved' ? '#2ecc71' : '#e74c3c'
                                    }}>
                                        {request.status.toUpperCase()}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default AccessRequestMailbox;