// Components/UI/FileAttachment/useFileContent.ts
import { useState, useCallback, useRef } from 'react';
import { getAuthenticatedUrl } from './utils.ts';

interface UseFileContentOptions {
    fileName: string;
    fileUrl: string;
    fileVersion: number;
}

interface UseFileContentResult {
    textContent: string | null;
    loading: boolean;
    error: string | null;
    fetchContent: () => Promise<string | undefined>;
    clearContent: () => void;
}

export const useFileContent = ({ fileName, fileUrl, fileVersion }: UseFileContentOptions): UseFileContentResult => {
    const [textContent, setTextContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const clearContent = useCallback(() => {
        setTextContent(null);
    }, []);

    const fetchContent = useCallback(async (): Promise<string | undefined> => {
        if (!fileUrl) {
            setError('No file URL provided');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();

            const authUrl = getAuthenticatedUrl(fileUrl, fileVersion, true);
            console.log('Fetching text file from:', authUrl);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await fetch(authUrl, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'text/plain,text/*;q=0.9,*/*;q=0.8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                },
                credentials: 'include',
                signal: abortControllerRef.current.signal
            });

            if (response.status === 429) {
                throw new Error('Too many requests - rate limit exceeded. Please try again later.');
            }

            if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.statusText} (${response.status})`);
            }

            const content = await response.text();

            if (content.trim().toLowerCase().startsWith('<!doctype html>')) {
                throw new Error('Received HTML content instead of text file. Authentication may have failed.');
            }

            console.log('Received file content:', content.substring(0, 100) + '...');
            setTextContent(content);
            return content;
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                console.log('Text fetch aborted');
                return;
            }

            console.error('Error fetching file:', error);
            setError((error instanceof Error) ? error.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [fileUrl, fileVersion]);

    return {
        textContent,
        loading,
        error,
        fetchContent,
        clearContent
    };
};

export default useFileContent;