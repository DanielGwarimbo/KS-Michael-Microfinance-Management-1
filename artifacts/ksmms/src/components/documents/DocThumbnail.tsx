import { useState } from 'react';
import { FileText, Image } from 'lucide-react';

interface DocThumbnailProps {
  mimeType: string;
  viewUrl: string;
  fileName: string;
  size?: 'sm' | 'md';
}

export default function DocThumbnail({ mimeType, viewUrl, fileName, size = 'md' }: DocThumbnailProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const isImage = mimeType?.startsWith('image/');
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  if (!isImage || errored) {
    return (
      <div className={`${dim} rounded border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0`} title={fileName}>
        <FileText className={`${iconSize} text-gray-400`} />
      </div>
    );
  }

  return (
    <a
      href={viewUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`relative ${dim} rounded border border-gray-200 bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden hover:opacity-80 transition-opacity`}
      title={`View ${fileName}`}
    >
      {!loaded && (
        <Image className={`${iconSize} text-gray-300 absolute inset-0 m-auto`} />
      )}
      <img
        src={viewUrl}
        alt={fileName}
        loading="lazy"
        className={`${dim} object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
    </a>
  );
}
