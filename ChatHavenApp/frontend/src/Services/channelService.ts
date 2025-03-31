import axios from 'axios';

const API_URL = 'http://localhost:5000/channel';

export const createChannel = async (
  channelName: string,
  teamName: string,
  selectedTeamMembers: string[]
) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/createChannel`,
      { channelName, teamName, selectedTeamMembers },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      (error as any).response?.data?.error || 'Channel creation failed. Please try again.'
    );
  }
};

export const addUserToChannel = async (username: string, teamName: string, channelName: string) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/addUserToChannel`,
      { username, teamName, channelName },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      (error as any).response?.data?.error || 'Failed to add user to channel. Please try again.'
    );
  }
};

export const removeUserFromChannel = async (
  username: string,
  teamName: string,
  channelName: string
) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/removeUserFromChannel`,
      { username, teamName, channelName },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      (error as any).response?.data?.error ||
      'Failed to remove user from channel. Please try again.'
    );
  }
};

export const deleteMessage = async (teamName: string, channelName: string, messageId: string) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/deleteMessage`,
      { teamName, channelName, messageId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      (error as any).response?.data?.error || 'Failed to delete message. Please try again.'
    );
  }
};

export const deleteChannel = async (teamName: string, channelName: string) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/deleteChannel`,
      { teamName, channelName },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      (error as any).response?.data?.error || 'Failed to delete channel. Please try again.'
    );
  }
};

export const getMessages = async (teamName: string, channelName: string) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/getMessages`,
      { teamName, channelName },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      (error as any).response?.data?.error || 'Failed to fetch messages. Please try again.'
    );
  }
};

export const leaveChannel = async (teamName: string, channelName: string) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/leaveChannel`,
      { teamName, channelName },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      (error as any).response?.data?.error || 'Failed to leave channel. Please try again.'
    );
  }
};


/**
 * Get all channels in a team, including those the user doesn't have access to
 * Each channel includes a hasAccess flag
 */
export const getAllChannels = async (teamName: string) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/getAllChannels`,
      { teamName },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      (error as any).response?.data?.error || 'Failed to fetch all channels. Please try again.'
    );
  }
};

/**
 * Request access to a channel
 */
export const requestChannelAccess = async (teamName: string, channelName: string) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/requestAccess`,
      { teamName, channelName },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      (error as any).response?.data?.error || 'Failed to request channel access. Please try again.'
    );
  }
};

/**
 * Get all pending access requests for channels in a team (admin only)
 */
export const getChannelAccessRequests = async (teamName: string) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/getAccessRequests`,
      { teamName },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      (error as any).response?.data?.error || 'Failed to fetch access requests. Please try again.'
    );
  }
};

/**
 * Respond to a channel access request (admin only)
 */
export const respondToAccessRequest = async (teamName: string, requestId: string, decision: 'approved' | 'rejected') => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/respondToAccessRequest`,
      { teamName, requestId, decision },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      (error as any).response?.data?.error || 'Failed to respond to access request. Please try again.'
    );
  }
};