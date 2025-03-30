// Components/UI/FileAttachment/FilePreview/ImagePreview.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../../../Context/ThemeContext.tsx';
import { getAuthenticatedUrl } from '../utils.ts';

interface ImagePreviewProps {
    fileName: string;
    fileUrl: string;
    fileVersion: number;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ fileName, fileUrl, fileVersion }) => {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [imageBlob, setImageBlob] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string | null>(null);

    const isFetchingRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const imageBlobRef = useRef<string | null>(null);

    // Track current blob URL in a ref to avoid useEffect dependency issues
    useEffect(() => {
        imageBlobRef.current = imageBlob;
    }, [imageBlob]);

    // Define fetchImage function for manual retries - not used in useEffect
    const fetchImage = useCallback(async () => {
        if (isFetchingRef.current) {
            console.log('Skipping duplicate image fetch request');
            return;
        }

        try {
            setLoading(true);
            setImageError(false);
            setDebugInfo(null);
            isFetchingRef.current = true;

            // Clean up previous abortController if exists
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Create new abortController for this request
            abortControllerRef.current = new AbortController();

            // Get authenticated URL
            const authUrl = getAuthenticatedUrl(fileUrl, fileVersion, true);
            console.log('Manual retry: Fetching image from:', authUrl);

            // Check for auth token
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            // Small delay to ensure UI reflects loading state
            await new Promise(resolve => setTimeout(resolve, 300));

            // Fetch the image
            const response = await fetch(authUrl, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'image/*',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                },
                credentials: 'include',
                signal: abortControllerRef.current.signal
            });

            // Log response information for debugging
            const responseInfo = {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries([...response.headers.entries()]),
                type: response.type,
                url: response.url
            };

            console.log('Image fetch response:', responseInfo);
            setDebugInfo(`Status: ${response.status} ${response.statusText}, Content-Type: ${response.headers.get('content-type')}`);

            // Handle non-200 responses
            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Too many requests - rate limit exceeded. Please try again later.');
                }
                throw new Error(`Failed to fetch image: ${response.statusText} (${response.status})`);
            }

            // Get the blob and create object URL
            const blob = await response.blob();
            console.log('Received image blob:', {
                size: blob.size,
                type: blob.type
            });

            if (blob.size === 0) {
                throw new Error('Received empty image data');
            }

            // Clean up any existing blob URL before creating a new one
            if (imageBlobRef.current) {
                URL.revokeObjectURL(imageBlobRef.current);
            }

            const imageUrl = URL.createObjectURL(blob);
            setImageBlob(imageUrl);
            setImageError(false);
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                console.log('Image fetch aborted');
                return;
            }

            console.error('Error fetching image:', error);
            setImageError(true);
            setDebugInfo((error instanceof Error) ? error.message : 'Unknown error');
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    }, [fileUrl, fileVersion]);

    // Handle retry button click
    const handleRetry = () => {
        setImageError(false);
        setDebugInfo(null);
        fetchImage();
    };

    // Use effect to fetch image only on component mount or when URL/version changes
    useEffect(() => {
        // We need to avoid the infinite loop caused by including fetchImage in dependencies
        // since fetchImage itself depends on imageBlob which changes when fetchImage succeeds

        // Define an inline function that doesn't depend on state values that change during fetch
        const doFetchImage = async () => {
            if (isFetchingRef.current) {
                console.log('Skipping duplicate image fetch request');
                return;
            }

            try {
                setLoading(true);
                setImageError(false);
                setDebugInfo(null);
                isFetchingRef.current = true;

                // Clean up previous abortController if exists
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                }

                // Create new abortController for this request
                abortControllerRef.current = new AbortController();

                // Get authenticated URL
                const authUrl = getAuthenticatedUrl(fileUrl, fileVersion, true);
                console.log('Fetching image from:', authUrl);

                // Check for auth token
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Authentication token not found');
                }

                // Small delay to ensure UI reflects loading state
                await new Promise(resolve => setTimeout(resolve, 300));

                // Fetch the image
                const response = await fetch(authUrl, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Accept': 'image/*',
                        'Cache-Control': 'no-cache, no-store, must-revalidate'
                    },
                    credentials: 'include',
                    signal: abortControllerRef.current.signal
                });

                // Log response information for debugging
                const responseInfo = {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries([...response.headers.entries()]),
                    type: response.type,
                    url: response.url
                };

                console.log('Image fetch response:', responseInfo);
                setDebugInfo(`Status: ${response.status} ${response.statusText}, Content-Type: ${response.headers.get('content-type')}`);

                // Handle non-200 responses
                if (!response.ok) {
                    if (response.status === 429) {
                        throw new Error('Too many requests - rate limit exceeded. Please try again later.');
                    }
                    throw new Error(`Failed to fetch image: ${response.statusText} (${response.status})`);
                }

                // Get the blob and create object URL
                const blob = await response.blob();
                console.log('Received image blob:', {
                    size: blob.size,
                    type: blob.type
                });

                if (blob.size === 0) {
                    throw new Error('Received empty image data');
                }

                // Clean up any existing blob URL before creating a new one
                if (imageBlobRef) {
                    if (imageBlobRef.current) {
                        URL.revokeObjectURL(imageBlobRef.current);
                    }
                }

                const imageUrl = URL.createObjectURL(blob);
                setImageBlob(imageUrl);
                setImageError(false);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    console.log('Image fetch aborted');
                    return;
                }

                console.error('Error fetching image:', error);
                setImageError(true);
                setDebugInfo((error instanceof Error) ? error.message : 'Unknown error');
            } finally {
                setLoading(false);
                isFetchingRef.current = false;
            }
        };

        // Call the inline fetch function
        doFetchImage();

        // Clean up function for component unmount
        return () => {
            // Abort any in-progress fetch
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Clean up blob URL to prevent memory leaks
            if (imageBlobRef.current) {
                URL.revokeObjectURL(imageBlobRef.current);
            }
        };
    }, [fileUrl, fileVersion]); // Only re-run when URL or version changes

    // Render loading state
    if (loading) {
        return (
            <div className={`text-preview ${theme} centered-text`}>
                <div className="loading-spinner"></div>
                <p>Loading image...</p>
            </div>
        );
    }

    // Render error state
    if (imageError || !imageBlob) {
        return (
            <div className={`error-container ${theme}`}>
                <div style={{ marginBottom: '10px' }}>Failed to load image</div>
                <button
                    className={`file-button ${theme}`}
                    onClick={handleRetry}
                    style={{ marginRight: '10px' }}
                >
                    Try Again
                </button>
                <a
                    href={getAuthenticatedUrl(fileUrl, fileVersion)}
                    className={`file-button file-download-link ${theme}`}
                    download={fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Download Instead
                </a>
                {debugInfo && (
                    <div className={`debug-container ${theme}`}>
                        <strong>Debug Info:</strong> {debugInfo}
                    </div>
                )}
            </div>
        );
    }

    // Render successful image
    return (
        <div className="image-preview-container">
            <div className="image-container">
                <img
                    src={imageBlob}
                    alt={fileName}
                    className="preview-image"
                    onError={() => {
                        setImageError(true);
                        setDebugInfo("Image failed to load after successful fetch");
                    }}
                />
            </div>
            {debugInfo && (
                <div className={`debug-container ${theme}`}>
                    <strong>Debug Info:</strong> {debugInfo}
                </div>
            )}
        </div>
    );
};

export default ImagePreview;