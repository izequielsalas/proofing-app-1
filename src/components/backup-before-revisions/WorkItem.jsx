import { motion, useMotionValue, useTransform } from "framer-motion";
import { useRef } from "react";
import { FileText, User, Calendar, Clock } from "lucide-react";

export default function WorkItem({ title, fileUrl, status = 'pending', clientName, createdAt }) {
  const cardRef = useRef(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const scale = useMotionValue(1);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateMax = 8; // Reduced for subtler effect
    
    const deltaX = ((x - centerX) / centerX) * rotateMax;
    const deltaY = ((y - centerY) / centerY) * rotateMax * -1;

    rotateX.set(deltaY);
    rotateY.set(deltaX);
    scale.set(1.02);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    scale.set(1);
  };

  const isPDF = fileUrl?.endsWith(".pdf");
  
  const getStatusColor = () => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      default: return 'bg-amber-100 text-amber-800';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'declined': return 'Declined';
      default: return 'Pending Review';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <motion.div
      ref={cardRef}
      className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl cursor-pointer transform-gpu border border-gray-200 transition-all duration-200"
      style={{
        rotateX,
        rotateY,
        scale,
        transformPerspective: 1000,
        willChange: "transform",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {/* File Preview */}
      <div className="relative aspect-[11/8.5] bg-gray-100 overflow-hidden">
        {isPDF ? (
          <div className="w-full h-full flex items-center justify-center bg-red-50">
            <div className="text-center">
              <FileText className="w-12 h-12 text-red-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-red-700">PDF Document</span>
            </div>
          </div>
        ) : (
          <img 
            src={fileUrl} 
            alt={title} 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'flex';
            }}
          />
        )}
        
        {/* Fallback for broken images */}
        <div className="hidden w-full h-full items-center justify-center bg-gray-100">
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <span className="text-sm text-gray-500">Preview unavailable</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {title}
        </h3>
        
        <div className="space-y-2 text-sm text-gray-600">
          {clientName && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{clientName}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>{formatDate(createdAt)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span>{isPDF ? 'PDF Document' : 'Image File'}</span>
          </div>
        </div>

        {/* Action indicator */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Click to {status === 'pending' ? 'review' : 'view details'}
            </span>
            {status === 'pending' && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" />
                <span className="text-xs text-amber-600 font-medium">Needs Review</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}