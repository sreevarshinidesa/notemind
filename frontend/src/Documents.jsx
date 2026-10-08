import { useState, useEffect } from 'react';
import Chat from './Chat';

function Documents({ token }) {
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [chattingWith, setChattingWith] = useState(null);

  const fetchDocuments = () => {
    fetch('http://localhost:5000/documents', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setDocuments(data))
      .catch((err) => console.error('Error fetching documents:', err));
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('pdf', file);

    fetch('http://localhost:5000/documents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
      .then((res) => res.json())
      .then(() => {
        setFile(null);
        setUploading(false);
        fetchDocuments();
      })
      .catch((err) => {
        console.error('Error uploading:', err);
        setUploading(false);
      });
  };

  return (
    <div>
      <h2>My Documents</h2>
      <form onSubmit={handleUpload}>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button type="submit" disabled={!file || uploading}>
          {uploading ? 'Uploading...' : 'Upload PDF'}
        </button>
      </form>

      {documents.map((doc) => (
        <div key={doc._id} className="card">
          <strong>{doc.filename}</strong>
          <p>{doc.extractedText.slice(0, 150)}...</p>
          <button onClick={() => setChattingWith(chattingWith === doc._id ? null : doc._id)}>
            {chattingWith === doc._id ? 'Close Chat' : 'Chat with this PDF'}
          </button>
          {chattingWith === doc._id && <Chat token={token} document={doc} />}
        </div>
      ))}
    </div>
  );
}

export default Documents;