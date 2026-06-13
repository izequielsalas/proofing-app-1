import { useRef } from "react";
import { FileText, User, Calendar, Clock, Factory, FlaskConical, PackageCheck, Tag } from "lucide-react";

export default function WorkItem({ title, fileUrl, thumbnailUrl, status = 'pending', clientName, createdAt, revisionNumber, parentProofId, uploaderEmail, tags, qcAcknowledged }) {
  const isPDF = fileUrl?.toLowerCase().includes('.pdf');

  // Show QC badge when order is in QC and admin hasn't acknowledged yet
  const showQCBadge = status === 'in_quality_control' && qcAcknowledged === false;

  const getStatusColor = () => {
    switch (status) {
      case 'approved': return 'bg-[#E6F9DD] text-[#2D7A0F]';
      case 'declined': return 'bg-[#FCE4EC] text-[#A8005A]';
      case 'in_production': return 'bg-[#FFF0E0] text-[#B34D00]';
      case 'in_quality_control': return 'bg-[#EDE7F6] text-[#5A3695]';
      case 'completed': return 'bg-[#E0EAF5] text-[#002855]';
      default: return 'bg-[#D6F0FF] text-[#006699]';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'declined': return 'Declined';
      case 'in_production': return 'In Production';
      case 'in_quality_control': return 'In QC';
      case 'completed': return 'Completed';
      default: return 'Pending Review';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'in_production': return <Factory className="w-3 h-3" />;
      case 'in_quality_control': return <FlaskConical className="w-3 h-3" />;
      case 'completed': return <PackageCheck className="w-3 h-3" />;
      default: return null;
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
    <div className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-200 transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
      {/* File Preview */}
      <div className="relative aspect-[11/8.5] bg-gray-100 overflow-hidden">
        {isPDF ? (
          thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-red-50">
              <div className="text-center">
                <FileText className="w-12 h-12 text-red-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-red-700">PDF Document</span>
              </div>
            </div>
          )
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

        {/* Fallback for broken images or thumbnails */}
        <div className="hidden w-full h-full items-center justify-center bg-red-50">
          <div className="text-center">
            <FileText className="w-12 h-12 text-red-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-red-700">PDF Document</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor()}`}>
            {getStatusIcon()}
            {getStatusText()}
          </span>

          {/* QC New Badge */}
          {showQCBadge && (
            <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#5A3695] text-white flex items-center gap-1 shadow-sm animate-pulse">
              <FlaskConical className="w-3 h-3" />
              New in QC
            </span>
          )}
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

          {uploaderEmail && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span className="truncate text-gray-500">By: {uploaderEmail}</span>
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

          {/* Tags */}
          {tags?.length > 0 && (
            <div className="flex items-start gap-2 flex-wrap">
              <Tag className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
              <div className="flex flex-wrap gap-1">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-cesar-navy/10 text-cesar-navy"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action indicator */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {status === 'pending' ? 'Click to review' : 'Click to view details'}
            </span>
            {status === 'pending' && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-cesar-yellow" />
                <span className="text-xs text-[#92690B] font-medium">Needs Review</span>
              </div>
            )}
            {status === 'in_production' && (
              <div className="flex items-center gap-1">
                <Factory className="w-3 h-3 text-cesar-orange" />
                <span className="text-xs text-[#B34D00] font-medium">In Production</span>
              </div>
            )}
            {status === 'in_quality_control' && (
              <div className="flex items-center gap-1">
                <FlaskConical className="w-3 h-3 text-cesar-purple" />
                <span className="text-xs text-[#5A3695] font-medium">
                  {showQCBadge ? 'Needs Review' : 'Quality Control'}
                </span>
              </div>
            )}
            {status === 'completed' && (
              <div className="flex items-center gap-1">
                <PackageCheck className="w-3 h-3 text-[#0099CC]" />
                <span className="text-xs text-[#006699] font-medium">Completed</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}