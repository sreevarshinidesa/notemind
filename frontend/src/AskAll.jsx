import { useState } from 'react';

function AskAll({ token }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setAnswer('');
    setSources([]);

    fetch('http://localhost:5000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ question }),
    })
      .then((res) => res.json())
      .then((data) => {
        setAnswer(data.answer || data.error);
        setSources(data.sources || []);
        setLoading(false);
      })
      .catch(() => {
        setAnswer('Could not reach the server.');
        setLoading(false);
      });
  };

  return (
    <div className="hero">
      <h2>Ask All My Documents</h2>
      <form onSubmit={handleAsk}>
        <input
          type="text"
          placeholder="Ask a question about any of your PDFs..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button type="submit" disabled={loading}>Ask</button>
      </form>

      {loading && <p><em>Thinking...</em></p>}
      {answer && (
        <div className="answer">
          <p><strong>Answer:</strong> {answer}</p>
          {sources.length > 0 && <p><strong>Sources:</strong> {sources.join(', ')}</p>}
        </div>
      )}
    </div>
  );
}

export default AskAll;