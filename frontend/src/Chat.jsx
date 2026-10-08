import { useState } from 'react';

function Chat({ token, document }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const currentQuestion = question;
    setMessages((prev) => [...prev, { role: 'user', text: currentQuestion }]);
    setQuestion('');
    setLoading(true);

    fetch(`http://localhost:5000/documents/${document._id}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ question: currentQuestion }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMessages((prev) => [...prev, { role: 'ai', text: data.answer }]);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error asking question:', err);
        setLoading(false);
      });
  };

  return (
    <div className="chat-box">
      <h4>Chat with: {document.filename}</h4>

      <div className="messages">
        {messages.map((msg, i) => (
          <p key={i}>
            <strong>{msg.role === 'user' ? 'You: ' : 'AI: '}</strong>
            {msg.text}
          </p>
        ))}
        {loading && <p><em>Thinking...</em></p>}
      </div>

      <form onSubmit={handleAsk}>
        <input
          type="text"
          placeholder="Ask a question about this document..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button type="submit" disabled={loading}>Ask</button>
      </form>
    </div>
  );
}

export default Chat;