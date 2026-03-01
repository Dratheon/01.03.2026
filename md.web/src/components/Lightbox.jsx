import { useState, useEffect, useCallback } from 'react';
import { UIIcon } from '../utils/muiIcons';

/**
 * Lightbox - Dosya önizleme bileşeni
 * Fotoğraf ve PDF dosyalarını tam ekran önizleme
 * 
 * @param {Object} props
 * @param {boolean} props.open - Modal açık mı
 * @param {function} props.onClose - Kapatma fonksiyonu
 * @param {string} props.src - Dosya URL'si
 * @param {string} props.type - Dosya tipi: 'image' | 'pdf'
 * @param {string} props.title - Dosya başlığı
 * @param {string} props.downloadUrl - İndirme URL'si (opsiyonel)
 * @param {string} props.downloadName - İndirme dosya adı (opsiyonel)
 */
const Lightbox = ({ 
  open, 
  onClose, 
  src, 
  type = 'image', 
  title = 'Önizleme',
  downloadUrl,
  downloadName 
}) => {
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Reset state when src changes
  useEffect(() => {
    if (open) {
      setZoom(1);
      setLoading(true);
      setError(false);
    }
  }, [src, open]);

  // ESC tuşu ile kapat
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === '+' || e.key === '=') {
        setZoom(z => Math.min(z + 0.25, 3));
      }
      if (e.key === '-') {
        setZoom(z => Math.max(z - 0.25, 0.5));
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const handleDownload = useCallback(() => {
    const url = downloadUrl || src;
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName || title || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [downloadUrl, src, downloadName, title]);

  const handleImageLoad = () => {
    setLoading(false);
  };

  const handleImageError = () => {
    setLoading(false);
    setError(true);
  };

  if (!open) return null;

  const isImage = type === 'image' || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(src);
  const isPdf = type === 'pdf' || /\.pdf$/i.test(src);

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <div className="lightbox-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="lightbox-header">
          <div className="lightbox-title">
            <UIIcon name={isPdf ? 'picture_as_pdf' : 'image'} />
            <span>{title}</span>
          </div>
          <div className="lightbox-actions">
            {isImage && (
              <>
                <button 
                  className="lightbox-btn" 
                  onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                  title="Küçült (-)"
                >
                  <UIIcon name="zoom_out" />
                </button>
                <span className="lightbox-zoom-level">{Math.round(zoom * 100)}%</span>
                <button 
                  className="lightbox-btn" 
                  onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
                  title="Büyüt (+)"
                >
                  <UIIcon name="zoom_in" />
                </button>
                <button 
                  className="lightbox-btn" 
                  onClick={() => setZoom(1)}
                  title="Sıfırla"
                >
                  <UIIcon name="fit_screen" />
                </button>
                <div className="lightbox-divider" />
              </>
            )}
            <button 
              className="lightbox-btn lightbox-btn-download" 
              onClick={handleDownload}
              title="İndir"
            >
              <UIIcon name="download" />
              <span className="lightbox-btn-text">İndir</span>
            </button>
            <button 
              className="lightbox-btn lightbox-btn-close" 
              onClick={onClose}
              title="Kapat (ESC)"
            >
              <UIIcon name="close" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="lightbox-content">
          {loading && isImage && (
            <div className="lightbox-loading">
              <div className="lightbox-spinner" />
              <span>Yükleniyor...</span>
            </div>
          )}
          
          {error && (
            <div className="lightbox-error">
              <UIIcon name="broken_image" />
              <span>Dosya yüklenemedi</span>
            </div>
          )}

          {isImage && !error && (
            <div 
              className="lightbox-image-container"
              style={{ transform: `scale(${zoom})` }}
            >
              <img 
                src={src} 
                alt={title}
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{ display: loading ? 'none' : 'block' }}
                draggable={false}
              />
            </div>
          )}

          {isPdf && (
            <iframe
              src={src}
              title={title}
              className="lightbox-pdf"
              onLoad={() => setLoading(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Hook: Lightbox state yönetimi
 */
export const useLightbox = () => {
  const [lightboxState, setLightboxState] = useState({
    open: false,
    src: '',
    type: 'image',
    title: '',
    downloadUrl: '',
    downloadName: ''
  });

  const openLightbox = useCallback(({ src, type, title, downloadUrl, downloadName }) => {
    setLightboxState({
      open: true,
      src,
      type: type || (src?.toLowerCase()?.endsWith('.pdf') ? 'pdf' : 'image'),
      title: title || 'Önizleme',
      downloadUrl: downloadUrl || src,
      downloadName: downloadName || title || 'download'
    });
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxState(prev => ({ ...prev, open: false }));
  }, []);

  return {
    lightboxState,
    openLightbox,
    closeLightbox,
    LightboxComponent: (
      <Lightbox
        open={lightboxState.open}
        onClose={closeLightbox}
        src={lightboxState.src}
        type={lightboxState.type}
        title={lightboxState.title}
        downloadUrl={lightboxState.downloadUrl}
        downloadName={lightboxState.downloadName}
      />
    )
  };
};

export default Lightbox;
