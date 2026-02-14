import { Modal } from '../common/Modal';

interface LightboxProps {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
}

export function Lightbox({ imageUrl, open, onClose, onDownload }: LightboxProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="relative max-h-[90vh] max-w-[90vw]">
        <img
          src={imageUrl}
          alt="Generated image full resolution"
          className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"
        />
        <div className="absolute right-3 top-3 flex gap-2">
          <button
            onClick={onDownload}
            className="rounded-xl border border-[--border-medium] bg-surface-3/80 px-3 py-1.5 text-sm font-medium text-[--text-secondary] backdrop-blur-sm hover:bg-surface-3 transition-colors duration-150"
            aria-label="Download image"
          >
            Download
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-[--border-medium] bg-surface-3/80 px-3 py-1.5 text-sm font-medium text-[--text-secondary] backdrop-blur-sm hover:bg-surface-3 transition-colors duration-150"
            aria-label="Close lightbox"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
