// Components/UI/FileAttachment/FilePreview/ImagePreview.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../../Context/ThemeContext.tsx';
import { getAuthenticatedUrl } from '../utils.ts';

interface ImagePreviewProps {
    fileName: string;
    fileUrl: string;
    fileVersion: number;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ fileName, fileUrl, fileVersion }) => {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [imageBlob, setImageBlob] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string | null>(null);

    const isFetchingRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleRetry = () => {
        setImageError(false);
        setDebugInfo(null);
        fetchImage();
    };

    const fetchImage = async () => {
        if (isFetchingRef.current) {
            console.log('Skipping duplicate image fetch request');
            return;
        }

        try {
            setLoading(true);
            setImageError(false);
            setDebugInfo(null);
            isFetchingRef.current = true;

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();

            const authUrl = getAuthenticatedUrl(fileUrl, fileVersion, true);
            console.log('Fetching image from:', authUrl);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            await new Promise(resolve => setTimeout(resolve, 300));

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

            const responseInfo = {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries([...response.headers.entries()]),
                type: response.type,
                url: response.url
            };

            console.log('Image fetch response:', responseInfo);
            setDebugInfo(`Status: ${response.status} ${response.statusText}, Content-Type: ${response.headers.get('content-type')}`);

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Too many requests - rate limit exceeded. Please try again later.');
                }
                throw new Error(`Failed to fetch image: ${response.statusText} (${response.status})`);
            }

            const blob = await response.blob();
            console.log('Received image blob:', {
                size: blob.size,
                type: blob.type
            });

            if (blob.size === 0) {
                throw new Error('Received empty image data');
            }

            const imageUrl = URL.createObjectURL(blob);
            setImageBlob(imageUrl);
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

    // Define fetchImage inside useEffect to avoid dependency issues
    useEffect(() => {
        const fetchImageInEffect = async () => {
            if (isFetchingRef.current) {
                console.log('Skipping duplicate image fetch request');
                return;
            }

            try {
                setLoading(true);
                setImageError(false);
                setDebugInfo(null);
                isFetchingRef.current = true;

                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                }

                abortControllerRef.current = new AbortController();

                const authUrl = getAuthenticatedUrl(fileUrl, fileVersion, true);
                console.log('Fetching image from:', authUrl);

                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Authentication token not found');
                }

                await new Promise(resolve => setTimeout(resolve, 300));

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

                const responseInfo = {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries([...response.headers.entries()]),
                    type: response.type,
                    url: response.url
                };

                console.log('Image fetch response:', responseInfo);
                setDebugInfo(`Status: ${response.status} ${response.statusText}, Content-Type: ${response.headers.get('content-type')}`);

                if (!response.ok) {
                    if (response.status === 429) {
                        throw new Error('Too many requests - rate limit exceeded. Please try again later.');
                    }
                    throw new Error(`Failed to fetch image: ${response.statusText} (${response.status})`);
                }

                const blob = await response.blob();
                console.log('Received image blob:', {
                    size: blob.size,
                    type: blob.type
                });

                if (blob.size === 0) {
                    throw new Error('Received empty image data');
                }

                const imageUrl = URL.createObjectURL(blob);
                setImageBlob(imageUrl);
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

        // Call the function to fetch the image
        fetchImageInEffect();

        // Cleanup function
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            if (imageBlob) {
                URL.revokeObjectURL(imageBlob);
                setImageBlob(null);
            }
        };
    }, [fileUrl, fileVersion, imageBlob]);

    if (loading) {
        return (
            <div className={`text-preview ${theme} centered-text`}>
                Loading image...
            </div>
        );
    }

    if (imageError) {
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

    return (
        <div>
            {imageBlob && (
                <div className="image-container">
                    <img
                        src={imageBlob}
                        alt={fileName}
                        className="preview-image"
                    />
                </div>
            )}
            {debugInfo && (
                <div className={`debug-container ${theme}`}>
                    <strong>Debug Info:</strong> {debugInfo}
                </div>
            )}
        </div>
    );
};

export default ImagePreview;