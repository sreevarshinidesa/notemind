import { useState, useEffect } from 'react';
import Auth from './Auth';
import Documents from './Documents';
import AskAll from './AskAll';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const fetchNotes = () => {
    fetch('http://localhost:5000/notes', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setNotes(data))
      .catch((err) => console.error('Error fetching notes:', err));
  };

  useEffect(() => {
    if (token) {
      fetchNotes();
    }
  }, [token]);

  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setNotes([]);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    fetch('http://localhost:5000/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, content }),
    })
      .then((res) => res.json())
      .then(() => {
        setTitle('');
        setContent('');
        fetchNotes();
      })
      .catch((err) => console.error('Error creating note:', err));
  };

  const handleDelete = (id) => {
    fetch(`http://localhost:5000/notes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => fetchNotes())
      .catch((err) => console.error('Error deleting note:', err));
  };

  const startEdit = (note) => {
    setEditingId(note._id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const handleUpdate = (id) => {
    fetch(`http://localhost:5000/notes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: editTitle, content: editContent }),
    })
      .then(() => {
        setEditingId(null);
        fetchNotes();
      })
      .catch((err) => console.error('Error updating note:', err));
  };

  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div>
      <header className="topbar">
  <h1>NoteMind</h1>
  <button className="ghost" onClick={handleLogout}>Log Out</button>
</header>

<AskAll token={token} />

<h2>My Notes</h2>

      <form onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <br />
        <textarea
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <br />
        <button type="submit">Add Note</button>
      </form>

      {notes.map((note) => (
        <div key={note._id} className="card">
          {editingId === note._id ? (
            <>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              <br />
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} />
              <br />
              <button onClick={() => handleUpdate(note._id)}>Save</button>
              <button onClick={() => setEditingId(null)}>Cancel</button>
            </>
          ) : (
            <>
              <h3>{note.title}</h3>
              <p>{note.content}</p>
              <button onClick={() => startEdit(note)}>Edit</button>
              <button onClick={() => handleDelete(note._id)}>Delete</button>
            </>
          )}
          
        </div>
      ))}
      
      <Documents token={token} />
    </div>
  );
}

export default App;