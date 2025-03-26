import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback
} from 'react';
import { Selection } from '../types/shared';
import { getChannels } from '../Services/dashboardService';

interface ChatSelectionContextType {
  selection: Selection | null;
  setSelection: (selection: Selection | null) => void;
  isValidSelection: (selection: Selection) => Promise<boolean>;
  checkAndUpdateSelection: () => Promise<void>;
  validateTeam: (teamName: string) => Promise<boolean>;
  validateChannel: (teamName: string, channelName: string) => Promise<boolean>;
}

const ChatSelectionContext = createContext<ChatSelectionContextType | undefined>(undefined);

export const useChatSelection = () => {
  const context = useContext(ChatSelectionContext);
  if (!context) {
    throw new Error('useChatSelection must be used within a ChatSelectionProvider');
  }
  return context;
};

interface ChatSelectionProviderProps {
  children: ReactNode;
}

export const ChatSelectionProvider: React.FC<ChatSelectionProviderProps> = ({ children }) => {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [validTeams, setValidTeams] = useState<Set<string>>(new Set());
  const [validChannels, setValidChannels] = useState<Map<string, Set<string>>>(new Map());

  // Validate if a team exists
  const validateTeam = useCallback(
    async (teamName: string): Promise<boolean> => {
      // If we already validated this team, use cached result
      if (validTeams.has(teamName)) {
        return true;
      }

      try {
        setValidTeams(prev => new Set([...Array.from(prev), teamName]));
        return true;
      } catch (error) {
        console.error(`Failed to validate team ${teamName}:`, error);
        return false;
      }
    },
    [validTeams]
  );

  // Validate if a channel exists in a team
  const validateChannel = useCallback(
    async (teamName: string, channelName: string): Promise<boolean> => {
      // Check if team is valid first
      if (!(await validateTeam(teamName))) {
        return false;
      }

      // Check if we have already validated this channel
      const teamChannels = validChannels.get(teamName);
      if (teamChannels && teamChannels.has(channelName)) {
        return true;
      }

      try {
        // Fetch channels for the team
        const channels = await getChannels(teamName);

        // Store all channels for this team
        const channelSet: Set<string> = new Set(channels.map((c: { name: string }) => c.name));
        setValidChannels(prev => {
          const newMap = new Map(prev);
          newMap.set(teamName, channelSet);
          return newMap;
        });

        return channelSet.has(channelName);
      } catch (error) {
        console.error(`Failed to validate channel ${channelName} in team ${teamName}:`, error);
        return false;
      }
    },
    [validChannels, validateTeam]
  );

  // Check if a selection is valid
  const isValidSelection = useCallback(
    async (sel: Selection): Promise<boolean> => {
      if (!sel) return true; // null selection is always valid

      if (sel.type === 'channel') {
        return validateChannel(sel.teamName, sel.channelName!);
      } else if (sel.type === 'directMessage') {
        return validateTeam(sel.teamName);
      }

      return false;
    },
    [validateChannel, validateTeam]
  );

  // Check and update current selection
  const checkAndUpdateSelection = async (): Promise<void> => {
    if (!selection) return;

    const valid = await isValidSelection(selection);
    if (!valid) {
      console.log('Current selection is no longer valid, resetting');
      setSelection(null);
    }
  };

  // Check selection validity whenever it changes
  useEffect(() => {
    const validate = async () => {
      if (selection) {
        const valid = await isValidSelection(selection);
        if (!valid) {
          console.log('Invalid selection detected, resetting');
          setSelection(null);
        }
      }
    };

    validate();
  }, [selection, isValidSelection]);

  const value = {
    selection,
    setSelection,
    isValidSelection,
    checkAndUpdateSelection,
    validateTeam,
    validateChannel
  };

  return <ChatSelectionContext.Provider value={value}>{children}</ChatSelectionContext.Provider>;
};

export default ChatSelectionContext;
