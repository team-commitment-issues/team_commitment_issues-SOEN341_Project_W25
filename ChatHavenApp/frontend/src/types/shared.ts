export interface ChannelSelection {
    type: 'channel';
    teamName: string;
    channelName: string;
}

export interface DirectMessageSelection {
    type: 'directMessage';
    teamName: string;
    username: string;
}

export type Selection = ChannelSelection | DirectMessageSelection | null;

export interface ContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    selected: string;
}

export interface ChatMessage {
    _id: string;
    text: string;
    username: string;
    createdAt: Date;
}