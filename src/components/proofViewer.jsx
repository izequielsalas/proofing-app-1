export default function ProofViewer({ url, type }) {
  return (
    <div className="mb-4 p-4 bg-charcoal rounded shadow-md">
      {type === 'pdf' ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline">
          View PDF
        </a>
      ) : (
        <img src={url} alt="Proof" className="max-w-full h-auto rounded border border-grey" />
      )}
    </div>
  );
}
